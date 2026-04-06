"""
Incursion service — query logic for runway safety incidents, with filtering.
"""
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from typing import Optional, Tuple, List
from datetime import datetime
from app.models.models import Incursion, IncursionCategory


SORT_FIELD_MAP = {
    "date": Incursion.date,
    "category": Incursion.category,
    "fatalities": Incursion.fatalities,
}


def get_incursions(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    airport_id: Optional[str] = None,
    airline_id: Optional[str] = None,
    category: Optional[IncursionCategory] = None,
    root_cause: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
) -> Tuple[int, List[Incursion]]:
    """
    Retrieve a paginated, filtered list of runway incursion events.

    Args:
        db: Active SQLAlchemy database session.
        page: Current page number (1-indexed).
        page_size: Number of results per page (max 100).
        airport_id: Filter by airport ICAO code.
        airline_id: Filter by airline ICAO code.
        category: Filter by FAA severity category (A, B, C, D).
        root_cause: Filter by NLP-extracted root cause label.
        date_from: Filter for events on or after this date.
        date_to: Filter for events on or before this date.
        sort_by: Column name to sort by.
        sort_order: "asc" or "desc".

    Returns:
        A tuple of (total_count, list_of_incursion_objects).
    """
    query = db.query(Incursion)

    if airport_id:
        query = query.filter(Incursion.airport_id.ilike(f"%{airport_id}%"))
    if airline_id:
        query = query.filter(Incursion.airline_id == airline_id.upper())
    if category:
        query = query.filter(Incursion.category == category)
    if root_cause:
        query = query.filter(Incursion.root_cause_label.ilike(f"%{root_cause}%"))
    if date_from:
        query = query.filter(Incursion.date >= date_from)
    if date_to:
        query = query.filter(Incursion.date <= date_to)

    sort_col = SORT_FIELD_MAP.get(sort_by, Incursion.date)
    order_fn = asc if sort_order == "asc" else desc
    query = query.order_by(order_fn(sort_col))

    total = query.count()
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(min(page_size, 100)).all()

    return total, results


def get_hotspots_geojson(db: Session) -> dict:
    """
    Return all incursion events that have coordinates as a GeoJSON FeatureCollection.
    Used to power the Deck.gl heatmap layer on the frontend map.
    """
    incidents = (
        db.query(Incursion)
        .filter(Incursion.latitude.isnot(None), Incursion.longitude.isnot(None))
        .all()
    )

    features = []
    for inc in incidents:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [inc.longitude, inc.latitude],
            },
            "properties": {
                "id": inc.id,
                "airport_id": inc.airport_id,
                "category": inc.category.value if inc.category else None,
                "date": inc.date.isoformat(),
                "root_cause": inc.root_cause_label,
                "fatalities": inc.fatalities,
            },
        })

    return {"type": "FeatureCollection", "features": features}
