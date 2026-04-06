"""
Global statistics endpoint — returns summary metrics for the dashboard hero section.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Airport, Airline, Incursion, TaxiTimeStat, IncursionCategory
from app.schemas.schemas import GlobalStatsResponse, AirportListItem, AirlineListItem

router = APIRouter()


@router.get("", response_model=GlobalStatsResponse, summary="Get global dashboard statistics")
def get_global_stats(db: Session = Depends(get_db)):
    """
    Aggregated global metrics for the hero dashboard:
    - Total airports, airlines, incursion events in database
    - Average global taxi-out time
    - Top 5 airports with most incursions
    - Top 5 airlines by incursion count
    """
    total_airports = db.query(func.count(Airport.id)).scalar() or 0
    total_airlines = db.query(func.count(Airline.id)).scalar() or 0
    total_incursions = db.query(func.count(Incursion.id)).scalar() or 0

    avg_taxi = db.query(func.avg(TaxiTimeStat.avg_taxi_out_min)).scalar()

    cat_ab_count = (
        db.query(func.count(Incursion.id))
        .filter(Incursion.category.in_([IncursionCategory.A, IncursionCategory.B]))
        .scalar()
        or 0
    )

    top_airports = (
        db.query(Airport)
        .order_by(Airport.incursion_count.desc())
        .limit(5)
        .all()
    )

    top_airlines_q = (
        db.query(Airline, func.count(Incursion.id).label("incident_count"))
        .join(Incursion, Airline.id == Incursion.airline_id, isouter=True)
        .group_by(Airline.id)
        .order_by(func.count(Incursion.id).desc())
        .limit(5)
        .all()
    )
    top_airlines = [row[0] for row in top_airlines_q]

    return GlobalStatsResponse(
        total_airports=total_airports,
        total_airlines=total_airlines,
        total_incursions=total_incursions,
        avg_global_taxi_out_min=round(avg_taxi, 2) if avg_taxi else None,
        category_a_b_count=cat_ab_count,
        top_danger_airports=[AirportListItem.model_validate(a) for a in top_airports],
        top_airlines_by_incursions=[AirlineListItem.model_validate(a) for a in top_airlines],
    )
