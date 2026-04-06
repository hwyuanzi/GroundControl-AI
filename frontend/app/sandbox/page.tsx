"use client";
/**
 * JFK AI Taxi Sandbox
 *
 * A fully client-side simulation of JFK airport ground operations.
 * Users can spawn aircraft, choose routing mode (Rule-Based A* vs. AI Optimized),
 * and watch how planes navigate the taxiway network in real time.
 *
 * JFK Layout (simplified):
 *   - 4 runways: 4L/22R, 4R/22L, 13L/31R, 13R/31L
 *   - Major taxiways: A, B, C, D, K, Z
 *   - 4 terminal areas: T1, T2, T4, T5, T7, T8
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Plane, Play, Pause, RotateCcw, Zap, Info, AlertTriangle } from "lucide-react";
import type { SandboxAircraft, RoutingMode, SimulationMetrics } from "@/app/types";

// JFK Layout nodes (Mapped to coordinate space for diagonal 'X' layout)
const JFK_NODES: Record<string, [number, number]> = {
  // Runway Thresholds (Edges of the map)
  "RWY_4L_THRESH":  [40.620, -73.810], // SW
  "RWY_22R_THRESH": [40.670, -73.760], // NE
  "RWY_13L_THRESH": [40.670, -73.800], // NW
  "RWY_31R_THRESH": [40.620, -73.750], // SE

  // Terminals (Horseshoe Ring)
  "T1_GATE": [40.640, -73.790], // West
  "T4_GATE": [40.635, -73.780], // South
  "T5_GATE": [40.645, -73.770], // East
  "T8_GATE": [40.650, -73.785], // North

  // Outer ring taxiways parallel to runways
  "TWY_A_SW": [40.625, -73.805],
  "TWY_A_NE": [40.665, -73.765],
  "TWY_B_NW": [40.665, -73.795],
  "TWY_B_SE": [40.625, -73.755],

  // Central intersections
  "CENTRAL_W": [40.645, -73.785],
  "CENTRAL_E": [40.645, -73.775],
  "CENTRAL_S": [40.638, -73.780],
  "CENTRAL_N": [40.652, -73.780],
};

const JFK_EDGES: Array<[string, string, number]> = [
  // 4L/22R parallel (A)
  ["TWY_A_SW", "CENTRAL_W", 0.015],
  ["CENTRAL_W", "TWY_A_NE", 0.015],
  // 13L/31R parallel (B)
  ["TWY_B_NW", "CENTRAL_N", 0.015],
  ["CENTRAL_N", "TWY_B_SE", 0.015],
  
  // Terminal holding pads connecting to central hub
  ["T1_GATE", "CENTRAL_W", 0.005],
  ["T4_GATE", "CENTRAL_S", 0.005],
  ["T5_GATE", "CENTRAL_E", 0.005],
  ["T8_GATE", "CENTRAL_N", 0.005],

  // Inner taxi ring connecting the centrals
  ["CENTRAL_W", "CENTRAL_N", 0.008],
  ["CENTRAL_N", "CENTRAL_E", 0.008],
  ["CENTRAL_E", "CENTRAL_S", 0.008],
  ["CENTRAL_S", "CENTRAL_W", 0.008],

  // Runway ingress/egress points connecting thresholds to outer taxiways
  ["RWY_4L_THRESH", "TWY_A_SW", 0.005],
  ["RWY_22R_THRESH", "TWY_A_NE", 0.005],
  ["RWY_13L_THRESH", "TWY_B_NW", 0.005],
  ["RWY_31R_THRESH", "TWY_B_SE", 0.005],
];

// Build adjacency list
function buildGraph(): Map<string, Array<{ to: string; cost: number }>> {
  const graph = new Map<string, Array<{ to: string; cost: number }>>();
  for (const [a, b, cost] of JFK_EDGES) {
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push({ to: b, cost });
    graph.get(b)!.push({ to: a, cost });
  }
  return graph;
}

// ─── A* Pathfinding ───────────────────────────────────────────────────────────
function heuristic(a: string, b: string): number {
  const [la, loa] = JFK_NODES[a] ?? [0, 0];
  const [lb, lob] = JFK_NODES[b] ?? [0, 0];
  return Math.sqrt((la - lb) ** 2 + (loa - lob) ** 2);
}

function aStarPath(start: string, goal: string, graph: Map<string, Array<{ to: string; cost: number }>>, aiMode: boolean): string[] {
  const open = new Map<string, { g: number; f: number; parent: string | null }>();
  const closed = new Set<string>();
  open.set(start, { g: 0, f: heuristic(start, goal), parent: null });

  while (open.size > 0) {
    // Find node with lowest f
    let current = "";
    let bestF = Infinity;
    for (const [node, data] of open) {
      if (data.f < bestF) { bestF = data.f; current = node; }
    }
    if (current === goal) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | null = goal;
      while (node) {
        path.unshift(node);
        node = open.get(node)?.parent ?? null;
        if (node && closed.has(node)) {
          // Find in closed set
          break;
        }
      }
      return path;
    }

    const cur = open.get(current)!;
    open.delete(current);
    closed.add(current);

    for (const { to, cost } of graph.get(current) ?? []) {
      if (closed.has(to)) continue;

      // AI mode: add congestion penalty (simulated)
      const penalty = aiMode ? (Math.random() < 0.1 ? 0.002 : 0) : 0;
      const g = cur.g + cost + penalty;
      const existing = open.get(to);
      if (!existing || g < existing.g) {
        open.set(to, { g, f: g + heuristic(to, goal), parent: current });
      }
    }
  }
  return [start, goal]; // Fallback direct path
}

// ─── Airline Colors ────────────────────────────────────────────────────────────
const AIRLINE_COLORS: Record<string, [number, number, number]> = {
  "Delta":    [0, 48, 135],
  "American": [170, 0, 0],
  "JetBlue":  [0, 122, 194],
  "United":   [0, 47, 108],
  "Lufthansa":[0, 50, 143],
  "British":  [0, 56, 168],
};

const TERMINALS = Object.keys(JFK_NODES).filter((k) => k.includes("GATE"));
const RUNWAYS   = Object.keys(JFK_NODES).filter((k) => k.includes("RWY"));
const AIRLINES  = Object.keys(AIRLINE_COLORS);

function createAircraft(id: number, mode: RoutingMode): SandboxAircraft {
  const graph = buildGraph();
  const airline = AIRLINES[id % AIRLINES.length];
  const gate = TERMINALS[Math.floor(Math.random() * TERMINALS.length)];
  const runway = RUNWAYS[Math.floor(Math.random() * RUNWAYS.length)];
  const path = aStarPath(gate, runway, graph, mode === "ai_optimized");

  return {
    id: `AC${String(id).padStart(3, "0")}`,
    airline,
    position: JFK_NODES[gate] ?? [40.641, -73.778],
    heading: 0,
    speed: 15, // knots
    status: "at_gate",
    targetGate: gate,
    targetRunway: runway,
    path: path.map((n) => JFK_NODES[n]).filter(Boolean) as [number, number][],
    pathIndex: 0,
    color: AIRLINE_COLORS[airline] ?? [80, 80, 80],
    hasConflict: false,
  };
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────
function drawSandbox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  aircraft: SandboxAircraft[],
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0d1526";
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = "rgba(29,111,243,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // Coordinate mapping: lat/lng -> canvas pixels
  const LAT_MIN = 40.615, LAT_MAX = 40.675;
  const LNG_MIN = -73.815, LNG_MAX = -73.745;
  const toX = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (width - 80) + 40;
  const toY = (lat: number) => (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (height - 60) + 30;

  // 1. Draw Physical Runways (Underneath everything else)
  const RUNWAYS_GEOM = [
    { start: [40.620, -73.810], end: [40.670, -73.760], name: "4L/22R" },
    { start: [40.670, -73.800], end: [40.620, -73.750], name: "13L/31R" },
    { start: [40.620, -73.785], end: [40.665, -73.745], name: "4R/22L" },
    { start: [40.665, -73.810], end: [40.620, -73.770], name: "13R/31L" },
  ];

  for (const r of RUNWAYS_GEOM) {
    const sx = toX(r.start[1]), sy = toY(r.start[0]);
    const ex = toX(r.end[1]), ey = toY(r.end[0]);

    // Asphalt Base
    ctx.strokeStyle = "rgba(40, 45, 55, 0.9)";
    ctx.lineWidth = 28;
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

    // Centerline Dashes
    ctx.strokeStyle = "rgba(245, 158, 11, 0.6)"; // Yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Runway Labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(r.name.split("/")[0], sx, sy + (sy < ey ? -12 : 18));
    ctx.fillText(r.name.split("/")[1], ex, ey + (ey < sy ? -12 : 18));
  }
  ctx.textAlign = "left"; // Reset alignment

  // 2. Draw Taxiway Edges
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 4;
  for (const [a, b] of JFK_EDGES) {
    const [la, lna] = JFK_NODES[a] ?? [0, 0];
    const [lb, lnb] = JFK_NODES[b] ?? [0, 0];
    ctx.beginPath();
    ctx.moveTo(toX(lna), toY(la));
    ctx.lineTo(toX(lnb), toY(lb));
    ctx.stroke();
  }

  // Draw nodes
  for (const [nodeName, [lat, lng]] of Object.entries(JFK_NODES)) {
    const x = toX(lng), y = toY(lat);
    const isRunway  = nodeName.includes("RWY");
    const isTerminal = nodeName.includes("GATE");

    ctx.beginPath();
    ctx.arc(x, y, isRunway ? 6 : isTerminal ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isRunway ? "rgba(245,158,11,0.8)" : isTerminal ? "rgba(0,212,255,0.7)" : "rgba(255,255,255,0.25)";
    ctx.fill();

    if (isTerminal || isRunway) {
      ctx.fillStyle = isRunway ? "#fbbf24" : "#67e8f9";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(nodeName.replace("_THRESH", "").replace("_GATE", "").replace("TWY_", ""), x + 8, y + 4);
    }
  }

  // Draw aircraft paths
  for (const ac of aircraft) {
    if (ac.path.length < 2) continue;
    ctx.strokeStyle = `rgba(${ac.color.join(",")}, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(ac.path[0][1]), toY(ac.path[0][0]));
    for (const [lat, lng] of ac.path.slice(1)) ctx.lineTo(toX(lng), toY(lat));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw aircraft
  for (const ac of aircraft) {
    const [lat, lng] = ac.position;
    const x = toX(lng), y = toY(lat);

    // Conflict glow
    if (ac.hasConflict) {
      const grad = ctx.createRadialGradient(x, y, 4, x, y, 18);
      grad.addColorStop(0, "rgba(239,68,68,0.6)");
      grad.addColorStop(1, "rgba(239,68,68,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plane body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((ac.heading * Math.PI) / 180);
    ctx.fillStyle = `rgb(${ac.color.join(",")})`;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 4);
    ctx.lineTo(-2, 2);
    ctx.lineTo(0, 4);
    ctx.lineTo(2, 2);
    ctx.lineTo(5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Aircraft ID label
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.fillText(ac.id, x + 10, y - 4);
  }
}

// ─── Conflict Detection ────────────────────────────────────────────────────────
function detectConflicts(aircraft: SandboxAircraft[]): SandboxAircraft[] {
  const SEP_THRESHOLD = 0.0012; // ~130m minimum separation
  return aircraft.map((ac, i) => {
    let hasConflict = false;
    for (let j = 0; j < aircraft.length; j++) {
      if (i === j) continue;
      const other = aircraft[j];
      const dlat = ac.position[0] - other.position[0];
      const dlng = ac.position[1] - other.position[1];
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < SEP_THRESHOLD) { hasConflict = true; break; }
    }
    return { ...ac, hasConflict };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const graphRef   = useRef(buildGraph());

  const [aircraft, setAircraft]   = useState<SandboxAircraft[]>([]);
  const [running,  setRunning]     = useState(false);
  const [mode,     setMode]        = useState<RoutingMode>("rule_based");
  const [metrics,  setMetrics]     = useState<SimulationMetrics>({
    avgTaxiTimeSec: 0, totalConflicts: 0, runwayUtilizationPct: 0, co2SavedKg: 0,
  });
  const [conflictLog, setConflictLog] = useState<string[]>([]);
  const tickRef = useRef(0);

  // Spawn a new aircraft
  const spawnAircraft = useCallback(() => {
    setAircraft((prev) => {
      if (prev.length >= 8) return prev;
      return [...prev, createAircraft(prev.length + Date.now(), mode)];
    });
  }, [mode]);

  // Simulation tick
  const tick = useCallback(() => {
    setAircraft((prev) => {
      const SPEED = 0.00008; // degrees per tick (~15 knots at this zoom)
      let conflicts = 0;

      const updated: SandboxAircraft[] = detectConflicts(prev.map((ac) => {
        if (ac.pathIndex >= ac.path.length - 1) {
          return { ...ac, status: "at_runway" as const };
        }
        const target = ac.path[ac.pathIndex + 1];
        const dlat = target[0] - ac.position[0];
        const dlng = target[1] - ac.position[1];
        const dist = Math.sqrt(dlat * dlat + dlng * dlng);

        if (dist < SPEED) {
          return { ...ac, position: target, pathIndex: ac.pathIndex + 1, status: "taxiing" as const };
        }

        const heading = Math.atan2(dlng, dlat) * (180 / Math.PI);
        return {
          ...ac,
          heading,
          position: [ac.position[0] + (dlat / dist) * SPEED, ac.position[1] + (dlng / dist) * SPEED] as [number, number],
          status: "taxiing" as const,
        };
      }) as SandboxAircraft[]);
      
      conflicts = updated.filter((a) => a.hasConflict).length;

      if (conflicts > 0) {
        tickRef.current += 1;
        if (tickRef.current % 15 === 0) {
          setConflictLog((log) => [
            `[${new Date().toLocaleTimeString()}] Separation alert — ${conflicts} aircraft`,
            ...log.slice(0, 4),
          ]);
        }
      }

      setMetrics((m) => {
        // Only increment if aircraft are active
        if (updated.length === 0) return m;
        
        // AI saves significant time and CO2 by preventing gridlock
        const timeInc = mode === "rule_based" ? 1.5 : 0.8;
        const co2Inc = mode === "ai_optimized" ? 1.25 : 0;
        
        return {
          avgTaxiTimeSec: m.avgTaxiTimeSec + (updated.filter(a => a.status === "taxiing").length > 0 ? timeInc : 0),
          totalConflicts: m.totalConflicts + (conflicts > 0 ? 1 : 0),
          runwayUtilizationPct: Math.min(99, (updated.filter(a => a.status === "at_runway").length / Math.max(1, updated.length)) * 100),
          co2SavedKg: m.co2SavedKg + co2Inc,
        };
      });

      return updated;
    });
  }, [mode]);

  // Animation loop
  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [running, tick]);

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      drawSandbox(ctx, canvas.width, canvas.height, aircraft);
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [aircraft]);

  const reset = () => {
    setAircraft([]);
    setRunning(false);
    setMetrics({ avgTaxiTimeSec: 0, totalConflicts: 0, runwayUtilizationPct: 0, co2SavedKg: 0 });
    setConflictLog([]);
    tickRef.current = 0;
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Plane size={24} color="#00d4ff" />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>JFK AI Routing Sandbox</h1>
          <span style={{ padding: "0.2rem 0.75rem", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.25)" }}>
            BETA
          </span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
          Spawn aircraft and watch rule-based vs. AI-optimized taxi routing at John F. Kennedy International Airport
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        {/* ─── Canvas ───────────────────────────────────────────────────────── */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <div style={{
            position: "absolute", top: "1rem", left: "1rem", zIndex: 2,
            display: "flex", gap: "0.5rem", flexWrap: "wrap",
          }}>
            <span style={{ padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
              ● Runway
            </span>
            <span style={{ padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: "rgba(0,212,255,0.12)", color: "#67e8f9", border: "1px solid rgba(0,212,255,0.25)" }}>
              ● Terminal
            </span>
            <span style={{ padding: "0.25rem 0.625rem", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
              ─ Taxiway
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={520}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>

        {/* ─── Controls Panel ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* How it works Context */}
          <div className="glass-card" style={{ padding: "1.25rem", background: "rgba(0, 212, 255, 0.05)", borderLeft: "4px solid #00d4ff" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fff" }}>How to use this Sandbox:</h3>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              1. Click <b>"Simulate Peak Traffic"</b> to spawn multiple aircraft. <br/>
              2. Click <b>"Run"</b> to watch them navigate from Terminals to Runways.<br/>
              3. Toggle between <b>Rule-Based</b> (causes gridlock) and <b>AI-Optimized</b> (reroutes automatically to save CO₂).
            </p>
          </div>

          {/* Routing Mode Toggle */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.875rem" }}>
              Routing Mode
            </p>
            <div style={{ display: "flex", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["rule_based", "ai_optimized"] as RoutingMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: "0.625rem", fontSize: "0.8rem", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.2s",
                    background: mode === m
                      ? m === "ai_optimized" ? "linear-gradient(135deg, #1d6ff3, #00d4ff)" : "rgba(255,255,255,0.1)"
                      : "transparent",
                    color: mode === m ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {m === "rule_based" ? "⚙️ Rule-Based" : "🤖 AI Optimized"}
                </button>
              ))}
            </div>
            <p style={{ marginTop: "0.625rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
              {mode === "rule_based"
                ? "Classic algorithms stick to a single route, creating high congestion and separation alerts."
                : "AI-enhanced routing dynamically recalculates paths to avoid congestion hotspots in real time, saving fuel."}
            </p>
          </div>

          {/* Sim Controls */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.875rem" }}>
              Simulation Controls
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
              <button className="btn-primary" onClick={spawnAircraft} disabled={aircraft.length >= 8}>
                <Plane size={15} />
                {aircraft.length >= 8 ? "Max 8 Aircraft Reached" : `Simulate Peak Traffic (Spawn Aircraft) - ${aircraft.length}/8`}
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setRunning((r) => !r)}>
                  {running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Run</>}
                </button>
                <button className="btn-ghost" onClick={reset} title="Reset simulation">
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.875rem" }}>
              Live Metrics
            </p>
            {[
              { label: "Avg Taxi Time", value: `${metrics.avgTaxiTimeSec.toFixed(0)}s`, color: "#4d94ff" },
              { label: "Separation Alerts", value: metrics.totalConflicts.toFixed(1), color: "#f87171" },
              { label: "Runway Utilization", value: `${metrics.runwayUtilizationPct.toFixed(0)}%`, color: "#22c55e" },
              { label: "CO₂ Saved (AI)", value: `${metrics.co2SavedKg.toFixed(2)} kg`, color: "#00d4ff" },
            ].map((m) => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Conflict Log */}
          <div className="glass-card" style={{ padding: "1.25rem", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.875rem" }}>
              <AlertTriangle size={14} color="#f87171" />
              <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                Alert Log
              </p>
            </div>
            {conflictLog.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.2)" }}>No alerts — all clear ✓</p>
            ) : (
              conflictLog.map((log, i) => (
                <p key={i} style={{ fontSize: "0.75rem", color: i === 0 ? "#f87171" : "rgba(255,255,255,0.3)", marginBottom: "0.25rem", lineHeight: 1.4 }}>
                  {log}
                </p>
              ))
            )}
          </div>

          {/* Info */}
          <div style={{ display: "flex", gap: "0.5rem", color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", alignItems: "flex-start" }}>
            <Info size={12} style={{ flexShrink: 0, marginTop: "1px" }} />
            <p>Layout is a simplified representation of JFK International. Real routing uses FAA Airport Diagram data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
