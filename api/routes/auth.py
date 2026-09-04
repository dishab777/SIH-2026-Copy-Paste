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
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    userId: Optional[str] = None
    role: Optional[str] = None


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
    Authenticates a user either with email/password via Supabase Auth
    OR via demonstration role/userId selection.
    """
    # 1. Demonstration / Quick Role sign-in (used by frontend role-picker)
    if not payload.password and (payload.role or payload.userId):
        raw_role = (payload.role or "department_officer").lower()
        role_mapping = {
            "startup": "STARTUP",
            "department_officer": "GOVERNMENT",
            "department_admin": "GOVERNMENT",
            "procurement_officer": "GOVERNMENT",
            "evaluator": "EVALUATOR",
            "validator": "EVALUATOR",
            "pmu": "GOVERNMENT",
            "public": "GOVERNMENT",
        }
        backend_role = role_mapping.get(raw_role, "GOVERNMENT")
        user_id = payload.userId or f"usr-{raw_role}"
        demo_token = f"demo_{backend_role.lower()}_{user_id}"

        role_titles = {
            "startup": "Kavita Rao (CTO, AeroSense)",
            "department_officer": "Rajesh Kumar (Director, Municipal Health)",
            "department_admin": "Sunita Verma (Joint Secretary)",
            "procurement_officer": "Amit Sharma (Chief Procurement Officer)",
            "evaluator": "Dr. Aris Thorne (IIT Delhi, Evaluator)",
            "validator": "Meera Sen (Independent Validator)",
            "pmu": "Programme Officer (PMU Unit)",
        }

        user_info = {
            "id": user_id,
            "name": role_titles.get(raw_role, f"Demo {raw_role.capitalize()}"),
            "full_name": role_titles.get(raw_role, f"Demo {raw_role.capitalize()}"),
            "role": raw_role,
            "email": f"{raw_role}@nexus.gov.in",
            "department_name": "Ministry of Urban Innovation" if backend_role == "GOVERNMENT" else None,
            "dpiit_number": "DPIIT-IN-2024-8849" if backend_role == "STARTUP" else None,
            "tech_tags": ["AI/ML", "IoT", "Cloud", "CleanTech"],
            "is_verified": True,
        }

        return AuthResponse(
            access_token=demo_token,
            token_type="bearer",
            refresh_token=None,
            user=user_info,
        )

    # 2. Standard email + password authentication with Supabase
    if not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required for standard login",
        )

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
            "name": profile_data.get("full_name") or auth_res.user.email,
            "email": auth_res.user.email,
            **profile_data,
        },
    )


@router.get("/me")
async def get_me(current_user: Optional[CurrentUser] = Depends(get_optional_current_user)):
    """
    Retrieves current user session. If unauthenticated, returns guest/public status
    with 200 OK so the frontend session bootstrap loads seamlessly.
    """
    if not current_user:
        return {
            "user": None,
            "role": "public",
            "department": None,
            "startup": None,
        }

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.full_name,
            "initials": "".join([part[0].upper() for part in current_user.full_name.split()[:2]]) or "US",
            "role": current_user.role.value.lower(),
            "email": current_user.email,
            "department_name": current_user.department_name,
            "dpiit_number": current_user.dpiit_number,
            "tech_tags": current_user.tech_tags,
            "is_verified": current_user.is_verified,
        },
        "role": current_user.role.value.lower(),
        "department": {
            "id": "dep-1",
            "name": current_user.department_name or "Department of Innovation",
            "shortName": "DOI",
        } if current_user.department_name or current_user.role == UserRole.GOVERNMENT else None,
        "startup": {
            "id": current_user.id,
            "legalName": current_user.full_name,
            "tradeName": current_user.full_name,
        } if current_user.role == UserRole.STARTUP else None,
    }


@router.get("/accounts")
async def get_accounts():
    """
    Returns available demonstration accounts across system roles for quick sign-in.
    """
    return [
        {
            "id": "usr-startup-1",
            "name": "Kavita Rao",
            "initials": "KR",
            "email": "kavita@aerosense.in",
            "role": "startup",
            "title": "CTO & Co-founder",
            "org": "AeroSense Technologies Pvt Ltd",
        },
        {
            "id": "usr-dept-officer",
            "name": "Rajesh Kumar",
            "initials": "RK",
            "email": "rajesh.kumar@gov.in",
            "role": "department_officer",
            "title": "Director (Operations)",
            "org": "Department of Water Resources & Sanitation",
        },
        {
            "id": "usr-dept-admin",
            "name": "Sunita Verma",
            "initials": "SV",
            "email": "sunita.verma@gov.in",
            "role": "department_admin",
            "title": "Joint Secretary",
            "org": "Ministry of Housing and Urban Affairs",
        },
        {
            "id": "usr-procurement",
            "name": "Amit Sharma",
            "initials": "AS",
            "email": "amit.sharma@gov.in",
            "role": "procurement_officer",
            "title": "Chief Procurement Officer",
            "org": "Central Public Procurement Portal",
        },
        {
            "id": "usr-evaluator-1",
            "name": "Dr. Aris Thorne",
            "initials": "AT",
            "email": "aris.thorne@iitd.ac.in",
            "role": "evaluator",
            "title": "Professor & Technical Chair",
            "org": "Indian Institute of Technology Delhi",
        },
        {
            "id": "usr-validator-1",
            "name": "Meera Sen",
            "initials": "MS",
            "email": "meera.sen@audit.org",
            "role": "validator",
            "title": "Lead Quality Auditor",
            "org": "National Quality & Standards Council",
        },
        {
            "id": "usr-pmu-1",
            "name": "Vikas Patel",
            "initials": "VP",
            "email": "vikas.patel@pmu.gov.in",
            "role": "pmu",
            "title": "Senior Programme Manager",
            "org": "National Innovation Mission PMU",
        },
    ]
