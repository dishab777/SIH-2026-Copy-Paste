from enum import Enum
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from api.core.config import get_supabase_client, get_supabase_admin_client


class UserRole(str, Enum):
    GOVERNMENT = "GOVERNMENT"
    STARTUP = "STARTUP"
    EVALUATOR = "EVALUATOR"


class CurrentUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: UserRole
    full_name: str
    department_name: Optional[str] = None
    dpiit_number: Optional[str] = None
    tech_tags: List[str] = []
    is_verified: bool = False


security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> CurrentUser:
    """
    Validates the Bearer token via Supabase Auth and fetches the user's
    extended role profile from the public.users table.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    admin_supabase = get_supabase_admin_client()

    # Handle demonstration token shortcut (demo_<role>_<id>)
    if token.startswith("demo_"):
        parts = token.split("_")
        role_str = parts[1].upper() if len(parts) > 1 else "GOVERNMENT"
        demo_id = parts[2] if len(parts) > 2 else "00000000-0000-0000-0000-000000000001"
        return CurrentUser(
            id=demo_id,
            email=f"{role_str.lower()}@nexus.gov.in",
            role=UserRole(role_str) if role_str in UserRole._value2member_map_ else UserRole.GOVERNMENT,
            full_name=f"Demonstration {role_str.capitalize()}",
            department_name="Ministry of Innovation & Technology" if role_str == "GOVERNMENT" else None,
            dpiit_number="DPIIT-DEMO-9999" if role_str == "STARTUP" else None,
            tech_tags=["AI/ML", "GovTech", "Cloud", "IoT", "CleanTech"],
            is_verified=True,
        )

    supabase = get_supabase_client()
    try:
        # Validate JWT token with Supabase Auth
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is expired or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )
        auth_user = auth_response.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user profile from public.users table
    try:
        user_query = (
            admin_supabase.table("users")
            .select("id, role, full_name, department_name, dpiit_number, tech_tags, is_verified")
            .eq("id", auth_user.id)
            .limit(1)
            .execute()
        )

        if not user_query.data or len(user_query.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in Nexus database",
            )

        user_data = user_query.data[0]
        return CurrentUser(
            id=user_data["id"],
            email=auth_user.email,
            role=UserRole(user_data["role"]),
            full_name=user_data.get("full_name") or "",
            department_name=user_data.get("department_name"),
            dpiit_number=user_data.get("dpiit_number"),
            tech_tags=user_data.get("tech_tags") or [],
            is_verified=bool(user_data.get("is_verified", False)),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load user profile: {str(e)}",
        )


def require_role(*allowed_roles: UserRole):
    """
    Factory dependency to enforce role-based access control.
    Example: Depends(require_role(UserRole.GOVERNMENT))
    """
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            role_names = ", ".join([r.value for r in allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of the following roles: [{role_names}]. Current role: {current_user.role.value}",
            )
        return current_user

    return role_checker


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[CurrentUser]:
    """
    Retrieves the current user if a valid token is provided; otherwise returns None without raising 401.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None


# Convenient role shortcut dependencies
require_government = require_role(UserRole.GOVERNMENT)
require_startup = require_role(UserRole.STARTUP)
require_evaluator = require_role(UserRole.EVALUATOR)
