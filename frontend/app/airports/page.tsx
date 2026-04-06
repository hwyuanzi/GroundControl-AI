"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchAirports } from "@/app/lib/api";
import type { Airport, PaginatedResponse } from "@/app/types";
import { Search, Building2, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Plane } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CONTINENTS = [
  { value: "", label: "All Continents" },
  { value: "North America", label: "North America" },
  { value: "Europe", label: "Europe" },
  { value: "Asia", label: "Asia" },
  { value: "South America", label: "South America" },
  { value: "Africa", label: "Africa" },
  { value: "Oceania", label: "Oceania" },
];

const AIRPORT_TYPES = [
  { value: "", label: "All Types" },
  { value: "large_airport", label: "Large Airport" },
  { value: "medium_airport", label: "Medium Airport" },
  { value: "small_airport", label: "Small Airport" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "country", label: "Country" },
  { value: "incursion_count", label: "Incidents (High → Low)" },
  { value: "avg_taxi_out_min", label: "Avg Taxi-Out Time" },
];

function AirportRow({ airport }: { airport: Airport }) {
  const router = useRouter();
  return (
      <tr onClick={() => router.push(`/airports/${airport.id}`)} style={{ cursor: "pointer" }} className="gc-table-row">
        <td>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{airport.name}</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{airport.city}</p>
          </div>
        </td>
        <td>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {airport.iata_code && (
              <span style={{ padding: "0.15rem 0.5rem", borderRadius: "5px", fontSize: "0.75rem", fontWeight: 700, background: "rgba(29,111,243,0.15)", color: "#60a5fa", border: "1px solid rgba(29,111,243,0.25)" }}>
                {airport.iata_code}
              </span>
            )}
            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "5px", fontSize: "0.75rem", fontWeight: 500, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {airport.id}
            </span>
          </div>
        </td>
        <td style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>{airport.country}</td>
        <td style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)" }}>{airport.continent}</td>
        <td>
          {airport.incursion_count > 0 ? (
            <span style={{ color: airport.incursion_count >= 3 ? "#f87171" : "#fbbf24", fontWeight: 700 }}>
              {airport.incursion_count}
            </span>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
          )}
        </td>
        <td style={{ fontSize: "0.875rem" }}>
          {airport.avg_taxi_out_min != null
            ? <span style={{ color: airport.avg_taxi_out_min > 20 ? "#f87171" : "#4ade80" }}>{airport.avg_taxi_out_min.toFixed(1)} min</span>
            : <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>}
        </td>
        <td>
          {airport.has_sandbox && (
            <span style={{
              padding: "0.2rem 0.625rem", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 700,
              background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.25)",
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
            }}>
              <Plane size={10} /> AI Sandbox
            </span>
          )}
        </td>
      </tr>
  );
}

export default function AirportsPage() {
  const [data, setData] = useState<PaginatedResponse<Airport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [continent, setContinent] = useState("");
  const [type, setType] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAirports({
        page, page_size: 25, search, continent, type,
        sort_by: sortBy, sort_order: sortOrder,
      });
      setData(result);
    } catch (e) {
      setError("Could not connect to API. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, search, continent, type, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, continent, type, sortBy, sortOrder]);

  const totalPages = data ? Math.ceil(data.total / 25) : 0;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Building2 size={24} color="#4d94ff" />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Airport Explorer</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
          Browse and filter {data?.total?.toLocaleString() ?? "all"} commercial airports worldwide
        </p>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "2 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input
              className="gc-input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Search airport name, IATA, ICAO, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Continent */}
          <select className="gc-select" style={{ flex: "1 1 160px" }} value={continent} onChange={(e) => setContinent(e.target.value)}>
            {CONTINENTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Type */}
          <select className="gc-select" style={{ flex: "1 1 160px" }} value={type} onChange={(e) => setType(e.target.value)}>
            {AIRPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {/* Sort */}
          <select className="gc-select" style={{ flex: "1 1 180px" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Sort order toggle */}
          <button className="btn-ghost" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} title="Toggle sort direction">
            <ArrowUpDown size={16} />
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </button>
        </div>
      </div>

      {/* ─── Results Table ──────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.35)" }}>
            Loading airports...
          </div>
        ) : error ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <p style={{ color: "#f87171", marginBottom: "0.5rem" }}>{error}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.875rem" }}>
              Run <code style={{ background: "rgba(255,255,255,0.08)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>uvicorn main:app --reload</code> in the backend directory.
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="gc-table">
                <thead>
                  <tr>
                    <th>Airport</th>
                    <th>Codes</th>
                    <th>Country</th>
                    <th>Continent</th>
                    <th>Incidents</th>
                    <th>Avg Taxi-Out</th>
                    <th>Features</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map((ap) => (
                    <AirportRow key={ap.id} airport={ap} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination ──────────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                  Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data?.total ?? 0)} of {data?.total?.toLocaleString()} airports
                </span>
                <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button key={p} className={`page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>
                        {p}
                      </button>
                    );
                  })}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
