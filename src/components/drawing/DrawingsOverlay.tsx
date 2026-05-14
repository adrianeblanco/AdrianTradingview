// src/components/drawing/DrawingsOverlay.tsx
"use client";
// Capa SVG sobre el chart. Maneja:
//  - Dibujar nuevos (modo activeTool)
//  - Seleccionar dibujos existentes (click sobre ellos)
//  - Arrastrar handles y cuerpos
//  - Hotkeys: Ctrl (snap a high/low), Shift (línea horizontal)

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useChartStore } from "@/lib/store/chart-store";
import {
  DEFAULT_FIB_LEVELS, dashArray, type Drawing, type Point,
} from "@/lib/drawing/types";
import type { Candle } from "@/lib/data/types";
import { hitTest, type Handle, type ToXY } from "@/lib/drawing/hit-detection";
import { moveBody, moveHandle } from "@/lib/drawing/mutations";
import { snapToHighLow } from "@/lib/drawing/snap";
import { FloatingToolbar } from "./FloatingToolbar";

type Props = {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  candles: Candle[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Tipo del estado interno mientras el usuario arrastra
type DragState =
  | { mode: "none" }
  | { mode: "handle"; drawingId: string; handle: Handle }
  | { mode: "body"; drawingId: string; startTime: number; startPrice: number };

// Mientras dibujás (no es lo mismo que arrastrar uno existente)
type DrawingInProgress = { p1: Point };

export function DrawingsOverlay({ chart, series, candles }: Props) {
  const drawings        = useChartStore(s => s.drawings);
  const addDrawing      = useChartStore(s => s.addDrawing);
  const replaceDrawing  = useChartStore(s => s.replaceDrawing);
  const removeDrawing   = useChartStore(s => s.removeDrawing);
  const activeTool      = useChartStore(s => s.activeTool);
  const setActiveTool   = useChartStore(s => s.setActiveTool);
  const selectedId      = useChartStore(s => s.selectedDrawingId);
  const setSelectedId   = useChartStore(s => s.setSelectedDrawingId);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [chartSize, setChartSize] = useState({ w: 0, h: 0 });
  const [pending, setPending] = useState<DrawingInProgress | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState>({ mode: "none" });
  const [keys, setKeys] = useState({ ctrl: false, shift: false });

  // Forzar redibujo cuando cambia pan/zoom
  const [, tick] = useState(0);
  useEffect(() => {
    const handler = () => tick(n => n + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
  }, [chart]);

  // Mantener tamaño del SVG sincronizado con el contenedor
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setChartSize({ w: r.width, h: r.height });
    });
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  // Hotkeys globales: Ctrl y Shift
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      setKeys(k => ({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey }));
      if (e.key === "Escape") {
        setActiveTool("none");
        setPending(null);
        setSelectedId(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          removeDrawing(selectedId);
          setSelectedId(null);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      setKeys({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [selectedId, removeDrawing, setSelectedId, setActiveTool]);

  // Helpers de conversión
  const toXY: ToXY = (time, price) => {
    const x = chart.timeScale().timeToCoordinate(time as Time);
    const y = series.priceToCoordinate(price);
    if (x == null || y == null) return null;
    return { x, y };
  };

  const fromXY = (px: number, py: number): Point | null => {
    const time = chart.timeScale().coordinateToTime(px);
    const price = series.coordinateToPrice(py);
    if (time == null || price == null) return null;
    return { time: Number(time), price: Number(price) };
  };

  const getLocalXY = (clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const r = svgRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // Aplica modificadores Ctrl/Shift al punto en construcción
  const applyModifiers = (raw: Point, anchor: Point | null): Point => {
    let p = raw;
    if (keys.ctrl) {
      const snap = snapToHighLow(raw, candles);
      if (snap) p = snap.point;
    }
    if (keys.shift && anchor) {
      // Forzar línea horizontal: mismo precio que el anchor
      p = { time: p.time, price: anchor.price };
    }
    return p;
  };

  // ---------- MOUSE EVENTS ----------

  const onMouseDown = (e: React.MouseEvent) => {
    const local = getLocalXY(e.clientX, e.clientY);
    if (!local) return;

    // 1) Si hay tool activa, NO selecciono ni arrastro, estoy dibujando
    if (activeTool !== "none") return;

    // 2) Hit test sobre lo dibujado
    const hit = hitTest(local.x, local.y, drawings, toXY, chartSize.w);
    if (!hit) {
      setSelectedId(null);
      return;
    }

    setSelectedId(hit.drawing.id);

    if (hit.type === "handle") {
      setDrag({ mode: "handle", drawingId: hit.drawing.id, handle: hit.handle });
    } else if (hit.type === "body") {
      const p = fromXY(local.x, local.y);
      if (!p) return;
      setDrag({
        mode: "body",
        drawingId: hit.drawing.id,
        startTime: p.time,
        startPrice: p.price,
      });
    }
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const local = getLocalXY(e.clientX, e.clientY);
    if (!local) return;
    setCursor(local);

    // Arrastre activo
    if (drag.mode !== "none") {
      const p = fromXY(local.x, local.y);
      if (!p) return;

      const target = drawings.find(d => d.id === drag.drawingId);
      if (!target) return;

      if (drag.mode === "handle") {
        let snapped = p;
        if (keys.ctrl) {
          const snap = snapToHighLow(p, candles);
          if (snap) snapped = snap.point;
        }
        const next = moveHandle(target, drag.handle, snapped);
        replaceDrawing(drag.drawingId, next);
      } else if (drag.mode === "body") {
        const dTime = p.time - drag.startTime;
        const dPrice = p.price - drag.startPrice;
        const next = moveBody(target, dTime, dPrice);
        replaceDrawing(drag.drawingId, next);
      }
      return;
    }
  };

  const onMouseUp = () => {
    if (drag.mode === "body") {
      // Al soltar, actualizamos el punto de inicio para que el siguiente drag
      // sea relativo a la posición actual. Más simple: limpiar drag.
    }
    setDrag({ mode: "none" });
  };

  const onClick = (e: React.MouseEvent) => {
    // Si está dibujando con activeTool, este click ES para colocar puntos
    if (activeTool === "none") return;

    const local = getLocalXY(e.clientX, e.clientY);
    if (!local) return;
    let p = fromXY(local.x, local.y);
    if (!p) return;

    // Aplicar modifier Ctrl al primer punto también
    if (keys.ctrl) {
      const snap = snapToHighLow(p, candles);
      if (snap) p = snap.point;
    }

    // Tools de 1 click
    if (activeTool === "hline") {
      addDrawing({ id: uid(), kind: "hline", price: p.price, color: "#facc15" });
      setActiveTool("none");
      return;
    }
    if (activeTool === "order-long" || activeTool === "order-short") {
      const side = activeTool === "order-long" ? "long" : "short";
      const r = 0.005;
      const entry = p.price;
      const stop = side === "long" ? entry * (1 - r) : entry * (1 + r);
      const target = side === "long" ? entry * (1 + r * 2) : entry * (1 - r * 2);
      addDrawing({
        id: uid(), kind: "order", side, entry, stop, target,
        time: p.time, color: side === "long" ? "#22c55e" : "#ef4444",
      });
      setActiveTool("none");
      return;
    }

    // Tools de 2 clicks
    if (!pending) {
      setPending({ p1: p });
      return;
    }
    const p1 = pending.p1;
    const p2 = applyModifiers(p, p1); // aplicar shift respecto a p1
    setPending(null);

    if (activeTool === "trendline") {
      addDrawing({ id: uid(), kind: "trendline", p1, p2, color: "#60a5fa", width: 1.5 });
    } else if (activeTool === "measure") {
      addDrawing({ id: uid(), kind: "measure", p1, p2, color: "#a78bfa" });
    } else if (activeTool === "fib") {
      addDrawing({ id: uid(), kind: "fib", p1, p2, levels: DEFAULT_FIB_LEVELS, color: "#f97316" });
    }
    setActiveTool("none");
  };

  // ---------- RENDER ----------

  const pointerEvents = activeTool === "none" && drag.mode === "none"
    ? "auto"     // siempre activo: para detectar clicks sobre dibujos existentes
    : "auto";
  const cursorStyle = activeTool !== "none" ? "crosshair" : drag.mode !== "none" ? "grabbing" : "default";

  // Convertir cursor a punto para preview (con modifiers aplicados)
  const cursorPoint = cursor ? fromXY(cursor.x, cursor.y) : null;
  const previewPoint = cursorPoint
    ? applyModifiers(cursorPoint, pending?.p1 ?? null)
    : null;
  const previewXY = previewPoint ? toXY(previewPoint.time, previewPoint.price) : null;

  // Punto de snap visual (sólo si Ctrl está activo y hay candidato)
  const snapHint = (keys.ctrl && cursorPoint)
    ? snapToHighLow(cursorPoint, candles)
    : null;
  const snapXY = snapHint ? toXY(snapHint.point.time, snapHint.point.price) : null;

  // Posición de la floating toolbar: la pegamos al p2 (o al precio) del seleccionado
  const selected = drawings.find(d => d.id === selectedId);
  let toolbarPos: { x: number; y: number } | null = null;
  if (selected) {
    if (selected.kind === "hline") {
      const xy = toXY(0, selected.price);
      if (xy) toolbarPos = { x: chartSize.w / 2, y: xy.y };
    } else if (selected.kind === "order") {
      const xy = toXY(selected.time, selected.entry);
      if (xy) toolbarPos = xy;
    } else {
      const xy = toXY(selected.p2.time, selected.p2.price);
      if (xy) toolbarPos = xy;
    }
  }

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 3, pointerEvents, cursor: cursorStyle, userSelect: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { setCursor(null); setDrag({ mode: "none" }); }}
        onClick={onClick}
      >
        {/* Preview del primer punto colocado */}
        {pending && (() => {
          const a = toXY(pending.p1.time, pending.p1.price);
          if (!a || !previewXY) return null;
          const isHoriz = keys.shift;
          return (
            <g>
              <line
                x1={a.x} y1={a.y}
                x2={previewXY.x} y2={previewXY.y}
                stroke="#9ca3af" strokeWidth={1.5}
                strokeDasharray={isHoriz ? "0" : "4,4"}
              />
              <circle cx={a.x} cy={a.y} r={4} fill="#9ca3af" />
              {isHoriz && (
                <text x={previewXY.x + 8} y={previewXY.y - 4} fontSize="10" fill="#facc15">
                  Horizontal (Shift)
                </text>
              )}
            </g>
          );
        })()}

        {/* Indicador de snap (puntito cuando Ctrl está activo) */}
        {snapXY && (
          <g>
            <circle cx={snapXY.x} cy={snapXY.y} r={5}
              fill="none" stroke="#facc15" strokeWidth={2} />
            <text x={snapXY.x + 8} y={snapXY.y - 6} fontSize="9" fill="#facc15">
              {snapHint!.hit.toUpperCase()}
            </text>
          </g>
        )}

        {/* Dibujos persistidos */}
        {drawings.map(d => (
          <DrawingShape
            key={d.id}
            d={d}
            toXY={toXY}
            chartWidth={chartSize.w}
            isSelected={d.id === selectedId}
          />
        ))}
      </svg>

      {/* Toolbar flotante */}
      {selected && toolbarPos && (
        <FloatingToolbar x={toolbarPos.x} y={toolbarPos.y} />
      )}
    </>
  );
}

// ---------------- Subcomponente: cada dibujo ----------------

function DrawingShape({
  d, toXY, chartWidth, isSelected,
}: {
  d: Drawing;
  toXY: ToXY;
  chartWidth: number;
  isSelected: boolean;
}) {
  const w = d.width ?? 1.5;
  const dash = dashArray(d.lineStyle);
  const handleR = 4;
  const handleProps = {
    r: handleR,
    fill: d.color,
    stroke: "#fff",
    strokeWidth: 1.5,
  };

  if (d.kind === "hline") {
    const xy = toXY(0, d.price);
    if (!xy) return null;
    return (
      <g>
        <line x1={0} y1={xy.y} x2="100%" y2={xy.y}
          stroke={d.color} strokeWidth={w} strokeDasharray={dash || "6,3"} />
        <rect x={6} y={xy.y - 9} width={62} height={16} rx={2}
          fill={d.color} opacity={0.85} />
        <text x={10} y={xy.y + 4} fontSize="10" fill="#000" fontFamily="monospace">
          {d.price.toFixed(5)}
        </text>
        {isSelected && (
          <circle cx={chartWidth / 2} cy={xy.y} {...handleProps} />
        )}
      </g>
    );
  }

  if (d.kind === "trendline") {
    const a = toXY(d.p1.time, d.p1.price);
    const b = toXY(d.p2.time, d.p2.price);
    if (!a || !b) return null;
    return (
      <g>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={d.color} strokeWidth={w} strokeDasharray={dash} />
        {isSelected && (
          <>
            <circle cx={a.x} cy={a.y} {...handleProps} />
            <circle cx={b.x} cy={b.y} {...handleProps} />
          </>
        )}
      </g>
    );
  }

  if (d.kind === "measure") {
    const a = toXY(d.p1.time, d.p1.price);
    const b = toXY(d.p2.time, d.p2.price);
    if (!a || !b) return null;
    const dPrice = d.p2.price - d.p1.price;
    const dPct = (dPrice / d.p1.price) * 100;
    const dBars = Math.abs(d.p2.time - d.p1.time);
    const dT =
      dBars > 86400 ? `${Math.round(dBars / 86400)}d` :
      dBars > 3600  ? `${Math.round(dBars / 3600)}h`  :
                      `${Math.round(dBars / 60)}m`;
    return (
      <g>
        <rect
          x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
          width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
          fill={dPrice >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)"}
          stroke={d.color} strokeWidth={w} strokeDasharray={dash || "3,3"}
        />
        <rect x={b.x + 4} y={b.y - 30} width={120} height={42} rx={3}
          fill="#0d1117" stroke={d.color} />
        <text x={b.x + 10} y={b.y - 18} fontSize="10" fill="#c9d1d9" fontFamily="monospace">
          Δ {dPrice.toFixed(5)} ({dPct.toFixed(2)}%)
        </text>
        <text x={b.x + 10} y={b.y - 4} fontSize="10" fill="#9ca3af" fontFamily="monospace">
          Δt {dT}
        </text>
        {isSelected && (
          <>
            <circle cx={a.x} cy={a.y} {...handleProps} />
            <circle cx={b.x} cy={b.y} {...handleProps} />
          </>
        )}
      </g>
    );
  }

  if (d.kind === "fib") {
    const a = toXY(d.p1.time, d.p1.price);
    const b = toXY(d.p2.time, d.p2.price);
    if (!a || !b) return null;
    const diffPrice = d.p2.price - d.p1.price;
    const diffY = b.y - a.y;
    const x1 = Math.min(a.x, b.x);
    return (
      <g>
        {d.levels.map(level => {
          const y = a.y + diffY * level;
          const priceAtLevel = d.p1.price + diffPrice * level;
          return (
            <g key={level}>
              <line x1={x1} y1={y} x2="100%" y2={y}
                stroke={d.color} strokeWidth={w * 0.6} strokeDasharray={dash || "2,2"} opacity={0.75} />
              <text x={x1 + 4} y={y - 2} fontSize="9" fill={d.color} fontFamily="monospace">
                {(level * 100).toFixed(1)}%  {priceAtLevel.toFixed(5)}
              </text>
            </g>
          );
        })}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={d.color} strokeWidth={w * 1.2} />
        {isSelected && (
          <>
            <circle cx={a.x} cy={a.y} {...handleProps} />
            <circle cx={b.x} cy={b.y} {...handleProps} />
          </>
        )}
      </g>
    );
  }

  if (d.kind === "order") {
    const anchor = toXY(d.time, d.entry);
    const yEntry = toXY(d.time, d.entry)?.y;
    const yStop = toXY(d.time, d.stop)?.y;
    const yTarget = toXY(d.time, d.target)?.y;
    if (!anchor || yEntry == null || yStop == null || yTarget == null) return null;
    const rr = Math.abs(d.target - d.entry) / Math.abs(d.entry - d.stop || 1e-10);
    return (
      <g>
        <rect x={anchor.x} y={Math.min(yEntry, yTarget)}
          width="100%" height={Math.abs(yTarget - yEntry)}
          fill="rgba(34,197,94,0.12)" />
        <rect x={anchor.x} y={Math.min(yEntry, yStop)}
          width="100%" height={Math.abs(yStop - yEntry)}
          fill="rgba(239,68,68,0.12)" />
        <line x1={anchor.x} y1={yEntry} x2="100%" y2={yEntry}
          stroke={d.color} strokeWidth={w} />
        <line x1={anchor.x} y1={yTarget} x2="100%" y2={yTarget}
          stroke="#22c55e" strokeWidth={w} strokeDasharray="4,3" />
        <line x1={anchor.x} y1={yStop} x2="100%" y2={yStop}
          stroke="#ef4444" strokeWidth={w} strokeDasharray="4,3" />
        <rect x={anchor.x + 4} y={yEntry - 8} width={150} height={16} rx={2} fill={d.color} />
        <text x={anchor.x + 8} y={yEntry + 4} fontSize="10" fill="#000" fontFamily="monospace">
          {d.side.toUpperCase()} @ {d.entry.toFixed(5)} RR {rr.toFixed(2)}
        </text>
        {isSelected && (
          <>
            <circle cx={anchor.x} cy={yEntry} {...handleProps} />
            <circle cx={anchor.x + 30} cy={yStop} {...handleProps} fill="#ef4444" />
            <circle cx={anchor.x + 30} cy={yTarget} {...handleProps} fill="#22c55e" />
          </>
        )}
      </g>
    );
  }

  return null;
}
