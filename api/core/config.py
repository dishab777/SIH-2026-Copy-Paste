import os
from functools import lru_cache
from typing import Optional, Any

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings
    SettingsConfigDict = None

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any


class Settings(BaseSettings):
    PROJECT_NAME: str = "Nexus Public Procurement Platform"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "production"

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://wxxfhjlagolpbmebzfui.supabase.co")
    SUPABASE_KEY: str = os.getenv(
        "SUPABASE_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGZoamxhZ29scGJtZWJ6ZnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzUxNTUsImV4cCI6MjEwMzk1MTE1NX0.VrulINQUystWeEMS5K7-XyuRzAIwUxsX7J-BT6XUUhM"
    )
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGZoamxhZ29scGJtZWJ6ZnVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3NTE1NSwiZXhwIjoyMTAzOTUxMTU1fQ.fsrvGeVL9V_H4auLcrBEKF_LcXgEcg5C4se_C5XV3F0"
    )
    SUPABASE_JWT_SECRET: Optional[str] = os.getenv("SUPABASE_JWT_SECRET", None)
    STORAGE_BUCKET_NAME: str = os.getenv("STORAGE_BUCKET_NAME", "milestone-evidence")

    # AI Configuration (supports both OpenAI and Gemini)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    if SettingsConfigDict is not None:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def get_supabase_client() -> Client:
    """
    Returns standard Supabase client for authenticated user context or public operations.
    """
    if create_client is None:
        raise RuntimeError("supabase Python library is not installed in the runtime environment.")
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY must be configured in environment variables or .env file."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_supabase_admin_client() -> Client:
    """
    Returns Supabase client with service role key if provided (bypasses RLS for admin operations),
    otherwise falls back to the standard key.
    """
    if create_client is None:
        raise RuntimeError("supabase Python library is not installed in the runtime environment.")
    settings = get_settings()
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    if not settings.SUPABASE_URL or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY must be configured."
        )
    return create_client(settings.SUPABASE_URL, key)
