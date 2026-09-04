from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.core.config import get_settings
from api.routes import auth, challenges, pilots, validation

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
