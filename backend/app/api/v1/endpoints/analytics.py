"""
Analytics API Endpoints
========================
Provides ML-powered endpoints:
  - POST /analytics/route        Compute optimal taxi route between two nodes
  - GET  /analytics/congestion   Current airport congestion prediction
  - GET  /analytics/live-flights Real-time ADS-B traffic near JFK (via OpenSky)
  - GET  /analytics/detect       Run incursion detection on current live traffic
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.analytics.congestion_model import get_congestion_model
from app.analytics.incursion_detector import (
    AircraftState,
    IncursionAlert,
    get_detector_for_airport,
)
from app.analytics.taxi_optimizer import JFK_EDGES, JFK_NODES, TaxiRoute, get_optimizer
from app.services.opensky_client import StateVector, get_opensky_client

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class RouteRequest(BaseModel):
    origin: str      # Node ID, e.g. "T1_GATE"
    destination: str  # Node ID, e.g. "RWY_04L"
    airport_icao: str = "KJFK"


class RouteResponse(BaseModel):
    origin: str
    destination: str
    path: list[str]
    coordinates: list[list[float]]  # [[lat, lng], ...]
    total_distance_m: float
    estimated_time_min: float
    congestion_penalty_min: float
    congestion_factor: float
    congestion_level: str


class CongestionResponse(BaseModel):
    airport_icao: str
    congestion_factor: float
    level: str
    color: str
    description: str
    n_aircraft_on_surface: int
    predicted_at: str


class LiveFlightResponse(BaseModel):
    icao24: str
    callsign: str
    origin_country: str
    latitude: Optional[float]
    longitude: Optional[float]
    altitude_ft: Optional[float]
    speed_kts: Optional[float]
    heading_deg: Optional[float]
    on_ground: bool


class IncursionAlertResponse(BaseModel):
    severity: str
    callsign: str
    runway_id: str
    airport_icao: str
    latitude: float
    longitude: float
    distance_m: float
    message: str
    detected_at: str


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]


# ─── Taxi-Graph Info ──────────────────────────────────────────────────────────

@router.get("/graph", response_model=GraphResponse, summary="Get airport taxiway graph")
def get_airport_graph(airport_icao: str = Query("KJFK")):
    """
    Return the taxiway node and edge graph for the specified airport.
    Used by the frontend to render the interactive sandbox map.
    """
    if airport_icao.upper() != "KJFK":
        raise HTTPException(status_code=404, detail=f"Graph data for {airport_icao} not yet available.")

    nodes_out = [
        {
            "node_id": n.node_id,
            "latitude": n.latitude,
            "longitude": n.longitude,
            "type": n.node_type,
        }
        for n in JFK_NODES.values()
    ]
    edges_out = [
        {
            "source": e.source,
            "target": e.target,
            "distance_m": round(e.distance_m, 1),
            "max_speed_kts": e.max_speed_kts,
        }
        for e in JFK_EDGES
    ]
    return GraphResponse(nodes=nodes_out, edges=edges_out)


# ─── Route Planning ───────────────────────────────────────────────────────────

@router.post("/route", response_model=RouteResponse, summary="Compute optimal taxi route")
def compute_taxi_route(req: RouteRequest):
    """
    Compute the minimum-time taxi route between two nodes using A*.

    The optimizer incorporates real-time congestion predictions from the
    RandomForest congestion model, making routes dynamically adaptive.
    """
    optimizer = get_optimizer(req.airport_icao.upper())
    congestion_model = get_congestion_model()

    # Apply current congestion to the graph before routing
    edge_congestion = congestion_model.get_edge_congestion_map(
        node_ids=list(JFK_NODES.keys()),
        edge_pairs=[(e.source, e.target) for e in JFK_EDGES],
    )
    optimizer.update_congestion(edge_congestion)

    route = optimizer.route(req.origin, req.destination)
    if route is None:
        raise HTTPException(
            status_code=422,
            detail=f"No path found from '{req.origin}' to '{req.destination}'."
        )

    summary = congestion_model.get_congestion_summary()
    return RouteResponse(
        origin=req.origin,
        destination=req.destination,
        path=route.path,
        coordinates=[[lat, lng] for lat, lng in route.coordinates],
        total_distance_m=route.total_distance_m,
        estimated_time_min=route.estimated_time_min,
        congestion_penalty_min=route.congestion_penalty_min,
        congestion_factor=summary["congestion_factor"],
        congestion_level=summary["level"],
    )


# ─── Congestion Prediction ────────────────────────────────────────────────────

@router.get("/congestion", response_model=CongestionResponse, summary="Get current congestion prediction")
def get_congestion(
    airport_icao: str = Query("KJFK"),
    n_aircraft: int = Query(10, ge=0, le=50, description="Override live aircraft count"),
):
    """
    Return current ML-predicted congestion level for an airport surface.
    Incorporates time-of-day, day-of-week, and aircraft density features.
    """
    model = get_congestion_model()

    # Try to get live surface count from OpenSky (fallback to query param)
    surface_count = n_aircraft
    if airport_icao.upper() == "KJFK":
        try:
            client = get_opensky_client()
            ground = client.get_ground_traffic_jfk()
            surface_count = len(ground)
        except Exception:
            pass  # Fall back to provided n_aircraft

    summary = model.get_congestion_summary(n_aircraft=surface_count)
    return CongestionResponse(
        airport_icao=airport_icao.upper(),
        congestion_factor=summary["congestion_factor"],
        level=summary["level"],
        color=summary["color"],
        description=summary["description"],
        n_aircraft_on_surface=surface_count,
        predicted_at=datetime.now(timezone.utc).isoformat(),
    )


# ─── Live Flights ─────────────────────────────────────────────────────────────

@router.get("/live-flights", response_model=list[LiveFlightResponse], summary="Get live ADS-B traffic near JFK")
def get_live_flights(airport_icao: str = Query("KJFK")):
    """
    Fetch real-time aircraft state vectors near the specified airport from
    the OpenSky Network (no API key required for basic access).

    Returns up to 100 aircraft within ~20 nm of the airport.
    """
    if airport_icao.upper() != "KJFK":
        raise HTTPException(status_code=404, detail="Live data currently available for KJFK only.")

    try:
        client = get_opensky_client()
        states = client.get_all_traffic_jfk()
    except Exception as exc:
        logger.warning("OpenSky call failed: %s", exc)
        states = []

    return [
        LiveFlightResponse(
            icao24=s.icao24,
            callsign=s.callsign or s.icao24,
            origin_country=s.origin_country,
            latitude=s.latitude,
            longitude=s.longitude,
            altitude_ft=round(s.altitude_ft, 0) if s.altitude_ft else None,
            speed_kts=round(s.speed_kts, 1) if s.speed_kts else None,
            heading_deg=s.true_track_deg,
            on_ground=s.on_ground,
        )
        for s in states[:100]
    ]


# ─── Incursion Detection on Live Traffic ─────────────────────────────────────

@router.get("/detect", response_model=list[IncursionAlertResponse], summary="Run live runway incursion detection")
def detect_live_incursions(airport_icao: str = Query("KJFK")):
    """
    Fetch live ADS-B state vectors and run the spatial incursion detector.

    This is a demonstration endpoint — in production this would run on a
    continuous stream with sub-second latency via WebSocket.
    """
    try:
        client = get_opensky_client()
        states = client.get_ground_traffic_jfk()
    except Exception as exc:
        logger.warning("OpenSky call failed during detection: %s", exc)
        states = []

    aircraft_states = [
        AircraftState(
            callsign=s.callsign or s.icao24,
            latitude=s.latitude or 0.0,
            longitude=s.longitude or 0.0,
            altitude_ft=s.altitude_ft or 0.0,
            speed_kts=s.speed_kts or 0.0,
            on_ground=s.on_ground,
        )
        for s in states
        if s.latitude and s.longitude
    ]

    detector = get_detector_for_airport(airport_icao.upper())
    alerts = detector.check(aircraft_states)
    now = datetime.now(timezone.utc).isoformat()

    return [
        IncursionAlertResponse(
            severity=a.severity,
            callsign=a.callsign,
            runway_id=a.runway_id,
            airport_icao=a.airport_icao,
            latitude=a.latitude,
            longitude=a.longitude,
            distance_m=a.distance_m,
            message=a.message,
            detected_at=now,
        )
        for a in alerts
    ]
