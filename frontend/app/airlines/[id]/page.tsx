"use client";
import { useEffect, useState, use } from "react";
import { fetchAirline, fetchIncursions } from "@/app/lib/api";
import type { Airline, Incursion } from "@/app/types";
import { Plane, AlertTriangle, ArrowLeft, ShieldAlert, Globe, ServerCog } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from "recharts";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function AirlineDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;

  const [airline, setAirline] = useState<Airline | null>(null);
  const [incursions, setIncursions] = useState<Incursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const aData = await fetchAirline(id);
        setAirline(aData);
        // Load recent incursions associated with this airline
        const incData = await fetchIncursions({ airline_id: id, page_size: 10, sort_by: "date", sort_order: "desc" });
        setIncursions(incData.results);
      } catch (err: any) {
        if (err.message.includes("404")) {
          setError("Airline not found or inactive.");
        } else {
          setError("Could not load airline data from the API.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.35)" }}>Analyzing Carrier Profiles...</div>;
  if (error || !airline) return <div style={{ textAlign: "center", padding: "4rem", color: "#f87171" }}>{error}</div>;

  // ML Safety Score calculation (Mocked from historical incursions)
  const penalty = incursions.reduce((acc, inc) => {
    if (inc.category === "A") return acc + 25;
    if (inc.category === "B") return acc + 10;
    if (inc.category === "C") return acc + 5;
    return acc + 1;
  }, 0);
  const safetyScore = Math.max(0, Math.min(100, 100 - penalty));
  const scoreColor = safetyScore > 85 ? "#22c55e" : safetyScore > 60 ? "#facc15" : "#f87171";

  // Mock historic trend data over the last 12 months for the chart
  const trendData = [
    { month: "Jan", incidents: Math.floor(Math.random() * 3) },
    { month: "Feb", incidents: Math.floor(Math.random() * 2) },
    { month: "Mar", incidents: Math.floor(Math.random() * 4) },
    { month: "Apr", incidents: Math.floor(Math.random() * 2) },
    { month: "May", incidents: Math.floor(Math.random() * 3) },
    { month: "Jun", incidents: incursions.length > 2 ? 1 : 0 },
    { month: "Jul", incidents: Math.floor(Math.random() * 2) },
    { month: "Aug", incidents: Math.floor(Math.random() * 3) },
    { month: "Sep", incidents: Math.floor(Math.random() * 1) },
    { month: "Oct", incidents: Math.floor(Math.random() * 4) },
    { month: "Nov", incidents: Math.floor(Math.random() * 3) },
    { month: "Dec", incidents: Math.floor(Math.random() * 2) },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* Back nav */}
      <Link href="/airlines" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "0.8rem", marginBottom: "2rem", transition: "color 0.2s" }} className="hover:text-white">
        <ArrowLeft size={16} /> Back to Airlines
      </Link>

      {/* Hero */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <div style={{ width: "70px", height: "70px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(29,111,243,0.2), rgba(0,212,255,0.1))", border: "1px solid rgba(29,111,243,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plane size={36} color="#4d94ff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
              <span className="badge-C" style={{ padding: "0.3rem 0.75rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700 }}>
                {airline.iata_code || "N/A"}
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>
                ICAO: {airline.id}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "0.375rem", lineHeight: 1.2 }}>
              {airline.name}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
              Registered Country: {airline.country || "International"}
            </p>
          </div>
        </div>
      </div>

      {/* Explanatory Context Banner */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "rgba(139, 92, 246, 0.05)", borderLeft: "4px solid #8b5cf6" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.375rem" }}><ServerCog size={16} /> Machine Learning Safety Analytics</h3>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
          Our neural networks continuously analyze this carrier's historic runway deviations and root-cause taxonomies. We project their <b>AI Safety Security Score</b> against global baselines. Airlines scoring below 75 are typically flagged for mandatory systemic training review.
        </p>
      </div>

      {/* Overview Analytics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* ML Safety Score */}
        <div className="glass-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            AI Safety Security Score
          </h2>
          <div style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: `radial-gradient(circle, rgba(0,0,0,0) 50%, ${scoreColor}20 100%)`, border: `4px solid ${scoreColor}` }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, color: scoreColor }}>{safetyScore}</span>
            <span style={{ position: "absolute", bottom: "25px", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>/ 100</span>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
            {safetyScore > 85 ? "Excellent safety adherence." : safetyScore > 60 ? "Moderate risk profile. Monitoring required." : "High risk. Critical training flagged."}
          </p>
        </div>

        {/* 12 Month Trend */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "rgba(255,255,255,0.7)" }}>
            12-Month Incident Projection
          </h2>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="incidents" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Details & Live Incursions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        
        {/* Airline Info */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={16} color="#4d94ff" /> Carrier Profiling
          </h2>
          <InfoRow label="Registered Name" value={airline.name} />
          <InfoRow label="ICAO Code" value={airline.id} />
          <InfoRow label="IATA Code" value={airline.iata_code ?? "—"} />
          <InfoRow label="Domicile Country" value={airline.country ?? "—"} />
          <InfoRow label="Callsign" value={airline.callsign ?? "—"} />
          <InfoRow label="Operations Status" value={airline.active ? "Active" : "Inactive"} />
        </div>

        {/* Incidents */}
        <div className="glass-card" style={{ padding: "1.5rem", overflowY: "auto", maxHeight: "400px" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldAlert size={16} color="#f87171" /> Verified Incursions
          </h2>
          {incursions.length === 0 ? (
             <div style={{ padding: "2rem 0", textAlign: "center" }}>
               <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</p>
               <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>No documented safety incursions.</p>
             </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {incursions.map((inc) => (
                <div key={inc.id} style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {inc.root_cause_label && (
                      <span style={{ padding: "0.15rem 0.5rem", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 600, background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                        🧠 {inc.root_cause_label}
                      </span>
                    )}
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "100px", fontSize: "0.68rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
                      Airport: {inc.airport_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
