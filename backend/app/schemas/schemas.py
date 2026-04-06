"""
Pydantic schemas for request validation and response serialization.
All schemas use strict typing to prevent data corruption.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.models import IncursionCategory


# ─── Airport ──────────────────────────────────────────────────────────────────

class AirportBase(BaseModel):
    id: str
    iata_code: Optional[str] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    continent: Optional[str] = None
    latitude: float
    longitude: float
    elevation_ft: Optional[int] = None
    type: Optional[str] = None
    avg_taxi_out_min: Optional[float] = None
    avg_taxi_in_min: Optional[float] = None
    incursion_count: int = 0
    has_sandbox: bool = False


class AirportListItem(AirportBase):
    model_config = ConfigDict(from_attributes=True)


class AirportDetail(AirportBase):
    wikipedia_link: Optional[str] = None
    homepage: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─── Airline ──────────────────────────────────────────────────────────────────

class AirlineBase(BaseModel):
    id: str
    iata_code: Optional[str] = None
    name: str
    country: Optional[str] = None
    active: bool = True
    callsign: Optional[str] = None
    logo_url: Optional[str] = None


class AirlineListItem(AirlineBase):
    model_config = ConfigDict(from_attributes=True)


class AirlineDetail(AirlineBase):
    model_config = ConfigDict(from_attributes=True)


# ─── Incursion ────────────────────────────────────────────────────────────────

class IncursionBase(BaseModel):
    id: int
    airport_id: str
    airline_id: Optional[str] = None
    date: datetime
    category: Optional[IncursionCategory] = None
    narrative: Optional[str] = None
    root_cause_label: Optional[str] = None
    root_cause_confidence: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    aircraft_count: int = 1
    fatalities: int = 0
    injuries: int = 0
    source_url: Optional[str] = None


class IncursionListItem(IncursionBase):
    model_config = ConfigDict(from_attributes=True)


# ─── Taxi Time Stats ──────────────────────────────────────────────────────────

class TaxiTimeStatItem(BaseModel):
    airport_id: str
    airline_id: Optional[str] = None
    year: int
    month: Optional[int] = None
    avg_taxi_out_min: Optional[float] = None
    avg_taxi_in_min: Optional[float] = None
    total_flights: Optional[int] = None
    estimated_co2_kg_per_flight: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


# ─── Paginated Response Wrapper ───────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List


class GlobalStatsResponse(BaseModel):
    total_airports: int
    total_airlines: int
    total_incursions: int
    avg_global_taxi_out_min: Optional[float]
    category_a_b_count: int  # Most severe incursions
    top_danger_airports: List[AirportListItem]
    top_airlines_by_incursions: List[AirlineListItem]
