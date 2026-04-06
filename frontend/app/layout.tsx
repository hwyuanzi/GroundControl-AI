import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/app/components/ui/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GroundControl AI — Runway Safety & Taxi Optimization",
  description:
    "Global analytics platform for runway incursion reporting, airport safety intelligence, " +
    "and AI-powered taxi routing optimization. Built for aviation enthusiasts and aviation safety researchers.",
  keywords: ["runway incursion", "aviation safety", "taxi optimization", "airport analytics", "ADS-B"],
  openGraph: {
    title: "GroundControl AI",
    description: "Global Airport Safety & Intelligent Taxi Optimization",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#080c14] text-white antialiased min-h-screen">
        <Navigation />
        <main style={{ paddingTop: "96px", paddingBottom: "2rem" }}>{children}</main>
      </body>
    </html>
  );
}
