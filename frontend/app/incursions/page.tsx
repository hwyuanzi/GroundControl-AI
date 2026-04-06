"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchIncursions } from "@/app/lib/api";
import type { Incursion, PaginatedResponse } from "@/app/types";
import { AlertTriangle, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "All Severities" },
  { value: "A", label: "Category A — Near Collision" },
  { value: "B", label: "Category B — Significant Risk" },
  { value: "C", label: "Category C — Some Risk" },
  { value: "D", label: "Category D — Rule Violation Only" },
];

const ROOT_CAUSES = [
  { value: "", label: "All Root Causes" },
  { value: "Pilot Deviation", label: "Pilot Deviation" },
  { value: "ATC Communication Error", label: "ATC Communication Error" },
  { value: "Ground Vehicle Incursion", label: "Ground Vehicle Incursion" },
  { value: "Pavement Marking or Signage Issue", label: "Pavement / Signage Issue" },
  { value: "Low Visibility or Weather", label: "Low Visibility / Weather" },
];

const CATEGORY_DESC: Record<string, string> = {
  A: "Collision narrowly avoided — most severe",
  B: "Significant potential for collision",
  C: "Generally ample time to avoid",
  D: "Little or no risk, rule violation only",
};

function IncursionCard({ inc }: { inc: Incursion }) {
  const cat = inc.category ?? "D";
  return (
    <div className="glass-card" style={{ padding: "1.25rem", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
            <span className={`badge-${cat}`} style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700 }}>
              CAT {cat}
            </span>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
              {CATEGORY_DESC[cat]}
            </span>
          </div>
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>{inc.airport_id}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
            {new Date(inc.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          {inc.fatalities > 0 && (
            <p style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 700, marginTop: "0.2rem" }}>
              {inc.fatalities} fatalities
            </p>
          )}
        </div>
      </div>

      {inc.narrative && (
        <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65, marginBottom: "0.875rem" }}>
          {inc.narrative.length > 300 ? inc.narrative.slice(0, 300) + "…" : inc.narrative}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          {inc.root_cause_label && (
            <span style={{
              padding: "0.2rem 0.625rem", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 600,
              background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)",
            }}>
              🧠 {inc.root_cause_label}
            </span>
          )}
          {inc.airline_id && (
            <span style={{
              padding: "0.2rem 0.625rem", borderRadius: "100px", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)",
            }}>
              ✈️ {inc.airline_id}
            </span>
          )}
        </div>
        {inc.category && (
          <a href={inc.source_url || "https://asias.faa.gov/apex/f?p=100:11:::NO:::"} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "0.3rem",
            padding: "0.25rem 0.625rem", borderRadius: "100px",
            fontSize: "0.75rem", color: "#4d94ff", 
            background: "rgba(29, 111, 243, 0.08)", cursor: "pointer",
            border: "1px solid rgba(29, 111, 243, 0.2)",
            textDecoration: "none"
          }} title="View official NTSB/ASIAS safety dossier">
            Open NTSB Record <ExternalLink size={11} color="#4d94ff" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function IncursionsPage() {
  const [data, setData] = useState<PaginatedResponse<Incursion> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIncursions({
        page, page_size: 12,
        airport_id: search.toUpperCase() || undefined,
        category: category || undefined,
        root_cause: rootCause || undefined,
        sort_by: "date", sort_order: sortOrder,
      });
      setData(result);
    } catch {
      setError("Could not connect to the API.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, rootCause, sortOrder]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, rootCause, sortOrder]);

  const totalPages = data ? Math.ceil(data.total / 12) : 0;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <AlertTriangle size={24} color="#f87171" />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Runway Incursion Database</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
          Documented runway incursion events with AI-extracted root causes and FAA severity classifications
        </p>
      </div>

      {/* Severity Legend */}
      <div className="glass-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Severity:</span>
        {["A", "B", "C", "D"].map((cat) => (
          <span key={cat} className={`badge-${cat}`} style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
            Cat {cat}
          </span>
        ))}
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>
          🧠 = AI-classified root cause
        </span>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 180px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input
              className="gc-input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Filter by airport (ICAO)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="gc-select" style={{ flex: "1 1 200px" }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <select className="gc-select" style={{ flex: "1 1 200px" }} value={rootCause} onChange={(e) => setRootCause(e.target.value)}>
            {ROOT_CAUSES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select className="gc-select" style={{ flex: "0 1 160px" }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.35)" }}>Loading incidents...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#f87171" }}>{error}</div>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginBottom: "1rem" }}>
            {data?.total} events found
          </p>
          <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
            {data?.results.map((inc) => <IncursionCard key={inc.id} inc={inc} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem" }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
