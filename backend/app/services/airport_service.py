"""
Airport service — query logic with filtering, sorting, and pagination.
All database interactions are centralized here (separation of concerns).
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, asc, desc
from typing import Optional, Tuple, List
from app.models.models import Airport, Incursion, TaxiTimeStat
from app.schemas.schemas import AirportListItem


SORT_FIELD_MAP = {
    "name": Airport.name,
    "country": Airport.country,
    "avg_taxi_out_min": Airport.avg_taxi_out_min,
    "avg_taxi_in_min": Airport.avg_taxi_in_min,
    "incursion_count": Airport.incursion_count,
}


def get_airports(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    country: Optional[str] = None,
    continent: Optional[str] = None,
    type: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    has_sandbox: Optional[bool] = None,
) -> Tuple[int, List[Airport]]:
    """
    Retrieve a paginated, filtered, and sorted list of airports.

    Args:
        db: Active SQLAlchemy database session.
        page: Current page number (1-indexed).
        page_size: Number of results per page (max 100).
        search: Free-text search against airport name, IATA, ICAO, or city.
        country: Filter by country name (exact match).
        continent: Filter by continent code (e.g., "NA", "EU").
        type: Filter by airport type (e.g., "large_airport").
        sort_by: Column name to sort by.
        sort_order: "asc" or "desc".
        has_sandbox: If True, only return airports with sandbox enabled.

    Returns:
        A tuple of (total_count, list_of_airport_objects).
    """
    query = db.query(Airport)

    # Free-text search
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            Airport.name.ilike(term)
            | Airport.iata_code.ilike(term)
            | Airport.id.ilike(term)
            | Airport.city.ilike(term)
        )

    # Categorical filters
    if country:
        query = query.filter(Airport.country.ilike(f"%{country}%"))
    if continent:
        query = query.filter(Airport.continent == continent)
    if type:
        query = query.filter(Airport.type == type)
    if has_sandbox is not None:
        query = query.filter(Airport.has_sandbox == has_sandbox)

    # Sorting
    sort_col = SORT_FIELD_MAP.get(sort_by, Airport.name)
    order_fn = asc if sort_order == "asc" else desc
    query = query.order_by(order_fn(sort_col))

    total = query.count()
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(min(page_size, 100)).all()

    return total, results


def get_airport_by_id(db: Session, airport_id: str) -> Optional[Airport]:
    """Retrieve a single airport by its ICAO code."""
    return db.query(Airport).filter(Airport.id == airport_id.upper()).first()
