"""
Runway Incursion Detector
=========================
Spatial algorithm that checks whether any active aircraft or ground vehicle
position is within the protected polygon of an active runway.

Algorithm:
  1. Represent each runway as a Shapely polygon (centerline ± half-width buffer).
  2. For each aircraft state vector, compute a Shapely Point.
  3. If a Point lies within a runway polygon AND the aircraft is NOT cleared for
     that runway, flag a potential incursion event.

Designed for both real-time (streaming ADS-B) and offline (historical) use.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from shapely.geometry import Point, Polygon


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class RunwayPolygon:
    """Represents the protected area of a runway as a Shapely polygon."""
    runway_id: str          # e.g. "04L" or "31R"
    airport_icao: str
    polygon: Polygon        # WGS84 coordinate polygon
    active: bool = True     # Whether the runway is currently in use


@dataclass
class AircraftState:
    """Minimum aircraft state needed for incursion detection."""
    callsign: str
    latitude: float
    longitude: float
    altitude_ft: float      # Barometric pressure altitude
    speed_kts: float
    on_ground: bool
    cleared_runway: Optional[str] = None  # ICAO designator if ATC-cleared
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class IncursionAlert:
    """Issued when an aircraft enters a protected runway zone without clearance."""
    severity: str           # "CRITICAL" | "WARNING" | "ADVISORY"
    callsign: str
    runway_id: str
    airport_icao: str
    latitude: float
    longitude: float
    distance_m: float       # Distance to runway centerline in metres
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = ""


# ─── Geometry Helpers ─────────────────────────────────────────────────────────

def _meters_to_degrees(meters: float, latitude: float) -> float:
    """
    Convert a distance in metres to an approximate degree offset.
    Uses a simple equirectangular approximation valid for small distances.
    """
    lat_deg = meters / 111_320.0
    lng_deg = meters / (111_320.0 * math.cos(math.radians(latitude)))
    return max(lat_deg, lng_deg)


def build_runway_polygon(
    threshold_lat: float,
    threshold_lng: float,
    end_lat: float,
    end_lng: float,
    width_m: float = 60.0,
    buffer_m: float = 100.0,
) -> Polygon:
    """
    Construct a Shapely polygon representing the protected runway area.

    The polygon is a rectangle oriented along the runway heading, with an
    extra buffer applied on all sides for safety margins.

    Args:
        threshold_lat: Latitude of the approach threshold.
        threshold_lng: Longitude of the approach threshold.
        end_lat: Latitude of the far end (stop end).
        end_lng: Longitude of the far end (stop end).
        width_m: Physical runway width in metres (defaults to 60 m, typical wide-body).
        buffer_m: Additional safety buffer on all sides in metres.

    Returns:
        Shapely Polygon in WGS84 coordinates.
    """
    mid_lat = (threshold_lat + end_lat) / 2
    half_width_deg = _meters_to_degrees(width_m / 2 + buffer_m, mid_lat)
    buffer_deg = _meters_to_degrees(buffer_m, mid_lat)

    # Runway heading vector
    dlat = end_lat - threshold_lat
    dlng = end_lng - threshold_lng
    length = math.sqrt(dlat**2 + dlng**2) or 1e-9
    # Perpendicular unit vector
    perp_lat = -dlng / length * half_width_deg
    perp_lng =  dlat / length * half_width_deg

    # Four corners (with longitudinal buffer)
    norm_lat = dlat / length * buffer_deg
    norm_lng = dlng / length * buffer_deg

    corners = [
        (threshold_lng - norm_lng + perp_lng, threshold_lat - norm_lat + perp_lat),
        (threshold_lng - norm_lng - perp_lng, threshold_lat - norm_lat - perp_lat),
        (end_lng + norm_lng - perp_lng,       end_lat + norm_lat - perp_lat),
        (end_lng + norm_lng + perp_lng,       end_lat + norm_lat + perp_lat),
    ]
    return Polygon(corners)


# ─── JFK Predefined Runways ───────────────────────────────────────────────────
# Source: FAA Airport Diagram KJFK (approximate threshold coordinates)

JFK_RUNWAYS: list[RunwayPolygon] = [
    RunwayPolygon(
        runway_id="04L/22R",
        airport_icao="KJFK",
        polygon=build_runway_polygon(40.6183, -73.7940, 40.6455, -73.7840),
    ),
    RunwayPolygon(
        runway_id="04R/22L",
        airport_icao="KJFK",
        polygon=build_runway_polygon(40.6212, -73.7875, 40.6464, -73.7785),
    ),
    RunwayPolygon(
        runway_id="13L/31R",
        airport_icao="KJFK",
        polygon=build_runway_polygon(40.6445, -73.8000, 40.6280, -73.7780),
    ),
    RunwayPolygon(
        runway_id="13R/31L",
        airport_icao="KJFK",
        polygon=build_runway_polygon(40.6418, -73.7940, 40.6270, -73.7758),
    ),
]


# ─── Detector ─────────────────────────────────────────────────────────────────

class RunwayIncursionDetector:
    """
    Stateless runway incursion detector.

    Checks a list of AircraftState objects against a set of RunwayPolygons
    and returns IncursionAlert objects for any violations found.

    Usage::

        detector = RunwayIncursionDetector(JFK_RUNWAYS)
        alerts = detector.check(aircraft_states)
    """

    def __init__(self, runways: list[RunwayPolygon]) -> None:
        self.runways = [r for r in runways if r.active]

    def _distance_to_centerline_m(
        self, point: Point, polygon: Polygon
    ) -> float:
        """Return approximate distance from point to polygon boundary in metres."""
        dist_deg = polygon.exterior.distance(point)
        return dist_deg * 111_320.0  # rough degree→metre conversion

    def _severity(self, distance_m: float, on_ground: bool) -> str:
        """Classify incursion severity based on proximity and aircraft state."""
        if on_ground:
            if distance_m < 50:
                return "CRITICAL"
            elif distance_m < 200:
                return "WARNING"
            return "ADVISORY"
        else:
            # Airborne aircraft inside runway polygon = approach/overshoot
            return "ADVISORY"

    def check(self, aircraft_states: list[AircraftState]) -> list[IncursionAlert]:
        """
        Evaluate all aircraft positions against all active runway polygons.

        Args:
            aircraft_states: Current ADS-B state vectors for all tracked aircraft.

        Returns:
            List of IncursionAlert objects (empty if no violations detected).
        """
        alerts: list[IncursionAlert] = []

        for ac in aircraft_states:
            point = Point(ac.longitude, ac.latitude)

            for rwy in self.runways:
                if not rwy.polygon.contains(point):
                    continue

                # Check if aircraft has ATC clearance for this runway
                if ac.cleared_runway and ac.cleared_runway in rwy.runway_id:
                    continue  # Cleared — not an incursion

                dist_m = self._distance_to_centerline_m(point, rwy.polygon)
                severity = self._severity(dist_m, ac.on_ground)

                alerts.append(IncursionAlert(
                    severity=severity,
                    callsign=ac.callsign,
                    runway_id=rwy.runway_id,
                    airport_icao=rwy.airport_icao,
                    latitude=ac.latitude,
                    longitude=ac.longitude,
                    distance_m=round(dist_m, 1),
                    message=(
                        f"{ac.callsign} detected on {rwy.runway_id} at {rwy.airport_icao} "
                        f"without clearance — {dist_m:.0f}m from boundary [{severity}]"
                    ),
                ))

        return alerts


# ─── Convenience Factory ──────────────────────────────────────────────────────

def get_detector_for_airport(icao: str) -> RunwayIncursionDetector:
    """
    Return a pre-configured incursion detector for a supported airport.
    Falls back to an empty detector if the airport is not yet in the database.
    """
    registry: dict[str, list[RunwayPolygon]] = {
        "KJFK": JFK_RUNWAYS,
    }
    return RunwayIncursionDetector(registry.get(icao.upper(), []))
