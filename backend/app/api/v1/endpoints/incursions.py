"""
Incursion API endpoints — filtering by airport, airline, severity, date range.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.services import incursion_service
from app.models.models import IncursionCategory
from app.schemas.schemas import IncursionListItem, PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse, summary="List runway incursion events")
def list_incursions(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    airport_id: Optional[str] = Query(None, description="Filter by airport ICAO code"),
    airline_id: Optional[str] = Query(None, description="Filter by airline ICAO code"),
    category: Optional[IncursionCategory] = Query(None, description="FAA severity (A/B/C/D)"),
    root_cause: Optional[str] = Query(None, description="Filter by NLP root cause label"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort_by: str = Query("date", description="Sort field: date | category | fatalities"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    """Returns a paginated list of runway incursion events with rich filtering."""
    total, incursions = incursion_service.get_incursions(
        db=db, page=page, page_size=page_size,
        airport_id=airport_id, airline_id=airline_id,
        category=category, root_cause=root_cause,
        date_from=date_from, date_to=date_to,
        sort_by=sort_by, sort_order=sort_order,
    )
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        results=[IncursionListItem.model_validate(i) for i in incursions],
    )


@router.get("/hotspots/geojson", summary="Get incursion hotspots as GeoJSON")
def get_hotspots(db: Session = Depends(get_db)):
    """
    Returns all geolocated incursion events as a GeoJSON FeatureCollection.
    Powers the heatmap/scatter layer on the Deck.gl frontend map.
    """
    return incursion_service.get_hotspots_geojson(db)
