/**
 * Global TypeScript type definitions for GroundControl AI frontend.
 */

export interface Airport {
  id: string;           // ICAO code (e.g., "KJFK")
  iata_code: string | null;
  name: string;
  city: string | null;
  country: string | null;
  region: string | null;
  continent: string | null;
  latitude: number;
  longitude: number;
  elevation_ft: number | null;
  type: string | null;
  avg_taxi_out_min: number | null;
  avg_taxi_in_min: number | null;
  incursion_count: number;
  has_sandbox: boolean;
  wikipedia_link?: string | null;
  homepage?: string | null;
}


export interface Airline {
  id: string;           // ICAO code (e.g., "DAL")
  iata_code: string | null;
  name: string;
  country: string | null;
  active: boolean;
  callsign: string | null;
  logo_url: string | null;
}

export type IncursionCategory = "A" | "B" | "C" | "D";

export interface Incursion {
  id: number;
  airport_id: string;
  airline_id: string | null;
  date: string;        // ISO 8601
  category: IncursionCategory | null;
  narrative: string | null;
  root_cause_label: string | null;
  root_cause_confidence: number | null;
  latitude: number | null;
  longitude: number | null;
  aircraft_count: number;
  fatalities: number;
  injuries: number;
  source_url: string | null;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  results: T[];
}

export interface GlobalStats {
  total_airports: number;
  total_airlines: number;
  total_incursions: number;
  avg_global_taxi_out_min: number | null;
  category_a_b_count: number;
  top_danger_airports: Airport[];
  top_airlines_by_incursions: Airline[];
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: number;
    airport_id: string;
    category: string | null;
    date: string;
    root_cause: string | null;
    fatalities: number;
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// Sandbox types for JFK simulation
export interface SandboxAircraft {
  id: string;
  airline: string;
  position: [number, number];    // [lng, lat]
  heading: number;               // degrees
  speed: number;                 // knots (surface movement)
  status: "taxiing" | "holding" | "at_gate" | "at_runway";
  targetGate?: string;
  targetRunway?: string;
  path: [number, number][];     // Assigned taxiway path
  pathIndex: number;
  color: [number, number, number];
  hasConflict: boolean;
}

export type RoutingMode = "rule_based" | "ai_optimized";

export interface SimulationMetrics {
  avgTaxiTimeSec: number;
  totalConflicts: number;
  runwayUtilizationPct: number;
  co2SavedKg: number;
}
