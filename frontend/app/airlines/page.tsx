"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchAirlines } from "@/app/lib/api";
import type { Airline, PaginatedResponse } from "@/app/types";
import { Plane, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "country", label: "Country" },
  { value: "iata_code", label: "IATA Code" },
];

function AirlineCard({ airline }: { airline: Airline }) {
  return (
    <Link href={`/airlines/${airline.id}`} style={{ textDecoration: "none" }}>
      <div className="glass-card-hover" style={{ padding: "1.125rem", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(29,111,243,0.2), rgba(0,212,255,0.1))",
            border: "1px solid rgba(29,111,243,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Plane size={20} color="#4d94ff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "white" }}>
              {airline.name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>{airline.country}</p>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
            {airline.iata_code && (
              <span style={{ padding: "0.15rem 0.5rem", borderRadius: "5px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(29,111,243,0.15)", color: "#60a5fa", border: "1px solid rgba(29,111,243,0.25)" }}>
                {airline.iata_code}
              </span>
            )}
            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "5px", fontSize: "0.72rem", fontWeight: 500, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {airline.id}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function AirlinesPage() {
  const [data, setData] = useState<PaginatedResponse<Airline> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAirlines({
        page, page_size: 30, search: search || undefined,
        country: country || undefined,
        active_only: true,
        sort_by: sortBy, sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError("Could not connect to the API.");
    } finally {
      setLoading(false);
    }
  }, [page, search, country, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, country, sortBy, sortOrder]);

  const totalPages = data ? Math.ceil(data.total / 30) : 0;

  return (
    <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Plane size={24} color="#4d94ff" />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Airline Directory</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
          Browse {data?.total?.toLocaleString() ?? "all"} active airlines worldwide
        </p>
      </div>
      
      {/* Context Banner */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "rgba(29, 111, 243, 0.05)", borderLeft: "4px solid #4d94ff" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fff" }}>Why track Airline data?</h3>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
          Explore active flight operators worldwide. An airline's home country and fleet size often heavily correlate with their regulatory safety adherence. By cross-referencing airlines with our Incursion database, safety inspectors can identify patterns of Pilot Deviations or specific crew training deficiencies across different carriers.
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "2 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input className="gc-input" style={{ paddingLeft: "2.5rem" }} placeholder="Search by name, IATA, or ICAO..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <input className="gc-input" style={{ flex: "1 1 160px" }} placeholder="Filter by country..." value={country} onChange={(e) => setCountry(e.target.value)} />
          <select className="gc-select" style={{ flex: "1 1 150px" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            <ArrowUpDown size={16} /> {sortOrder === "asc" ? "Asc" : "Desc"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.35)" }}>Loading airlines...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#f87171" }}>{error}</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
            {data?.results.map((airline) => <AirlineCard key={airline.id} airline={airline} />)}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem" }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
