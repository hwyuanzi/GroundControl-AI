"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane } from "lucide-react";

const navItems = [
  { href: "/",           label: "Overview" },
  { href: "/airports",   label: "Airports" },
  { href: "/airlines",   label: "Airlines" },
  { href: "/incursions", label: "Incursions" },
  { href: "/sandbox",    label: "AI Sandbox" },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 2rem",
        background: "rgba(8, 12, 20, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.625rem", marginRight: "2.5rem" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, #1d6ff3, #00d4ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Plane size={18} color="white" />
        </div>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
          GroundControl<span style={{ color: "#4d94ff" }}>AI</span>
        </span>
      </Link>

      {/* Nav Links */}
      <nav style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "white" : "rgba(255,255,255,0.55)",
                background: isActive ? "rgba(29,111,243,0.2)" : "transparent",
                border: isActive ? "1px solid rgba(29,111,243,0.35)" : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        fontSize: "0.75rem", color: "rgba(255,255,255,0.4)",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 8px #22c55e",
        }} />
        Live Data
      </div>
    </header>
  );
}
