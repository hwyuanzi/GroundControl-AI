/**
 * API client with typed fetch helpers.
 * Centralizes all backend communication so components stay clean.
 */

import type {
  Airport,
  Airline,
  Incursion,
  PaginatedResponse,
  GlobalStats,
  GeoJSONCollection,
} from "@/app/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const V1 = `${API_BASE}/api/v1`;

// Generic fetch wrapper with error handling
async function apiFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${V1}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Airports ─────────────────────────────────────────────────────────────────

export interface AirportQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  country?: string;
  continent?: string;
  type?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  has_sandbox?: boolean;
}

export const fetchAirports = (params?: AirportQueryParams) =>
  apiFetch<PaginatedResponse<Airport>>("/airports", params as Record<string, string | number | boolean | undefined>);

export const fetchAirport = (id: string) =>
  apiFetch<Airport>(`/airports/${id}`);

// ─── Airlines ─────────────────────────────────────────────────────────────────

export interface AirlineQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  country?: string;
  active_only?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export const fetchAirlines = (params?: AirlineQueryParams) =>
  apiFetch<PaginatedResponse<Airline>>("/airlines", params as Record<string, string | number | boolean | undefined>);

export const fetchAirline = (id: string) =>
  apiFetch<Airline>(`/airlines/${id}`);

// ─── Incursions ────────────────────────────────────────────────────────────────

export interface IncursionQueryParams {
  page?: number;
  page_size?: number;
  airport_id?: string;
  airline_id?: string;
  category?: string;
  root_cause?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export const fetchIncursions = (params?: IncursionQueryParams) =>
  apiFetch<PaginatedResponse<Incursion>>("/incursions", params as Record<string, string | number | boolean | undefined>);

export const fetchHotspotsGeoJSON = () =>
  apiFetch<GeoJSONCollection>("/incursions/hotspots/geojson");

// ─── Global Stats ──────────────────────────────────────────────────────────────

export const fetchGlobalStats = () =>
  apiFetch<GlobalStats>("/stats");

// ─── Analytics & ML ───────────────────────────────────────────────────────────

export interface LiveFlight {
  icao24: string;
  callsign: string;
  origin_country: string;
  latitude: number | null;
  longitude: number | null;
  altitude_ft: number | null;
  speed_kts: number | null;
  heading_deg: number | null;
  on_ground: boolean;
}

export interface CongestionData {
  airport_icao: string;
  congestion_factor: number;
  level: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  color: string;
  description: string;
  n_aircraft_on_surface: number;
  predicted_at: string;
}

export interface RouteRequest {
  origin: string;
  destination: string;
  airport_icao?: string;
}

export interface RouteData {
  origin: string;
  destination: string;
  path: string[];
  coordinates: [number, number][];
  total_distance_m: number;
  estimated_time_min: number;
  congestion_penalty_min: number;
  congestion_factor: number;
  congestion_level: string;
}

export interface TaxiNode {
  node_id: string;
  latitude: number;
  longitude: number;
  type: "gate" | "taxiway" | "runway_threshold" | "holding_point";
}

export interface TaxiEdge {
  source: string;
  target: string;
  distance_m: number;
  max_speed_kts: number;
}

export interface AirportGraph {
  nodes: TaxiNode[];
  edges: TaxiEdge[];
}

export interface IncursionAlertLive {
  severity: "CRITICAL" | "WARNING" | "ADVISORY";
  callsign: string;
  runway_id: string;
  airport_icao: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  message: string;
  detected_at: string;
}

export const fetchLiveFlights = (airport_icao = "KJFK") =>
  apiFetch<LiveFlight[]>("/analytics/live-flights", { airport_icao });

export const fetchCongestion = (airport_icao = "KJFK") =>
  apiFetch<CongestionData>("/analytics/congestion", { airport_icao });

export const fetchAirportGraph = (airport_icao = "KJFK") =>
  apiFetch<AirportGraph>("/analytics/graph", { airport_icao });

export const fetchTaxiRoute = async (req: RouteRequest): Promise<RouteData> => {
  const url = new URL(`${V1}/analytics/route`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Route API error ${res.status}`);
  return res.json();
};

export const fetchLiveDetection = (airport_icao = "KJFK") =>
  apiFetch<IncursionAlertLive[]>("/analytics/detect", { airport_icao });

