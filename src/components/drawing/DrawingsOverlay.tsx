// src/components/drawing/DrawingsOverlay.tsx
"use client";
// Capa SVG transparente sobre el chart. Captura clicks, dibuja primitivas,
// y se redibuja cuando el chart hace pan/zoom.

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useChartStore } from "@/lib/store/chart-store";
import { DEFAULT_FIB_LEVELS, type Point } from "@/lib/drawing/types";

type Props = {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function DrawingsOverlay({ chart, series }: Props) {
  const drawings    = useChartStore(s => s.drawings);
  const addDrawing  = useChartStore(s => s.addDrawing);
  const removeDrawing = useChartStore(s => s.removeDrawing);
  const activeTool  = useChartStore(s => s.activeTool);
  const setActiveTool = useChartStore(s => s.setActiveTool);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pendingP1, setPendingP1] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [, forceRedraw] = useState(0);

  // Redibujar cuando cambian zoom/pan
  useEffect(() => {
    const handler = () => forceRedraw(n => n + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    };
  }, [chart]);

  // Convertir tiempo+precio a coords X,Y
  const toXY = (p: Point): { x: number; y: number } | null => {
    const x = chart.timeScale().timeToCoordinate(p.time as Time);
    const y = series.priceToCoordinate(p.price);
    if (x == null || y == null) return null;
    return { x, y };
  };

  const fromXY = (clientX: number, clientY: number): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time: Number(time), price: Number(price) };
  };

  const onClick = (e: React.MouseEvent) => {
    if (activeTool === "none") return;
    const p = fromXY(e.clientX, e.clientY);
    if (!p) return;

    // Línea horizontal: un click y listo
    if (activeTool === "hline") {
      addDrawing({
        id: uid(),
        kind: "hline",
        price: p.price,
        color: "#facc15",
      });
      setActiveTool("none");
      return;
    }

    // Órdenes: un click marca entry; stop/target los pone con offset por defecto
    if (activeTool === "order-long" || activeTool === "order-short") {
      const side = activeTool === "order-long" ? "long" : "short";
      const r = 0.005; // 0.5% riesgo por defecto
      const entry = p.price;
      const stop = side === "long" ? entry * (1 - r) : entry * (1 + r);
      const target = side === "long" ? entry * (1 + r * 2) : entry * (1 - r * 2);
      addDrawing({
        id: uid(),
        kind: "order",
        side,
        entry, stop, target,
        time: p.time,
        color: side === "long" ? "#22c55e" : "#ef4444",
      });
      setActiveTool("none");
      return;
    }

    // Las demás herramientas necesitan 2 clicks
    if (!pendingP1) {
      setPendingP1(p);
      return;
    }
    const p1 = pendingP1;
    const p2 = p;
    setPendingP1(null);

    if (activeTool === "trendline") {
      addDrawing({ id: uid(), kind: "trendline", p1, p2, color: "#60a5fa" });
    } else if (activeTool === "measure") {
      addDrawing({ id: uid(), kind: "measure", p1, p2, color: "#a78bfa" });
    } else if (activeTool === "fib") {
      addDrawing({ id: uid(), kind: "fib", p1, p2, levels: DEFAULT_FIB_LEVELS, color: "#f97316" });
    }
    setActiveTool("none");
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHoverPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const pointerEvents = activeTool === "none" ? "none" : "auto";

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 h-full w-full"
      style={{ zIndex: 3, pointerEvents, cursor: activeTool !== "none" ? "crosshair" : "default" }}
      onClick={onClick}
      onMouseMove={onMouseMove}
    >
      {/* Línea preview cuando hay p1 pendiente */}
      {pendingP1 && hoverPoint && (() => {
        const a = toXY(pendingP1);
        if (!a) return null;
        return (
          <line
            x1={a.x} y1={a.y}
            x2={hoverPoint.x} y2={hoverPoint.y}
            stroke="#9ca3af" strokeDasharray="4,4" strokeWidth={1}
          />
        );
      })()}

      {drawings.map(d => {
        if (d.kind === "hline") {
          const y = series.priceToCoordinate(d.price);
          if (y == null) return null;
          return (
            <g key={d.id}>
              <line x1={0} y1={y} x2="100%" y2={y}
                stroke={d.color} strokeWidth={1} strokeDasharray="6,3" />
              <rect x={4} y={y - 9} width={60} height={16} rx={2}
                fill={d.color} opacity={0.85} />
              <text x={8} y={y + 4} fontSize="10" fill="#000" fontFamily="monospace">
                {d.price.toFixed(5)}
              </text>
              <text x={70} y={y + 4} fontSize="10" fill={d.color}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); }}>
                ✕
              </text>
            </g>
          );
        }

        if (d.kind === "trendline") {
          const a = toXY(d.p1); const b = toXY(d.p2);
          if (!a || !b) return null;
          return (
            <g key={d.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={d.color} strokeWidth={1.5} />
              <circle cx={a.x} cy={a.y} r={3} fill={d.color} />
              <circle cx={b.x} cy={b.y} r={3} fill={d.color} />
              <text x={(a.x + b.x) / 2 + 8} y={(a.y + b.y) / 2}
                fontSize="10" fill={d.color}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); }}>
                ✕
              </text>
            </g>
          );
        }

        if (d.kind === "measure") {
          const a = toXY(d.p1); const b = toXY(d.p2);
          if (!a || !b) return null;
          const dPrice = d.p2.price - d.p1.price;
          const dPct = (dPrice / d.p1.price) * 100;
          const dBars = Math.abs(d.p2.time - d.p1.time);
          const dT =
            dBars > 86400 ? `${Math.round(dBars / 86400)}d` :
            dBars > 3600  ? `${Math.round(dBars / 3600)}h`  :
                            `${Math.round(dBars / 60)}m`;
          return (
            <g key={d.id}>
              <rect
                x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
                width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
                fill={dPrice >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)"}
                stroke={d.color} strokeWidth={1} strokeDasharray="3,3"
              />
              <rect x={b.x + 4} y={b.y - 30} width={110} height={42} rx={3}
                fill="#0d1117" stroke={d.color} />
              <text x={b.x + 10} y={b.y - 18} fontSize="10" fill="#c9d1d9" fontFamily="monospace">
                Δ {dPrice.toFixed(5)} ({dPct.toFixed(2)}%)
              </text>
              <text x={b.x + 10} y={b.y - 4} fontSize="10" fill="#9ca3af" fontFamily="monospace">
                Δt {dT}
              </text>
              <text x={b.x + 100} y={b.y - 4} fontSize="10" fill={d.color}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); }}>
                ✕
              </text>
            </g>
          );
        }

        if (d.kind === "fib") {
          const a = toXY(d.p1); const b = toXY(d.p2);
          if (!a || !b) return null;
          const diffPrice = d.p2.price - d.p1.price;
          const diffY = b.y - a.y;
          const x1 = Math.min(a.x, b.x);
          const x2 = Math.max(a.x, b.x);
          return (
            <g key={d.id}>
              {d.levels.map(level => {
                const y = a.y + diffY * level;
                const priceAtLevel = d.p1.price + diffPrice * level;
                return (
                  <g key={level}>
                    <line x1={x1} y1={y} x2="100%" y2={y}
                      stroke={d.color} strokeWidth={0.7} strokeDasharray="2,2" opacity={0.75} />
                    <text x={x1 + 4} y={y - 2} fontSize="9" fill={d.color} fontFamily="monospace">
                      {(level * 100).toFixed(1)}%  {priceAtLevel.toFixed(5)}
                    </text>
                  </g>
                );
              })}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={d.color} strokeWidth={1.5} />
              <text x={b.x + 4} y={b.y} fontSize="10" fill={d.color}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); }}>
                ✕ Fib
              </text>
            </g>
          );
        }

        if (d.kind === "order") {
          const xAnchor = chart.timeScale().timeToCoordinate(d.time as Time);
          const yEntry  = series.priceToCoordinate(d.entry);
          const yStop   = series.priceToCoordinate(d.stop);
          const yTarget = series.priceToCoordinate(d.target);
          if (xAnchor == null || yEntry == null || yStop == null || yTarget == null) return null;
          const rr = Math.abs(d.target - d.entry) / Math.abs(d.entry - d.stop);
          return (
            <g key={d.id}>
              {/* Zona de profit */}
              <rect x={xAnchor} y={Math.min(yEntry, yTarget)}
                width="100%" height={Math.abs(yTarget - yEntry)}
                fill="rgba(34,197,94,0.12)" />
              {/* Zona de riesgo */}
              <rect x={xAnchor} y={Math.min(yEntry, yStop)}
                width="100%" height={Math.abs(yStop - yEntry)}
                fill="rgba(239,68,68,0.12)" />
              {/* Líneas */}
              <line x1={xAnchor} y1={yEntry} x2="100%" y2={yEntry}
                stroke={d.color} strokeWidth={1} />
              <line x1={xAnchor} y1={yTarget} x2="100%" y2={yTarget}
                stroke="#22c55e" strokeWidth={1} strokeDasharray="4,3" />
              <line x1={xAnchor} y1={yStop} x2="100%" y2={yStop}
                stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
              {/* Labels */}
              <rect x={xAnchor + 4} y={yEntry - 8} width={140} height={16} rx={2} fill={d.color} />
              <text x={xAnchor + 8} y={yEntry + 4} fontSize="10" fill="#000" fontFamily="monospace">
                {d.side.toUpperCase()} @ {d.entry.toFixed(5)} RR {rr.toFixed(2)}
              </text>
              <text x={xAnchor + 150} y={yEntry + 4} fontSize="10" fill={d.color}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); }}>
                ✕
              </text>
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}
