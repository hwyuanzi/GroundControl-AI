"""
Airport API endpoints — supports full filtering, sorting, and pagination.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.services import airport_service
from app.schemas.schemas import AirportListItem, AirportDetail, PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse, summary="List all airports globally")
def list_airports(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Search by name, IATA, ICAO, or city"),
    country: Optional[str] = Query(None, description="Filter by country name"),
    continent: Optional[str] = Query(None, description="Filter by continent (NA, EU, AS, AF, OC, SA)"),
    type: Optional[str] = Query(None, description="Filter by type (large_airport, medium_airport, small_airport, heliport)"),
    sort_by: str = Query("name", description="Sort field: name | country | avg_taxi_out_min | incursion_count"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order: asc or desc"),
    has_sandbox: Optional[bool] = Query(None, description="Only show airports with AI sandbox"),
):
    """
    Returns a paginated list of airports with optional filters and sorting.
    Supports global search across airport name, IATA, ICAO code, and city.
    """
    total, airports = airport_service.get_airports(
        db=db, page=page, page_size=page_size,
        search=search, country=country, continent=continent,
        type=type, sort_by=sort_by, sort_order=sort_order,
        has_sandbox=has_sandbox,
    )
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        results=[AirportListItem.model_validate(a) for a in airports],
    )


@router.get("/{airport_id}", response_model=AirportDetail, summary="Get a single airport")
def get_airport(airport_id: str, db: Session = Depends(get_db)):
    """
    Retrieve detailed information about a single airport by ICAO code (e.g., KJFK).
    """
    airport = airport_service.get_airport_by_id(db, airport_id)
    if not airport:
        raise HTTPException(status_code=404, detail=f"Airport '{airport_id}' not found.")
    return AirportDetail.model_validate(airport)
