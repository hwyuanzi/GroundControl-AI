"""
SQLAlchemy ORM Models for GroundControl AI.
"""
from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    DateTime, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class IncursionCategory(str, enum.Enum):
    """FAA runway incursion severity categories."""
    A = "A"  # Serious incident — collision narrowly avoided
    B = "B"  # Significant potential for collision
    C = "C"  # Ample time to avoid, but still abnormal
    D = "D"  # Little or no risk, but still a rule violation


class Airport(Base):
    __tablename__ = "airports"

    id = Column(String(10), primary_key=True)           # ICAO code e.g. "KJFK"
    iata_code = Column(String(5), index=True)            # IATA code e.g. "JFK"
    name = Column(String(200), nullable=False)
    city = Column(String(100))
    country = Column(String(100), index=True)
    region = Column(String(100))                         # e.g. "North America"
    continent = Column(String(50), index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_ft = Column(Integer)
    type = Column(String(50))                            # large_airport, medium_airport, etc.
    wikipedia_link = Column(String(500))
    homepage = Column(String(500))
    avg_taxi_out_min = Column(Float)                     # BTS average taxi-out (minutes)
    avg_taxi_in_min = Column(Float)                      # BTS average taxi-in (minutes)
    incursion_count = Column(Integer, default=0)
    has_sandbox = Column(Boolean, default=False)         # True for JFK (Phase 4)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    incursions = relationship("Incursion", back_populates="airport")
    taxi_stats = relationship("TaxiTimeStat", back_populates="airport")


class Airline(Base):
    __tablename__ = "airlines"

    id = Column(String(10), primary_key=True)            # ICAO code e.g. "DAL"
    iata_code = Column(String(5), index=True)            # IATA code e.g. "DL"
    name = Column(String(200), nullable=False)
    country = Column(String(100), index=True)
    active = Column(Boolean, default=True)
    callsign = Column(String(100))
    logo_url = Column(String(500))

    incursions = relationship("Incursion", back_populates="airline")
    taxi_stats = relationship("TaxiTimeStat", back_populates="airline")


class Incursion(Base):
    __tablename__ = "incursions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    airport_id = Column(String(10), ForeignKey("airports.id"), index=True)
    airline_id = Column(String(10), ForeignKey("airlines.id"), nullable=True)
    date = Column(DateTime, nullable=False, index=True)
    category = Column(SAEnum(IncursionCategory), nullable=True)
    narrative = Column(Text)                             # Full NTSB/ASIAS text
    root_cause_label = Column(String(100))               # NLP-extracted root cause
    root_cause_confidence = Column(Float)                # NLP model confidence score
    latitude = Column(Float)                             # Exact incident location
    longitude = Column(Float)
    aircraft_count = Column(Integer, default=1)
    fatalities = Column(Integer, default=0)
    injuries = Column(Integer, default=0)
    source_url = Column(String(500))                     # Link to original NTSB report
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    airport = relationship("Airport", back_populates="incursions")
    airline = relationship("Airline", back_populates="incursions")


class TaxiTimeStat(Base):
    __tablename__ = "taxi_time_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    airport_id = Column(String(10), ForeignKey("airports.id"), index=True)
    airline_id = Column(String(10), ForeignKey("airlines.id"), nullable=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer)
    avg_taxi_out_min = Column(Float)
    avg_taxi_in_min = Column(Float)
    total_flights = Column(Integer)
    # Derived metric: estimated CO2 per flight from excess taxi time
    estimated_co2_kg_per_flight = Column(Float)

    airport = relationship("Airport", back_populates="taxi_stats")
    airline = relationship("Airline", back_populates="taxi_stats")
