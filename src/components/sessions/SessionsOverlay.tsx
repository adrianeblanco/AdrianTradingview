// src/components/sessions/SessionsOverlay.tsx
"use client";
// Pinta bandas verticales para London / NY Killzone sobre el chart.
// No es nativo de lightweight-charts, así que usamos un <svg> absolute encima
// y convertimos tiempos UTC -> coordenadas X usando timeScale().timeToCoordinate().

import { useEffect, useState } from "react";
import type { IChartApi, Time } from "lightweight-charts";
import { useChartStore } from "@/lib/store/chart-store";
import { sessionRangesInWindow } from "@/lib/sessions";

type Props = {
  chart: IChartApi;
  visibleRange: { from: number; to: number };
};

export function SessionsOverlay({ chart, visibleRange }: Props) {
  const sessions = useChartStore(s => s.sessions);
  const [bands, setBands] = useState<
    Array<{ id: string; label: string; x1: number; x2: number; color: string; borderColor: string; emphasis?: boolean }>
  >([]);

  useEffect(() => {
    const compute = () => {
      const ranges = sessionRangesInWindow(visibleRange.from, visibleRange.to, sessions);
      const ts = chart.timeScale();
      const out: typeof bands = [];
      for (const r of ranges) {
        const x1 = ts.timeToCoordinate(r.from as Time);
        const x2 = ts.timeToCoordinate(r.to as Time);
        if (x1 == null || x2 == null) continue;
        out.push({
          id: `${r.session.id}-${r.from}`,
          label: r.session.label,
          x1, x2,
          color: r.session.color,
          borderColor: r.session.borderColor,
          emphasis: r.session.emphasis,
        });
      }
      setBands(out);
    };

    compute();
    const sub = chart.timeScale().subscribeVisibleLogicalRangeChange(compute);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(compute);
    };
  }, [chart, visibleRange, sessions]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 2 }}
    >
      {bands.map(b => (
        <g key={b.id}>
          <rect
            x={b.x1}
            y={0}
            width={Math.max(b.x2 - b.x1, 1)}
            height="100%"
            fill={b.color}
            stroke={b.borderColor}
            strokeWidth={b.emphasis ? 1 : 0.5}
            strokeDasharray={b.emphasis ? "0" : "3,3"}
          />
          {b.emphasis && b.x2 - b.x1 > 40 && (
            <text
              x={b.x1 + 6}
              y={14}
              fill={b.borderColor}
              fontSize="10"
              fontWeight="600"
              fontFamily="system-ui"
            >
              {b.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
