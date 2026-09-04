from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from api.core.config import get_supabase_client, get_supabase_admin_client
from api.core.security import CurrentUser, UserRole, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password with minimum 6 characters")
    role: UserRole
    full_name: str = Field(..., min_length=2)
    department_name: Optional[str] = Field(None, description="Required for GOVERNMENT users")
    dpiit_number: Optional[str] = Field(None, description="Optional DPIIT recognition number for STARTUP users")
    tech_tags: Optional[List[str]] = Field(default=[], description="Tech stack keywords for STARTUP matchmaking")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: dict


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """
    Registers a new user in Supabase Auth and creates their profile in public.users table.
    """
    supabase = get_supabase_client()
    admin_supabase = get_supabase_admin_client()

    # Role-specific validation
    if payload.role == UserRole.GOVERNMENT and not payload.department_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name is required for GOVERNMENT role registration",
        )

    # 1. Register with Supabase Auth
    try:
        signup_res = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": payload.full_name,
                    "role": payload.role.value,
                }
            }
        })
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supabase Auth signup failed: {str(err)}",
        )

    if not signup_res or not signup_res.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user in Supabase Auth",
        )

    user_id = signup_res.user.id

    # 2. Insert into public.users table
    user_record = {
        "id": user_id,
        "role": payload.role.value,
        "full_name": payload.full_name,
        "department_name": payload.department_name,
        "dpiit_number": payload.dpiit_number,
        "tech_tags": payload.tech_tags or [],
        # Auto-verify government users or startups with DPIIT number
        "is_verified": bool(payload.role == UserRole.GOVERNMENT or (payload.dpiit_number and len(payload.dpiit_number) > 4)),
    }

    try:
        insert_res = admin_supabase.table("users").insert(user_record).execute()
        if not insert_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record user profile in database",
            )
        db_user = insert_res.data[0]
    except Exception as db_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create public user record: {str(db_err)}",
        )

    # 3. Formulate token response
    session = signup_res.session
    access_token = session.access_token if session else ""
    refresh_token = session.refresh_token if session else None

    # If Supabase email confirmation is enabled and no immediate session returned,
    # attempt sign-in or return placeholder instruction
    if not access_token:
        try:
            login_res = supabase.auth.sign_in_with_password({
                "email": payload.email,
                "password": payload.password,
            })
            if login_res.session:
                access_token = login_res.session.access_token
                refresh_token = login_res.session.refresh_token
        except Exception:
            pass

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user={**db_user, "email": payload.email},
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    """
    Authenticates a user with Supabase Auth and returns JWT token + user profile.
    """
    supabase = get_supabase_client()
    admin_supabase = get_supabase_admin_client()

    try:
        auth_res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password: {str(err)}",
        )

    if not auth_res or not auth_res.user or not auth_res.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: no active session returned",
        )

    # Fetch extended profile
    user_query = (
        admin_supabase.table("users")
        .select("*")
        .eq("id", auth_res.user.id)
        .limit(1)
        .execute()
    )

    profile_data = user_query.data[0] if user_query.data else {}

    return AuthResponse(
        access_token=auth_res.session.access_token,
        token_type="bearer",
        refresh_token=auth_res.session.refresh_token,
        user={
            "id": auth_res.user.id,
            "email": auth_res.user.email,
            **profile_data,
        },
    )


@router.get("/me", response_model=CurrentUser)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Retrieves the currently authenticated user's profile.
    """
    return current_user
