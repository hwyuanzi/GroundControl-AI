"""
GroundControl AI — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.core.database import Base, engine

# Create all tables on startup (for development; use Alembic for production)
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GroundControl AI API",
    description=(
        "Global airport runway safety analytics and "
        "intelligent taxi optimization platform."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def health_check():
    """API health check endpoint."""
    return {"status": "ok", "message": "GroundControl AI is operational."}
