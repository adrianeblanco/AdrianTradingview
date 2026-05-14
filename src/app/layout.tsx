// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdrianTV — Forex, Metales, Futuros",
  description: "TradingView gratis adaptado para forex, metales y futuros con killzones de London/NY",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-zinc-950 antialiased">{children}</body>
    </html>
  );
}
