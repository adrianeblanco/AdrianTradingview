// src/lib/hooks/useCandleCountdown.ts
"use client";
// Cuenta regresiva hasta el próximo cierre de vela basado en el timeframe.
// Actualiza cada segundo.

import { useEffect, useState } from "react";

export function useCandleCountdown(tfSeconds: number) {
  const [remaining, setRemaining] = useState(() => calc(tfSeconds));

  useEffect(() => {
    setRemaining(calc(tfSeconds));
    const id = setInterval(() => setRemaining(calc(tfSeconds)), 1000);
    return () => clearInterval(id);
  }, [tfSeconds]);

  return remaining;
}

function calc(tfSeconds: number): number {
  if (tfSeconds <= 0) return 0;
  const now = Math.floor(Date.now() / 1000);
  const nextClose = Math.ceil(now / tfSeconds) * tfSeconds;
  return Math.max(0, nextClose - now);
}

export function formatCountdown(secs: number): string {
  if (secs >= 86400) {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    return `${d}d ${h}h`;
  }
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
