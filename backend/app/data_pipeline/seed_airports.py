"""
Data ingestion script for OurAirports global airport database.
Downloads and seeds Airport and Airline tables from high-quality open datasets.

Data Sources:
  - OurAirports: https://ourairports.com/data/ (CC0 Public Domain)
  - OpenFlights Airlines: https://openflights.org/data.html

Run: python -m app.data_pipeline.seed_airports
"""
import sys
import os
import io
import csv
import logging
import requests
import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import engine, Base
from app.models.models import Airport, Airline

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
AIRLINES_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat"

CONTINENT_MAP = {
    "AF": "Africa", "AN": "Antarctica", "AS": "Asia",
    "EU": "Europe", "NA": "North America", "OC": "Oceania", "SA": "South America",
}

# Airport types to include (exclude private/seaplane/balloon)
INCLUDED_TYPES = {"large_airport", "medium_airport", "small_airport"}


def fetch_airports(db: Session) -> int:
    """Download, clean, and seed the airports table from OurAirports CSV."""
    logger.info("Fetching airports from OurAirports...")
    resp = requests.get(AIRPORTS_URL, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    inserted = 0

    for row in reader:
        # Skip non-commercial airports
        if row.get("type") not in INCLUDED_TYPES:
            continue
        # Skip rows with no ICAO code
        ident = row.get("ident", "").strip()
        if not ident or len(ident) < 3:
            continue

        try:
            lat = float(row["latitude_deg"])
            lon = float(row["longitude_deg"])
        except (ValueError, KeyError):
            continue

        existing = db.get(Airport, ident)
        if existing:
            continue

        continent_code = row.get("continent", "")
        airport = Airport(
            id=ident,
            iata_code=row.get("iata_code", "").strip() or None,
            name=row.get("name", "").strip(),
            city=row.get("municipality", "").strip() or None,
            country=row.get("iso_country", "").strip() or None,
            region=row.get("iso_region", "").strip() or None,
            continent=CONTINENT_MAP.get(continent_code, continent_code) or None,
            latitude=lat,
            longitude=lon,
            elevation_ft=int(row["elevation_ft"]) if row.get("elevation_ft") else None,
            type=row.get("type"),
            wikipedia_link=row.get("wikipedia_link", "").strip() or None,
            homepage=row.get("home_link", "").strip() or None,
            has_sandbox=(ident == "KJFK"),  # JFK is the initial AI sandbox airport
        )
        db.add(airport)
        inserted += 1

        if inserted % 1000 == 0:
            db.commit()
            logger.info(f"  Committed {inserted} airports...")

    db.commit()
    logger.info(f"✓ Airports seeded: {inserted} records inserted.")
    return inserted


def fetch_airlines(db: Session) -> int:
    """Download, clean, and seed the airlines table from OpenFlights."""
    logger.info("Fetching airlines from OpenFlights...")
    resp = requests.get(AIRLINES_URL, timeout=30)
    resp.raise_for_status()

    # OpenFlights .dat is CSV without header
    # Columns: id, name, alias, iata, icao, callsign, country, active
    rows = csv.reader(io.StringIO(resp.text))
    inserted = 0

    for row in rows:
        if len(row) < 8:
            continue
        _, name, alias, iata, icao, callsign, country, active = row[:8]

        # Skip entries with no ICAO code or "N/A" placeholders
        icao = icao.strip()
        if not icao or icao in ("\\N", "N/A", "-"):
            continue

        existing = db.get(Airline, icao)
        if existing:
            continue

        airline = Airline(
            id=icao,
            iata_code=iata.strip() if iata.strip() not in ("\\N", "") else None,
            name=name.strip(),
            country=country.strip() or None,
            active=(active.strip().upper() == "Y"),
            callsign=callsign.strip() or None,
        )
        db.add(airline)
        inserted += 1

    db.commit()
    logger.info(f"✓ Airlines seeded: {inserted} records inserted.")
    return inserted


def run_seed():
    """Entry point: create tables then seed airports and airlines."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        airport_count = fetch_airports(db)
        airline_count = fetch_airlines(db)

    logger.info(
        f"\n✅ Seeding complete! "
        f"{airport_count} airports, {airline_count} airlines loaded."
    )


if __name__ == "__main__":
    run_seed()
