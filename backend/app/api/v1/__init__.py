"""
API Router — aggregates all v1 endpoint routers.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import airports, airlines, incursions, stats, analytics

router = APIRouter()
router.include_router(airports.router,   prefix="/airports",   tags=["Airports"])
router.include_router(airlines.router,   prefix="/airlines",   tags=["Airlines"])
router.include_router(incursions.router, prefix="/incursions", tags=["Incursions"])
router.include_router(stats.router,      prefix="/stats",      tags=["Statistics"])
router.include_router(analytics.router,  prefix="/analytics",  tags=["Analytics & ML"])
