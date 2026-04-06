"""
Airline service — query logic with filtering, sorting, and pagination.
"""
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from typing import Optional, Tuple, List
from app.models.models import Airline


SORT_FIELD_MAP = {
    "name": Airline.name,
    "country": Airline.country,
    "iata_code": Airline.iata_code,
}


def get_airlines(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    country: Optional[str] = None,
    active_only: bool = True,
    sort_by: str = "name",
    sort_order: str = "asc",
) -> Tuple[int, List[Airline]]:
    """
    Retrieve a paginated, filtered, and sorted list of airlines.

    Args:
        db: Active SQLAlchemy database session.
        page: Current page number (1-indexed).
        page_size: Number of results per page (max 100).
        search: Free-text search against airline name, IATA, ICAO.
        country: Filter by country name.
        active_only: If True, exclude defunct/retired airlines.
        sort_by: Column name to sort by.
        sort_order: "asc" or "desc".

    Returns:
        A tuple of (total_count, list_of_airline_objects).
    """
    query = db.query(Airline)

    if active_only:
        query = query.filter(Airline.active == True)  # noqa: E712

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            Airline.name.ilike(term)
            | Airline.iata_code.ilike(term)
            | Airline.id.ilike(term)
        )

    if country:
        query = query.filter(Airline.country.ilike(f"%{country}%"))

    sort_col = SORT_FIELD_MAP.get(sort_by, Airline.name)
    order_fn = asc if sort_order == "asc" else desc
    query = query.order_by(order_fn(sort_col))

    total = query.count()
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(min(page_size, 100)).all()

    return total, results


def get_airline_by_id(db: Session, airline_id: str) -> Optional[Airline]:
    """Retrieve a single airline by its ICAO code."""
    return db.query(Airline).filter(Airline.id == airline_id.upper()).first()
