import { fetchGlobalStats } from "@/app/lib/api";
import { AlertTriangle, Plane, Building2, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { Airport } from "@/app/types";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay: string;
}) {
  return (
    <div className={`stat-card fade-in-up`} style={{ animationDelay: delay }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div className="stat-value gradient-text">{value}</div>
      {sub && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
    </div>
  );
}

function SeverityBadge({ cat }: { cat: string }) {
  return (
    <span className={`badge-${cat}`} style={{ padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
      Cat {cat}
    </span>
  );
}

function DangerAirportRow({ airport, rank }: { airport: Airport; rank: number }) {
  return (
    <Link href={`/airports/${airport.id}`} style={{ textDecoration: "none" }}>
      <div
        className="hover:bg-[rgba(29,111,243,0.07)] hover:border-[rgba(29,111,243,0.2)]"
        style={{
          display: "flex", alignItems: "center", gap: "0.875rem",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          border: "1px solid transparent",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
      >
        <span style={{
          width: "28px", height: "28px", borderRadius: "8px",
          background: rank <= 2 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
          color: rank <= 2 ? "#f87171" : "rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
        }}>
          {rank}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {airport.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            {airport.iata_code} · {airport.city}, {airport.country}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontWeight: 700, color: "#f87171" }}>{airport.incursion_count}</p>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>events</p>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let stats = null;
  try {
    stats = await fetchGlobalStats();
  } catch {
    // API not running yet — show placeholder UI
  }

  const totalAirports = stats?.total_airports ?? 7000;
  const totalAirlines = stats?.total_airlines ?? 800;
  const totalIncursions = stats?.total_incursions ?? 1200;
  const avgTaxi = stats?.avg_global_taxi_out_min ?? 16.4;
  const catAB = stats?.category_a_b_count ?? 47;
  const topAirports = stats?.top_danger_airports ?? [];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ─── Hero Section ──────────────────────────────────────────────────────── */}
      <section
        className="grid-bg"
        style={{
          position: "relative",
          padding: "6rem 2rem 4rem",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "10%", left: "20%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,111,243,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "15%",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Alert Banner */}
          <div className="fade-in-up" style={{
            display: "inline-flex", alignItems: "center", gap: "0.625rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "100px", padding: "0.375rem 1rem 0.375rem 0.625rem",
            fontSize: "0.8rem", color: "#fca5a5", marginBottom: "1.75rem",
          }}>
            <AlertTriangle size={14} />
            Runway incursions are a critical global aviation safety issue
          </div>

          <h1 className="fade-in-up fade-in-up-delay-1" style={{
            fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            marginBottom: "1.25rem",
          }}>
            Ground Operations{" "}
            <span className="gradient-text">Intelligence</span>
            <br />for the Modern Era
          </h1>

          <p className="fade-in-up fade-in-up-delay-2" style={{
            fontSize: "1.125rem",
            color: "rgba(255,255,255,0.6)",
            maxWidth: "620px",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}>
            Explore global runway incursion data, analyze taxi time inefficiencies, and
            experience AI-powered surface routing in our interactive JFK sandbox.
          </p>

          <div className="fade-in-up fade-in-up-delay-3" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/airports" className="btn-primary" style={{ textDecoration: "none" }}>
              <Building2 size={16} />
              Explore Airports
            </Link>
            <Link href="/sandbox" className="btn-ghost" style={{ textDecoration: "none" }}>
              <Plane size={16} />
              Launch JFK Sandbox
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Guide / How to Use ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div className="glass-card" style={{ padding: "2rem", marginBottom: "1rem", background: "linear-gradient(135deg, rgba(29, 111, 243, 0.08), rgba(0, 0, 0, 0))", border: "1px solid rgba(29, 111, 243, 0.2)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plane color="#4d94ff" size={20} /> Quick Start Guide
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>1. Explore Airports 🏢</h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                Navigate to <b>Airports</b> in the top menu to search over 47,000 global commercial airports. View detailed historical runway incursion records and live congestion analytics for each facility.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>2. Search Incursions 🚨</h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                The <b>Incursions</b> page processes raw FAA accident narratives using NLP. Quickly filter through hundreds of ground incidents caused by Pilot Deviations or ATC Communication Errors.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>3. AI Sandbox 🤖</h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                Launch the <b>AI Sandbox</b> for JFK airport. Spawn dozens of aircraft and compare how our Dynamic Routing AI resolves ground conflicts better than static rule-based graph pathfinding!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "3rem",
        }}>
          <StatCard label="Airports Tracked" value={totalAirports.toLocaleString()} icon={Building2} color="#4d94ff" delay="0s" sub="Worldwide commercial airports" />
          <StatCard label="Airlines Indexed" value={totalAirlines.toLocaleString()} icon={Plane} color="#00d4ff" delay="0.05s" sub="Active carriers globally" />
          <StatCard label="Incursion Events" value={totalIncursions.toLocaleString()} icon={AlertTriangle} color="#f59e0b" delay="0.1s" sub="Documented since 2010" />
          <StatCard label="Avg Taxi-Out Time" value={`${avgTaxi.toFixed(1)} min`} icon={Clock} color="#8b5cf6" delay="0.15s" sub="Global commercial average" />
          <StatCard label="Cat A / B Events" value={catAB.toString()} icon={ShieldAlert} color="#ef4444" delay="0.2s" sub="Near-collision severity" />
        </div>

        {/* ─── Bottom Cards ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Top danger airports */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <ShieldAlert size={18} color="#f87171" />
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Most Incidents by Airport</h2>
            </div>
            {topAirports.length > 0
              ? topAirports.map((ap, i) => <DangerAirportRow key={ap.id} airport={ap} rank={i + 1} />)
              : (
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>
                  Connect the backend API to see live data.
                </p>
              )
            }
          </div>

          {/* Quick links / features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { href: "/incursions", label: "Runway Incursion Database", desc: "Filter by airport, airline, severity, date range, and root cause. Explore every documented event.", icon: AlertTriangle, color: "#ef4444" },
              { href: "/airports", label: "Global Airport Explorer", desc: "Sort and filter 7,000+ airports worldwide. View taxi times, safety metrics, and location.", icon: Building2, color: "#4d94ff" },
              { href: "/sandbox", label: "JFK AI Routing Sandbox", desc: "Spawn aircraft and watch the AI route them safely. Compare AI vs rule-based efficiency.", icon: Plane, color: "#00d4ff" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div className="glass-card-hover" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <item.icon size={18} color={item.color} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{item.label}</p>
                      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
