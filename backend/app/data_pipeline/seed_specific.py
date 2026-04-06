import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import engine
from app.models.models import Incursion, IncursionCategory, Airport, Airline

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

def seed_lga_incident():
    with Session(engine) as db:
        # Find LGA and Air Canada
        lga = db.query(Airport).filter(Airport.iata_code == 'LGA').first()
        if not lga:
            logger.error("LGA Airport not found. Cannot insert incident.")
            return

        air_canada = db.query(Airline).filter(Airline.iata_code == 'AC').first()
        if not air_canada:
            logger.error("Air Canada not found.")
            return

        # Prepare payload
        event_date = datetime(2026, 3, 22, 10, 30)
        narrative = (
            "An Air Canada commercial flight collided with an Aircraft Rescue and Firefighting (ARFF) "
            "ground vehicle on the active runway at LaGuardia Airport (LGA) during low visibility conditions. "
            "The tragic ground vehicle incursion resulted in an instant fatality for the crew. "
            "Incident underscores critical risks of ground vehicle and aircraft ground surface intersection."
        )

        inc = Incursion(
            airport_id=lga.id,
            airline_id=air_canada.id,
            date=event_date,
            category=IncursionCategory.A,  # Highest severity
            narrative=narrative,
            root_cause_label="Ground Vehicle Incursion",
            root_cause_confidence=0.99,
            latitude=lga.latitude,
            longitude=lga.longitude,
            aircraft_count=1,
            fatalities=2,
            injuries=0,
            source_url=f"https://asias.faa.gov/lga_arff_incident_report",
        )
        
        db.add(inc)
        db.commit()

        # Recalculate LGA incursion count
        db.execute(text(f"""
            UPDATE airports
            SET incursion_count = (SELECT count(*) FROM incursions WHERE incursions.airport_id = '{lga.id}')
            WHERE id = '{lga.id}'
        """))
        db.commit()
        
        logger.info(f"✅ Successfully seeded LGA Air Canada Incident.")

if __name__ == "__main__":
    seed_lga_incident()
