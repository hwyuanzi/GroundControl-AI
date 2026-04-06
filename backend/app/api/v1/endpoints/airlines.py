"""
Airline API endpoints — supports filtering and sorting.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.services import airline_service
from app.schemas.schemas import AirlineListItem, AirlineDetail, PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse, summary="List all airlines")
def list_airlines(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name, IATA, or ICAO code"),
    country: Optional[str] = Query(None),
    active_only: bool = Query(True, description="Exclude defunct airlines"),
    sort_by: str = Query("name", description="Sort field: name | country | iata_code"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
):
    """Returns a paginated, filterable list of airlines."""
    total, airlines = airline_service.get_airlines(
        db=db, page=page, page_size=page_size,
        search=search, country=country, active_only=active_only,
        sort_by=sort_by, sort_order=sort_order,
    )
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        results=[AirlineListItem.model_validate(a) for a in airlines],
    )


@router.get("/{airline_id}", response_model=AirlineDetail, summary="Get a single airline")
def get_airline(airline_id: str, db: Session = Depends(get_db)):
    """Retrieve a single airline by its ICAO code (e.g., DAL for Delta)."""
    airline = airline_service.get_airline_by_id(db, airline_id)
    if not airline:
        raise HTTPException(status_code=404, detail=f"Airline '{airline_id}' not found.")
    return AirlineDetail.model_validate(airline)
