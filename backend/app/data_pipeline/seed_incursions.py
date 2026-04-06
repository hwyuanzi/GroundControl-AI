import logging
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import engine
from app.models.models import Incursion, IncursionCategory, Airport, Airline

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

ROOT_CAUSE_LABELS = [
    "Pilot Deviation",
    "ATC Communication Error",
    "Ground Vehicle Incursion",
    "Pavement Marking or Signage Issue",
    "Low Visibility or Weather",
    "Unknown",
]

NARRATIVE_TEMPLATES = [
    "An {airline} aircraft departed the runway without clearance while another aircraft was cleared to cross. A loss of separation occurred. {cause}.",
    "A commercial airliner misidentified the taxiway as the active runway and descended to within 100 feet of taxiing aircraft. ATC intervened. {cause}.",
    "Two aircraft from {airline} and another carrier were cleared onto intersecting taxiways simultaneously. Minimum separation maintained, classified as an incursion. {cause}.",
    "A ground vehicle entered the active runway area without ATC clearance while an {airline} flight was on final approach. Executed go-around. {cause}.",
    "Aircraft taxied past the hold-short line onto an active runway, violating instructions. ATC issued immediate stop commands. {cause}.",
    "An arriving {airline} aircraft landed on an occupied taxiway in degraded visibility conditions. Another aircraft was awaiting departure. {cause}.",
]

def generate_mock_incursions(num_events=2500):
    from sqlalchemy import text
    with Session(engine) as db:
        # Get random selection of airports (prioritize large ones)
        large_airports = db.query(Airport).filter(Airport.type == 'large_airport').limit(50).all()
        if not large_airports:
            logger.warning("No large airports found. Ensure seed_airports is run first.")
            return

        airlines = db.query(Airline).filter(Airline.active == 'Y').limit(50).all()
        if not airlines:
            logger.warning("No airlines found.")
            return
            
        existing = db.query(Incursion).count()
        if existing >= num_events:
            logger.info("Incursions already seeded.")
            return

        # Generate realistic distribution of severities (lots of C/D, fewer A/B)
        inserted = 0
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * 5)  # past 5 years

        for _ in range(num_events - existing):
            airport = random.choice(large_airports)
            airline = random.choice(airlines)
            
            # Weighted random for severity
            cat_choice = random.choices(
                [IncursionCategory.A, IncursionCategory.B, IncursionCategory.C, IncursionCategory.D],
                weights=[2, 5, 20, 73],
                k=1
            )[0]
            
            # Randomized narrative
            cause = random.choices(ROOT_CAUSE_LABELS, weights=[40, 20, 15, 10, 10, 5], k=1)[0]
            narrative = random.choice(NARRATIVE_TEMPLATES).format(
                airline=airline.name,
                cause=f"Attributed to {cause}"
            )

            random_days = random.randint(0, (end_date - start_date).days)
            event_date = start_date + timedelta(days=random_days)
            
            # Slight random offset for lat/long from airport center to simulate runway location
            lat = airport.latitude + random.uniform(-0.01, 0.01)
            lng = airport.longitude + random.uniform(-0.01, 0.01)

            inc = Incursion(
                airport_id=airport.id,
                airline_id=airline.id,
                date=event_date,
                category=cat_choice,
                narrative=narrative,
                root_cause_label=cause,
                root_cause_confidence=round(random.uniform(0.65, 0.99), 2),
                latitude=lat,
                longitude=lng,
                aircraft_count=random.choice([1, 2, 2, 2, 3]),
                fatalities=0,
                injuries=0,
                source_url=f"https://asias.faa.gov/search?q={airport.iata_code or airport.id}",
            )
            db.add(inc)
            inserted += 1

        db.commit()
        
        # Update cache counts ONLY for airports that have incursions
        db.execute(
            func.text('''
            UPDATE airports
            SET incursion_count = subquery.cnt
            FROM (
                SELECT airport_id, count(*) as cnt
                FROM incursions
                GROUP BY airport_id
            ) AS subquery
            WHERE airports.id = subquery.airport_id;
            ''')
        )
        db.commit()
        logger.info(f"✅ Seeded {inserted} programmatic runway incursions and updated airport records.")

if __name__ == "__main__":
    generate_mock_incursions(2500)
