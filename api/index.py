import sys
from pathlib import Path

# Add project root and api directory to sys.path for Vercel serverless runtime
_ROOT_DIR = Path(__file__).resolve().parent.parent
_API_DIR = Path(__file__).resolve().parent
for _path in (str(_ROOT_DIR), str(_API_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from api.core.config import get_settings
    from api.routes import auth, challenges, pilots, validation
except ImportError:
    from core.config import get_settings
    from routes import auth, challenges, pilots, validation

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Public procurement innovation platform connecting government departments with verified startups for pilot projects.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS for frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(challenges.router, prefix=settings.API_V1_PREFIX)
app.include_router(pilots.router, prefix=settings.API_V1_PREFIX)
app.include_router(validation.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "api_version": "v1",
        "endpoints": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "challenges": f"{settings.API_V1_PREFIX}/challenges",
            "pilots": f"{settings.API_V1_PREFIX}/pilots",
            "validation": f"{settings.API_V1_PREFIX}/validation",
        }
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "nexus-api"}
