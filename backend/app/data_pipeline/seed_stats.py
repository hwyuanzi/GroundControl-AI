import logging
import random
from sqlalchemy.orm import Session
from sqlalchemy import cast, Float
from app.core.database import engine
from app.models.models import Airport

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

def seed_airport_stats():
    """Generates realistic taxi times based on airport size."""
    with Session(engine) as db:
        airports = db.query(Airport).all()
        if not airports:
            logger.info("No airports found.")
            return

        updated = 0
        for airport in airports:
            if airport.type == "large_airport":
                airport.avg_taxi_out_min = round(random.uniform(15.0, 45.0), 1)
                airport.avg_taxi_in_min = round(random.uniform(8.0, 20.0), 1)
            elif airport.type == "medium_airport":
                airport.avg_taxi_out_min = round(random.uniform(7.0, 16.0), 1)
                airport.avg_taxi_in_min = round(random.uniform(4.0, 9.0), 1)
            else:
                # Small airports / heliports
                airport.avg_taxi_out_min = round(random.uniform(3.0, 8.0), 1)
                airport.avg_taxi_in_min = round(random.uniform(2.0, 5.0), 1)
            
            updated += 1

            if updated % 5000 == 0:
                logger.info(f"Updated {updated} / {len(airports)} airports...")
                db.commit()

        db.commit()
        logger.info(f"✅ Generated mock stats for {updated} airports.")

if __name__ == "__main__":
    seed_airport_stats()
