"""
OpenSky Network API Client
==========================
Consumes the OpenSky Network REST API v1 to fetch real-time ADS-B state vectors.

No API key required for anonymous access (rate-limited to ~100 req/day).
Registered accounts get ~1,000 req/day with optional username/password auth.

API docs: https://openskynetwork.github.io/opensky-api/rest.html
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import requests

logger = logging.getLogger(__name__)

OPENSKY_BASE = "https://opensky-network.org/api"

# Bounding box for JFK airport vicinity (±20 nm)
JFK_BBOX = {
    "lamin":  40.42,  # southern lat
    "lamax":  40.87,  # northern lat
    "lomin": -74.05,  # western lng
    "lomax": -73.51,  # eastern lng
}


@dataclass
class StateVector:
    """Parsed OpenSky state vector for a single aircraft."""
    icao24: str
    callsign: str
    origin_country: str
    longitude: Optional[float]
    latitude: Optional[float]
    baro_altitude_m: Optional[float]
    velocity_ms: Optional[float]
    true_track_deg: Optional[float]
    on_ground: bool
    last_contact: int  # Unix timestamp

    @property
    def altitude_ft(self) -> Optional[float]:
        if self.baro_altitude_m is None:
            return None
        return self.baro_altitude_m * 3.28084

    @property
    def speed_kts(self) -> Optional[float]:
        if self.velocity_ms is None:
            return None
        return self.velocity_ms * 1.94384


class OpenSkyClient:
    """
    Thin wrapper around the OpenSky Network REST API.

    Can be used with or without credentials.  In anonymous mode, the API
    allows one request per 10 seconds; authenticated users get shorter
    rate limits.
    """

    def __init__(
        self,
        username: str = "",
        password: str = "",
        timeout: int = 15,
    ) -> None:
        self._auth = (username, password) if username else None
        self._timeout = timeout
        self._session = requests.Session()

    def _get(self, path: str, params: dict | None = None) -> dict | None:
        url = f"{OPENSKY_BASE}{path}"
        try:
            resp = self._session.get(
                url,
                auth=self._auth,
                params=params or {},
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.Timeout:
            logger.warning("OpenSky request timed out: %s", url)
        except requests.exceptions.HTTPError as exc:
            logger.warning("OpenSky HTTP error %s: %s", exc.response.status_code, url)
        except requests.exceptions.RequestException as exc:
            logger.warning("OpenSky request failed: %s", exc)
        return None

    @staticmethod
    def _parse_vector(v: list) -> Optional[StateVector]:
        """Parse a raw state vector list from OpenSky JSON response."""
        try:
            return StateVector(
                icao24         = str(v[0] or ""),
                callsign       = str(v[1] or "").strip(),
                origin_country = str(v[2] or ""),
                longitude      = float(v[5]) if v[5] is not None else None,
                latitude       = float(v[6]) if v[6] is not None else None,
                baro_altitude_m= float(v[7]) if v[7] is not None else None,
                velocity_ms    = float(v[9]) if v[9] is not None else None,
                true_track_deg = float(v[10]) if v[10] is not None else None,
                on_ground      = bool(v[8]),
                last_contact   = int(v[4] or 0),
            )
        except (IndexError, TypeError, ValueError):
            return None

    def get_states_in_bbox(
        self,
        lamin: float,
        lamax: float,
        lomin: float,
        lomax: float,
    ) -> list[StateVector]:
        """
        Fetch all aircraft state vectors within a geographic bounding box.

        Args:
            lamin: Minimum latitude.
            lamax: Maximum latitude.
            lomin: Minimum longitude.
            lomax: Maximum longitude.

        Returns:
            List of StateVector objects (may be empty if API is unavailable).
        """
        data = self._get("/states/all", {
            "lamin": lamin, "lamax": lamax,
            "lomin": lomin, "lomax": lomax,
        })
        if not data or "states" not in data or not data["states"]:
            return []
        vectors = [self._parse_vector(v) for v in data["states"]]
        return [v for v in vectors if v is not None]

    def get_ground_traffic_jfk(self) -> list[StateVector]:
        """
        Convenience method: fetch all aircraft near JFK, filtered to on-ground
        traffic (surface state vectors only).

        Returns:
            List of on-ground StateVector objects near KJFK.
        """
        all_states = self.get_states_in_bbox(**JFK_BBOX)
        return [s for s in all_states if s.on_ground and s.latitude and s.longitude]

    def get_all_traffic_jfk(self) -> list[StateVector]:
        """Fetch all (ground + airborne) traffic near JFK."""
        return [
            s for s in self.get_states_in_bbox(**JFK_BBOX)
            if s.latitude and s.longitude
        ]


# ─── Singleton Factory ────────────────────────────────────────────────────────

_client: OpenSkyClient | None = None


def get_opensky_client(username: str = "", password: str = "") -> OpenSkyClient:
    """Return a cached OpenSkyClient. Pass credentials for authenticated mode."""
    global _client
    if _client is None:
        _client = OpenSkyClient(username=username, password=password)
    return _client
