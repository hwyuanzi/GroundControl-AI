"use client";
/**
 * Airport Detail Page
 * Shows full airport info: stats, incursions, taxi time trends, and the AI sandbox link for JFK.
 */
import { useEffect, useState, use } from "react";
import { fetchAirport, fetchIncursions } from "@/app/lib/api";
import type { Airport, Incursion } from "@/app/types";
import { Building2, AlertTriangle, Clock, Globe, Plane, ExternalLink, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

function InfoRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.625rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: color ?? "rgba(255,255,255,0.9)" }}>{value}</span>
    </div>
  );
}

export default function AirportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [airport, setAirport] = useState<Airport | null>(null);
  const [incursions, setIncursions] = useState<Incursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ap, inc] = await Promise.all([
          fetchAirport(resolvedParams.id),
          fetchIncursions({ airport_id: resolvedParams.id, page_size: 5, sort_order: "desc" }),
        ]);
        setAirport(ap);
        setIncursions(inc.results);
      } catch {
        setError("Airport not found or API unavailable.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "4rem 2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
        Loading airport data...
      </div>
    );
  }
  if (error || !airport) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "4rem 2rem", textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error ?? "Not found."}</p>
        <Link href="/airports" className="btn-ghost" style={{ textDecoration: "none", display: "inline-flex" }}>
          <ArrowLeft size={16} /> Back to Airports
        </Link>
      </div>
    );
  }

  const taxiColor = airport.avg_taxi_out_min != null
    ? airport.avg_taxi_out_min > 20 ? "#f87171" : "#4ade80"
    : "rgba(255,255,255,0.4)";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/airports" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
          <ArrowLeft size={14} /> All Airports
        </Link>
      </div>

      {/* Header */}
      <div className="glass-card" style={{ padding: "2rem", marginBottom: "1.5rem", position: "relative", overflow: "hidden" }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,111,243,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", position: "relative" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(29,111,243,0.25), rgba(0,212,255,0.15))",
            border: "1px solid rgba(29,111,243,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={26} color="#4d94ff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              {airport.iata_code && (
                <span style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, background: "rgba(29,111,243,0.2)", color: "#60a5fa", border: "1px solid rgba(29,111,243,0.3)" }}>
                  {airport.iata_code}
                </span>
              )}
              <span style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                {airport.id}
              </span>
              {airport.type && (
                <span style={{ padding: "0.2rem 0.625rem", borderRadius: "6px", fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                  {airport.type.replace("_", " ")}
                </span>
              )}
              {airport.has_sandbox && (
                <span style={{ padding: "0.2rem 0.75rem", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.25)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <Plane size={11} /> AI Sandbox
                </span>
              )}
            </div>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "0.375rem", lineHeight: 1.2 }}>
              {airport.name}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
              {[airport.city, airport.country, airport.continent].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* JFK Sandbox CTA */}
        {airport.has_sandbox && (
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", borderRadius: "10px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.2rem" }}>🤖 AI Routing Sandbox Available</p>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
                Simulate surface movements and test ML-optimized taxi routing for this airport.
              </p>
            </div>
            <Link href="/sandbox" className="btn-primary" style={{ textDecoration: "none", flexShrink: 0 }}>
              <Plane size={15} /> Launch Sandbox
            </Link>
          </div>
        )}
      </div>

      {/* Explanatory Context Banner */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "rgba(29, 111, 243, 0.05)", borderLeft: "4px solid #4d94ff" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fff" }}>Why monitor Airport-level safety data?</h3>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
          Monitoring high-density hubs gives visibility into historical safety risks and operational bottlenecks. By plotting <b>Taxi Times</b> against the global average and analyzing <b>Incursion Severities (Cat A-D)</b>, safety analysts identify poorly designed runway intersections and help allocate AI-routing resources to the airports that most desperately need surface collision prevention.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          {
            label: "Avg Taxi-Out",
            value: airport.avg_taxi_out_min != null ? `${airport.avg_taxi_out_min.toFixed(1)} min` : "N/A",
            icon: Clock, color: taxiColor,
            sub: airport.avg_taxi_out_min != null ? (airport.avg_taxi_out_min > 20 ? "Above global avg (16.4 min)" : "Below global avg") : "No BTS data",
          },
          {
            label: "Documented Incidents",
            value: airport.incursion_count.toString(),
            icon: AlertTriangle, color: airport.incursion_count >= 3 ? "#f87171" : airport.incursion_count > 0 ? "#fbbf24" : "#22c55e",
            sub: airport.incursion_count > 0 ? "Runway incursion events" : "No documented incursions",
          },
          {
            label: "Coordinates",
            value: `${airport.latitude.toFixed(4)}°, ${airport.longitude.toFixed(4)}°`,
            icon: Globe, color: "#00d4ff",
            sub: airport.elevation_ft != null ? `${airport.elevation_ft.toLocaleString()} ft elevation` : "",
          },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
              <s.icon size={16} color={s.color} />
            </div>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color, marginBottom: "0.2rem" }}>{s.value}</p>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Visual Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* Congestion Chart */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "rgba(255,255,255,0.7)" }}>
            Taxi Time vs Global Average (min)
          </h2>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={[
                { name: "Taxi-Out", local: airport.avg_taxi_out_min || 0, global: 16.4 },
                { name: "Taxi-In", local: airport.avg_taxi_in_min || 0, global: 8.2 },
              ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px", fontWeight: 600 }}
                  labelStyle={{ display: "none" }}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                />
                <Bar dataKey="local" name={`${airport.iata_code || airport.id}`} fill="#4d94ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="global" name="Global Avg" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Risk Profile */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "rgba(255,255,255,0.7)" }}>
            Incursion Risk Profile (By Severity)
          </h2>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart 
                data={[
                  { name: "Cat A", count: incursions.filter(i => i.category === "A").length },
                  { name: "Cat B", count: incursions.filter(i => i.category === "B").length },
                  { name: "Cat C", count: incursions.filter(i => i.category === "C").length },
                  { name: "Cat D", count: incursions.filter(i => i.category === "D").length },
                ]} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                />
                <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
                  {
                    [0,1,2,3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#ef4444" : index === 1 ? "#f97316" : index === 2 ? "#eab308" : "rgba(255,255,255,0.2)"} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Details + Incursions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Airport info */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building2 size={16} color="#4d94ff" /> Airport Details
          </h2>
          <InfoRow label="Full Name" value={airport.name} />
          <InfoRow label="ICAO Code" value={airport.id} />
          <InfoRow label="IATA Code" value={airport.iata_code ?? "—"} />
          <InfoRow label="Country" value={airport.country ?? "—"} />
          <InfoRow label="Region" value={airport.region ?? "—"} />
          <InfoRow label="Continent" value={airport.continent ?? "—"} />
          <InfoRow label="Type" value={airport.type?.replace(/_/g, " ") ?? "—"} />
          {airport.elevation_ft && <InfoRow label="Elevation" value={`${airport.elevation_ft.toLocaleString()} ft`} />}
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {airport.wikipedia_link && (
              <a href={airport.wikipedia_link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "#4d94ff", textDecoration: "none" }}>
                Wikipedia <ExternalLink size={11} />
              </a>
            )}
            {airport.homepage && (
              <a href={airport.homepage} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "#4d94ff", textDecoration: "none" }}>
                Official Website <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Recent incursions */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldAlert size={16} color="#f87171" /> Recent Incidents
          </h2>
          {incursions.length === 0 ? (
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>No documented runway incursions</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {incursions.map((inc) => (
                <div key={inc.id} style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    {inc.category && (
                      <span className={`badge-${inc.category}`} style={{ padding: "0.15rem 0.5rem", borderRadius: "5px", fontSize: "0.7rem", fontWeight: 700 }}>
                        Cat {inc.category}
                      </span>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>
                      {new Date(inc.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {inc.narrative && (
                    <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                      {inc.narrative.length > 160 ? inc.narrative.slice(0, 160) + "…" : inc.narrative}
                    </p>
                  )}
                  {inc.root_cause_label && (
                    <span style={{ display: "inline-block", marginTop: "0.375rem", padding: "0.15rem 0.5rem", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 600, background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                      🧠 {inc.root_cause_label}
                    </span>
                  )}
                </div>
              ))}
              <Link href={`/incursions?airport=${airport.id}`} style={{ fontSize: "0.8rem", color: "#4d94ff", textDecoration: "none", textAlign: "center", marginTop: "0.5rem" }}>
                View all incidents →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
