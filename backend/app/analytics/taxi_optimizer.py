"""
Taxi Route Optimizer
====================
A* pathfinding on a weighted directed graph of airport taxiway nodes.

The graph can be populated from:
  a) Hard-coded node/edge definitions (used for JFK)
  b) Future: OSMnx-extracted airport surface movement networks

Key features:
  - Standard A* with geodesic heuristic
  - Congestion-aware edge weights (updated by CongestionModel at runtime)
  - Returns both the node path and the estimated taxi time in minutes
"""
from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Optional

import networkx as nx


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class TaxiNode:
    node_id: str
    latitude: float
    longitude: float
    node_type: str  # "gate" | "taxiway" | "runway_threshold" | "holding_point"


@dataclass
class TaxiEdge:
    source: str
    target: str
    distance_m: float
    max_speed_kts: float = 15.0
    congestion_factor: float = 1.0  # 1.0 = free flow; >1 = congested


@dataclass
class TaxiRoute:
    path: list[str]              # Ordered list of node IDs
    coordinates: list[tuple[float, float]]  # (lat, lng) for each node
    total_distance_m: float
    estimated_time_min: float
    congestion_penalty_min: float


# ─── Geodesic Distance Helper ─────────────────────────────────────────────────

def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return geodesic distance in metres between two WGS84 coordinates."""
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ─── JFK Taxiway Graph Definition ────────────────────────────────────────────
# Approximate centerline coordinates sourced from FAA Airport Diagram KJFK.
# Node naming: TWY_<designator>_<position> | T<n>_GATE | RWY_<id>_THRESH | HOLD_<id>

JFK_NODES: dict[str, TaxiNode] = {
    # ── Terminals ──────────────────────────────────────────────────────────────
    "T1_GATE":    TaxiNode("T1_GATE",    40.6437, -73.7832, "gate"),
    "T2_GATE":    TaxiNode("T2_GATE",    40.6454, -73.7862, "gate"),
    "T4_GATE":    TaxiNode("T4_GATE",    40.6391, -73.7787, "gate"),
    "T5_GATE":    TaxiNode("T5_GATE",    40.6468, -73.7918, "gate"),
    "T7_GATE":    TaxiNode("T7_GATE",    40.6445, -73.7901, "gate"),
    "T8_GATE":    TaxiNode("T8_GATE",    40.6427, -73.7948, "gate"),
    # ── Taxiway Intersections ──────────────────────────────────────────────────
    "TWY_A_N":    TaxiNode("TWY_A_N",    40.6461, -73.7869, "taxiway"),
    "TWY_A_S":    TaxiNode("TWY_A_S",    40.6310, -73.7869, "taxiway"),
    "TWY_B_N":    TaxiNode("TWY_B_N",    40.6461, -73.7838, "taxiway"),
    "TWY_B_S":    TaxiNode("TWY_B_S",    40.6310, -73.7838, "taxiway"),
    "TWY_K_W":    TaxiNode("TWY_K_W",    40.6395, -73.7963, "taxiway"),
    "TWY_K_E":    TaxiNode("TWY_K_E",    40.6395, -73.7803, "taxiway"),
    "TWY_Z_N":    TaxiNode("TWY_Z_N",    40.6461, -73.7963, "taxiway"),
    "TWY_Z_S":    TaxiNode("TWY_Z_S",    40.6285, -73.7963, "taxiway"),
    "CENTRAL":    TaxiNode("CENTRAL",    40.6385, -73.7853, "taxiway"),
    # ── Runway Holding Points ──────────────────────────────────────────────────
    "HOLD_04L":   TaxiNode("HOLD_04L",   40.6225, -73.7900, "holding_point"),
    "HOLD_04R":   TaxiNode("HOLD_04R",   40.6248, -73.7820, "holding_point"),
    "HOLD_13L":   TaxiNode("HOLD_13L",   40.6320, -73.7995, "holding_point"),
    "HOLD_13R":   TaxiNode("HOLD_13R",   40.6295, -73.7885, "holding_point"),
    # ── Runway Thresholds (endpoints) ─────────────────────────────────────────
    "RWY_04L":    TaxiNode("RWY_04L",    40.6183, -73.7940, "runway_threshold"),
    "RWY_04R":    TaxiNode("RWY_04R",    40.6212, -73.7875, "runway_threshold"),
    "RWY_13L":    TaxiNode("RWY_13L",    40.6445, -73.8000, "runway_threshold"),
    "RWY_13R":    TaxiNode("RWY_13R",    40.6418, -73.7940, "runway_threshold"),
}

JFK_EDGES: list[TaxiEdge] = [
    # ── Taxiway A ─────────────────────────────────────────────────────────────
    TaxiEdge("TWY_A_N", "CENTRAL",  _haversine_m(40.6461, -73.7869, 40.6385, -73.7853)),
    TaxiEdge("CENTRAL",  "TWY_A_S", _haversine_m(40.6385, -73.7853, 40.6310, -73.7869)),
    # ── Taxiway B ─────────────────────────────────────────────────────────────
    TaxiEdge("TWY_B_N", "CENTRAL",  _haversine_m(40.6461, -73.7838, 40.6385, -73.7853)),
    TaxiEdge("CENTRAL",  "TWY_B_S", _haversine_m(40.6385, -73.7853, 40.6310, -73.7838)),
    # ── Taxiway K ─────────────────────────────────────────────────────────────
    TaxiEdge("TWY_K_W", "CENTRAL",  _haversine_m(40.6395, -73.7963, 40.6385, -73.7853)),
    TaxiEdge("CENTRAL",  "TWY_K_E", _haversine_m(40.6385, -73.7853, 40.6395, -73.7803)),
    # ── Taxiway Z ─────────────────────────────────────────────────────────────
    TaxiEdge("TWY_Z_N", "TWY_K_W", _haversine_m(40.6461, -73.7963, 40.6395, -73.7963)),
    TaxiEdge("TWY_Z_S", "TWY_K_W", _haversine_m(40.6285, -73.7963, 40.6395, -73.7963)),
    # ── Terminal Connections ───────────────────────────────────────────────────
    TaxiEdge("T1_GATE",  "TWY_A_N", _haversine_m(40.6437, -73.7832, 40.6461, -73.7869)),
    TaxiEdge("T2_GATE",  "TWY_A_N", _haversine_m(40.6454, -73.7862, 40.6461, -73.7869)),
    TaxiEdge("T4_GATE",  "TWY_K_E", _haversine_m(40.6391, -73.7787, 40.6395, -73.7803)),
    TaxiEdge("T5_GATE",  "TWY_Z_N", _haversine_m(40.6468, -73.7918, 40.6461, -73.7963)),
    TaxiEdge("T7_GATE",  "TWY_A_N", _haversine_m(40.6445, -73.7901, 40.6461, -73.7869)),
    TaxiEdge("T8_GATE",  "TWY_Z_N", _haversine_m(40.6427, -73.7948, 40.6461, -73.7963)),
    # ── Holding Points ────────────────────────────────────────────────────────
    TaxiEdge("TWY_A_S", "HOLD_04L", _haversine_m(40.6310, -73.7869, 40.6225, -73.7900)),
    TaxiEdge("TWY_B_S", "HOLD_04R", _haversine_m(40.6310, -73.7838, 40.6248, -73.7820)),
    TaxiEdge("TWY_Z_S", "HOLD_13L", _haversine_m(40.6285, -73.7963, 40.6320, -73.7995)),
    TaxiEdge("TWY_K_W", "HOLD_13R", _haversine_m(40.6395, -73.7963, 40.6295, -73.7885)),
    # ── Runway Access ─────────────────────────────────────────────────────────
    TaxiEdge("HOLD_04L", "RWY_04L", _haversine_m(40.6225, -73.7900, 40.6183, -73.7940)),
    TaxiEdge("HOLD_04R", "RWY_04R", _haversine_m(40.6248, -73.7820, 40.6212, -73.7875)),
    TaxiEdge("HOLD_13L", "RWY_13L", _haversine_m(40.6320, -73.7995, 40.6445, -73.8000)),
    TaxiEdge("HOLD_13R", "RWY_13R", _haversine_m(40.6295, -73.7885, 40.6418, -73.7940)),
]


# ─── Graph Builder ────────────────────────────────────────────────────────────

def build_networkx_graph(
    nodes: dict[str, TaxiNode],
    edges: list[TaxiEdge],
) -> nx.Graph:
    """
    Construct a NetworkX undirected weighted graph from node/edge definitions.
    Edge weight = effective_time (seconds) = distance / speed × congestion_factor.
    """
    G = nx.Graph()
    for node_id, node in nodes.items():
        G.add_node(node_id, lat=node.latitude, lng=node.longitude, type=node.node_type)

    for edge in edges:
        # Convert distance + speed to time weight (seconds)
        speed_mps = edge.max_speed_kts * 0.5144  # knots → m/s
        time_s = (edge.distance_m / speed_mps) * edge.congestion_factor
        G.add_edge(
            edge.source, edge.target,
            weight=time_s,
            distance_m=edge.distance_m,
            congestion_factor=edge.congestion_factor,
        )
    return G


# ─── A* Optimizer ─────────────────────────────────────────────────────────────

class TaxiOptimizer:
    """
    Finds the least-time taxi path between any two nodes in the airport graph.

    Uses NetworkX's built-in A* implementation with a geodesic heuristic
    (straight-line travel time) to guide the search efficiently.

    Congestion factors on edges can be updated dynamically between calls
    (e.g., from the CongestionModel) to reflect real-time conditions.
    """

    def __init__(
        self,
        nodes: dict[str, TaxiNode] | None = None,
        edges: list[TaxiEdge] | None = None,
    ) -> None:
        self.nodes = nodes or JFK_NODES
        self.edges = edges or JFK_EDGES
        self._graph = build_networkx_graph(self.nodes, self.edges)

    def _heuristic(self, u: str, v: str) -> float:
        """Geodesic-distance-based A* heuristic (in seconds at max taxi speed)."""
        nu = self._graph.nodes[u]
        nv = self._graph.nodes[v]
        dist_m = _haversine_m(nu["lat"], nu["lng"], nv["lat"], nv["lng"])
        speed_mps = 15.0 * 0.5144  # 15 knots in m/s (conservative)
        return dist_m / speed_mps

    def route(self, origin: str, destination: str) -> Optional[TaxiRoute]:
        """
        Compute the optimal taxi route from origin node to destination node.

        Args:
            origin: Node ID of the starting position (e.g., "T1_GATE").
            destination: Node ID of the target (e.g., "RWY_04L").

        Returns:
            TaxiRoute object, or None if no path exists.
        """
        if origin not in self._graph or destination not in self._graph:
            return None

        try:
            path = nx.astar_path(
                self._graph, origin, destination,
                heuristic=self._heuristic, weight="weight",
            )
        except nx.NetworkXNoPath:
            return None

        # Accumulate route metrics
        total_time_s = 0.0
        total_dist_m = 0.0
        congestion_time_s = 0.0
        coords: list[tuple[float, float]] = []

        for node_id in path:
            n = self._graph.nodes[node_id]
            coords.append((n["lat"], n["lng"]))

        for i in range(len(path) - 1):
            edge_data = self._graph.edges[path[i], path[i + 1]]
            total_time_s += edge_data["weight"]
            total_dist_m += edge_data["distance_m"]
            cf = edge_data.get("congestion_factor", 1.0)
            if cf > 1.0:
                speed_mps = 15.0 * 0.5144
                base_time_s = edge_data["distance_m"] / speed_mps
                congestion_time_s += edge_data["weight"] - base_time_s

        return TaxiRoute(
            path=path,
            coordinates=coords,
            total_distance_m=round(total_dist_m, 1),
            estimated_time_min=round(total_time_s / 60.0, 2),
            congestion_penalty_min=round(congestion_time_s / 60.0, 2),
        )

    def update_congestion(self, edge_congestion: dict[tuple[str, str], float]) -> None:
        """
        Update congestion factors on specific edges.

        Args:
            edge_congestion: Dict mapping (source_id, target_id) → congestion_factor.
                             A factor of 1.0 = free flow; 2.0 = double travel time.
        """
        for (src, tgt), factor in edge_congestion.items():
            if self._graph.has_edge(src, tgt):
                speed_mps = 15.0 * 0.5144
                dist_m = self._graph.edges[src, tgt]["distance_m"]
                new_time_s = (dist_m / speed_mps) * factor
                self._graph.edges[src, tgt]["weight"] = new_time_s
                self._graph.edges[src, tgt]["congestion_factor"] = factor


# ─── Convenience Factory ──────────────────────────────────────────────────────

_OPTIMIZERS: dict[str, TaxiOptimizer] = {}


def get_optimizer(icao: str = "KJFK") -> TaxiOptimizer:
    """Return a cached TaxiOptimizer instance for the given airport."""
    if icao not in _OPTIMIZERS:
        _OPTIMIZERS[icao] = TaxiOptimizer()  # Currently only JFK data
    return _OPTIMIZERS[icao]
