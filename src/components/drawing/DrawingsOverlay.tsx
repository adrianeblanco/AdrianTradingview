// src/components/drawing/DrawingsOverlay.tsx
"use client";
// v5 fixes:
//  - safeFromXY: cuando el cursor pasa de la última vela, EXTRAPOLA el tiempo
//    en lugar de devolver null. Esto permite mover dibujos hacia el futuro.
//  - Crear órdenes con endTime preestablecido (50 barras hacia adelante)
//  - Hit-test contempla "left" y "right" handles
//  - Líneas de orden: entry sólida, SL/TP dashed por default
//  - Estilo de cada línea respeta lineStyle del drawing si está seteado

import { useEffect, useRef, useState } from "react";
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

function uid() { return Math.random().toString(36).slice(2, 10); }

type DragState =
  | { mode: "none" }
  | { mode: "handle"; drawingId: string; handle: Handle }
  | { mode: "body"; drawingId: string; lastTime: number; lastPrice: number };

type DrawingInProgress = { p1: Point };

export function DrawingsOverlay({ chart, series, candles }: Props) {
  const drawings        = useChartStore(s => s.drawings);
  const addDrawing      = useChartStore(s => s.addDrawing);
  const liveDrag        = useChartStore(s => s.liveDrag);
  const commitDrag      = useChartStore(s => s.commitDrag);
  const removeDrawing   = useChartStore(s => s.removeDrawing);
  const undo            = useChartStore(s => s.undo);
  const redo            = useChartStore(s => s.redo);
  const activeTool      = useChartStore(s => s.activeTool);
  const setActiveTool   = useChartStore(s => s.setActiveTool);
  const selectedId      = useChartStore(s => s.selectedDrawingId);
  const setSelectedId   = useChartStore(s => s.setSelectedDrawingId);
  const drawingsLocked  = useChartStore(s => s.drawingsLocked);
  const timeframe       = useChartStore(s => s.timeframe);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [chartSize, setChartSize] = useState({ w: 0, h: 0 });
  const [pending, setPending] = useState<DrawingInProgress | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState>({ mode: "none" });
  const [keys, setKeys] = useState({ ctrl: false, shift: false });
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);

  const [, tick] = useState(0);
  useEffect(() => {
    const handler = () => tick(n => n + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
  }, [chart]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setChartSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      setKeys({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
      const t = e.target as HTMLElement;
      const inInput = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if (inInput) return;

      if (e.key === "Escape") {
        setActiveTool("none");
        setPending(null);
        setSelectedId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        removeDrawing(selectedId);
        setSelectedId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    const up = (e: KeyboardEvent) =>
      setKeys({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [selectedId, removeDrawing, setSelectedId, setActiveTool, undo, redo]);

  const toXY: ToXY = (time, price) => {
    const x = chart.timeScale().timeToCoordinate(time as Time);
    const y = series.priceToCoordinate(price);
    if (x == null || y == null) return null;
    return { x, y };
  };

  // FROM XY con EXTRAPOLACIÓN: si el cursor está más allá de la última vela,
  // calcula el tiempo basándose en la posición X y el espaciado de barras.
  const fromXY = (px: number, py: number): Point | null => {
    let time: number | null = null;
    const t = chart.timeScale().coordinateToTime(px);
    if (t != null) {
      time = Number(t);
    } else if (candles.length > 0) {
      // Extrapolar hacia adelante o atrás
      const last = candles[candles.length - 1];
      const first = candles[0];
      const lastX = chart.timeScale().timeToCoordinate(last.time as Time);
      const firstX = chart.timeScale().timeToCoordinate(first.time as Time);
      if (lastX != null && px > lastX) {
        // Después de la última vela
        const tfSec = timeframe.seconds;
        // Spacing real entre velas consecutivas
        let barSpacing = 6;
        if (candles.length >= 2) {
          const x0 = chart.timeScale().timeToCoordinate(candles[candles.length - 2].time as Time);
          const x1 = chart.timeScale().timeToCoordinate(candles[candles.length - 1].time as Time);
          if (x0 != null && x1 != null) barSpacing = Math.max(1, x1 - x0);
        }
        const barsAhead = Math.round((px - lastX) / barSpacing);
        time = last.time + barsAhead * tfSec;
      } else if (firstX != null && px < firstX) {
        // Antes de la primera vela (raro pero por las dudas)
        const tfSec = timeframe.seconds;
        let barSpacing = 6;
        if (candles.length >= 2) {
          const x0 = chart.timeScale().timeToCoordinate(candles[0].time as Time);
          const x1 = chart.timeScale().timeToCoordinate(candles[1].time as Time);
          if (x0 != null && x1 != null) barSpacing = Math.max(1, x1 - x0);
        }
        const barsBack = Math.round((firstX - px) / barSpacing);
        time = first.time - barsBack * timeframe.seconds;
      }
    }

    const price = series.coordinateToPrice(py);
    if (time == null || price == null) return null;
    return { time, price: Number(price) };
  };

  const getLocalXY = (clientX: number, clientY: number) => {
    if (!wrapperRef.current) return null;
    const r = wrapperRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const applyModifiers = (raw: Point, anchor: Point | null): Point => {
    let p = raw;
    if (keys.ctrl) {
      const snap = snapToHighLow(raw, candles);
      if (snap) p = snap.point;
    }
    if (keys.shift && anchor) {
      p = { time: p.time, price: anchor.price };
    }
    return p;
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onMove = (e: MouseEvent) => {
      const local = getLocalXY(e.clientX, e.clientY);
      if (!local) return;
      if (
        local.x < 0 || local.x > chartSize.w ||
        local.y < 0 || local.y > chartSize.h
      ) {
        setCursor(null);
        setHoveredDrawingId(null);
        return;
      }
      setCursor(local);

      if (drag.mode !== "none") {
        const p = fromXY(local.x, local.y);
        if (!p) return;
        const target = drawings.find(d => d.id === drag.drawingId);
        if (!target) return;

        if (drag.mode === "handle") {
          let snapped = p;
          if (keys.ctrl) {
            const s = snapToHighLow(p, candles);
            if (s) snapped = s.point;
          }
          liveDrag(drag.drawingId, moveHandle(target, drag.handle, snapped));
        } else if (drag.mode === "body") {
          const dTime = p.time - drag.lastTime;
          const dPrice = p.price - drag.lastPrice;
          liveDrag(drag.drawingId, moveBody(target, dTime, dPrice));
          setDrag({ mode: "body", drawingId: drag.drawingId, lastTime: p.time, lastPrice: p.price });
        }
        return;
      }

      if (drawingsLocked || activeTool !== "none") {
        setHoveredDrawingId(null);
        return;
      }
      const hit = hitTest(local.x, local.y, drawings, toXY, chartSize.w);
      setHoveredDrawingId(hit ? hit.drawing.id : null);
    };

    const onUp = () => {
      if (drag.mode !== "none") {
        commitDrag();
        setDrag({ mode: "none" });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drawings, drag, keys, candles, chartSize, drawingsLocked, activeTool, liveDrag, commitDrag, timeframe]);

  const onMouseDownSvg = (e: React.MouseEvent) => {
    const local = getLocalXY(e.clientX, e.clientY);
    if (!local) return;
    if (activeTool !== "none") return;
    if (drawingsLocked) return;

    const hit = hitTest(local.x, local.y, drawings, toXY, chartSize.w);
    if (!hit) { setSelectedId(null); return; }
    setSelectedId(hit.drawing.id);

    if (hit.type === "handle") {
      setDrag({ mode: "handle", drawingId: hit.drawing.id, handle: hit.handle });
      e.preventDefault();
      e.stopPropagation();
    } else if (hit.type === "body") {
      const p = fromXY(local.x, local.y);
      if (!p) return;
      setDrag({ mode: "body", drawingId: hit.drawing.id, lastTime: p.time, lastPrice: p.price });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onClickSvg = (e: React.MouseEvent) => {
    if (activeTool === "none") return;
    const local = getLocalXY(e.clientX, e.clientY);
    if (!local) return;
    let p = fromXY(local.x, local.y);
    if (!p) return;

    if (keys.ctrl) {
      const s = snapToHighLow(p, candles);
      if (s) p = s.point;
    }

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
      // endTime: 50 barras hacia adelante por default
      const endTime = p.time + timeframe.seconds * 50;
      addDrawing({
        id: uid(), kind: "order", side, entry, stop, target,
        time: p.time, endTime,
        color: side === "long" ? "#22c55e" : "#ef4444",
        entryColor: side === "long" ? "#22c55e" : "#ef4444",
        stopColor: "#ef4444",
        targetColor: "#22c55e",
        size: 1,
        lineStyle: "solid", // default: entry sólida; SL/TP usan dashedSL/TP propio en el render
      });
      setActiveTool("none");
      return;
    }

    if (!pending) { setPending({ p1: p }); return; }
    const p1 = pending.p1;
    const p2 = applyModifiers(p, p1);
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

  const svgNeedsClicks =
    activeTool !== "none" ||
    drag.mode !== "none" ||
    hoveredDrawingId !== null;

  const cursorPoint = cursor ? fromXY(cursor.x, cursor.y) : null;
  const previewPoint = cursorPoint
    ? applyModifiers(cursorPoint, pending?.p1 ?? null)
    : null;
  const previewXY = previewPoint ? toXY(previewPoint.time, previewPoint.price) : null;

  const snapHint = (keys.ctrl && cursorPoint && activeTool !== "none")
    ? snapToHighLow(cursorPoint, candles) : null;
  const snapXY = snapHint ? toXY(snapHint.point.time, snapHint.point.price) : null;

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

  const cursorStyle =
    drag.mode === "body" || drag.mode === "handle" ? "grabbing" :
    activeTool !== "none" ? "crosshair" :
    hoveredDrawingId ? "pointer" : "default";

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      style={{ pointerEvents: "none", zIndex: 3 }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        style={{
          pointerEvents: svgNeedsClicks ? "auto" : "none",
          cursor: cursorStyle, userSelect: "none",
        }}
        onMouseDown={onMouseDownSvg}
        onClick={onClickSvg}
      >
        {pending && (() => {
          const a = toXY(pending.p1.time, pending.p1.price);
          if (!a || !previewXY) return null;
          const isHoriz = keys.shift;
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={previewXY.x} y2={previewXY.y}
                stroke="#9ca3af" strokeWidth={1.5}
                strokeDasharray={isHoriz ? "0" : "4,4"} />
              <circle cx={a.x} cy={a.y} r={4} fill="#9ca3af" />
            </g>
          );
        })()}

        {snapXY && (
          <g>
            <circle cx={snapXY.x} cy={snapXY.y} r={5}
              fill="none" stroke="#facc15" strokeWidth={2} />
            <text x={snapXY.x + 8} y={snapXY.y - 6} fontSize="9" fill="#facc15">
              {snapHint!.hit.toUpperCase()}
            </text>
          </g>
        )}

        {drawings.map(d => (
          <DrawingShape
            key={d.id}
            d={d}
            toXY={toXY}
            chartWidth={chartSize.w}
            isSelected={d.id === selectedId}
            isHovered={d.id === hoveredDrawingId}
          />
        ))}
      </svg>

      {selected && toolbarPos && (
        <div style={{ pointerEvents: "auto" }}>
          <FloatingToolbar x={toolbarPos.x} y={toolbarPos.y} chartWidth={chartSize.w} />
        </div>
      )}
    </div>
  );
}

function DrawingShape({
  d, toXY, chartWidth, isSelected, isHovered,
}: {
  d: Drawing; toXY: ToXY; chartWidth: number;
  isSelected: boolean; isHovered: boolean;
}) {
  const w = d.width ?? 1.5;
  const dash = dashArray(d.lineStyle);
  const handleR = 5;
  const baseW = isHovered ? w + 0.5 : w;
  const handleProps = { r: handleR, fill: d.color, stroke: "#fff", strokeWidth: 1.5 };

  if (d.kind === "hline") {
    const xy = toXY(0, d.price);
    if (!xy) return null;
    return (
      <g>
        <line x1={0} y1={xy.y} x2="100%" y2={xy.y}
          stroke={d.color} strokeWidth={baseW} strokeDasharray={dash || "6,3"} />
        <rect x={6} y={xy.y - 9} width={62} height={16} rx={2} fill={d.color} opacity={0.9} />
        <text x={10} y={xy.y + 4} fontSize="10" fill="#000" fontFamily="monospace">
          {d.price.toFixed(5)}
        </text>
        {isSelected && <circle cx={chartWidth / 2} cy={xy.y} {...handleProps} />}
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
          stroke={d.color} strokeWidth={baseW} strokeDasharray={dash} />
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
    const dT = dBars > 86400 ? `${Math.round(dBars / 86400)}d`
             : dBars > 3600  ? `${Math.round(dBars / 3600)}h`
             : `${Math.round(dBars / 60)}m`;
    return (
      <g>
        <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
          width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
          fill={dPrice >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)"}
          stroke={d.color} strokeWidth={baseW} strokeDasharray={dash || "3,3"} />
        <rect x={b.x + 4} y={b.y - 30} width={120} height={42} rx={3} fill="#0d1117" stroke={d.color} />
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
                stroke={d.color} strokeWidth={baseW * 0.6}
                strokeDasharray={dash || "2,2"} opacity={0.75} />
              <text x={x1 + 4} y={y - 2} fontSize="9" fill={d.color} fontFamily="monospace">
                {(level * 100).toFixed(1)}%  {priceAtLevel.toFixed(5)}
              </text>
            </g>
          );
        })}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={d.color} strokeWidth={baseW * 1.2} />
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

    const endX = d.endTime
      ? (toXY(d.endTime, d.entry)?.x ?? chartWidth)
      : chartWidth;

    const entryColor  = d.entryColor  ?? d.color;
    const stopColor   = d.stopColor   ?? "#ef4444";
    const targetColor = d.targetColor ?? "#22c55e";

    // Por default: entry SÓLIDA, SL/TP DASHED (más TradingView).
    // Si el usuario seteó un lineStyle explícito en el drawing, ese gana para entry.
    // Para SL/TP, si lineStyle === "solid" => sólidas; si dashed/dotted o sin definir => dashed.
    const entryDash = dash; // respeta lineStyle
    const slTpDash = d.lineStyle === "solid" ? "" : (dash || "5,3");

    const rr = Math.abs(d.target - d.entry) / Math.abs(d.entry - d.stop || 1e-10);

    return (
      <g>
        {/* Zona profit (verde) */}
        <rect x={anchor.x} y={Math.min(yEntry, yTarget)}
          width={endX - anchor.x} height={Math.abs(yTarget - yEntry)}
          fill="rgba(34,197,94,0.12)" />
        {/* Zona riesgo (rojo) */}
        <rect x={anchor.x} y={Math.min(yEntry, yStop)}
          width={endX - anchor.x} height={Math.abs(yStop - yEntry)}
          fill="rgba(239,68,68,0.12)" />

        {/* Entry — sólida por default */}
        <line x1={anchor.x} y1={yEntry} x2={endX} y2={yEntry}
          stroke={entryColor} strokeWidth={baseW} strokeDasharray={entryDash} />
        {/* Target — dashed por default */}
        <line x1={anchor.x} y1={yTarget} x2={endX} y2={yTarget}
          stroke={targetColor} strokeWidth={baseW} strokeDasharray={slTpDash} />
        {/* Stop — dashed por default */}
        <line x1={anchor.x} y1={yStop} x2={endX} y2={yStop}
          stroke={stopColor} strokeWidth={baseW} strokeDasharray={slTpDash} />

        {/* Etiqueta */}
        <rect x={anchor.x + 4} y={yEntry - 8} width={170} height={16} rx={2} fill={entryColor} />
        <text x={anchor.x + 8} y={yEntry + 4} fontSize="10" fill="#000" fontFamily="monospace">
          {d.side.toUpperCase()} @ {d.entry.toFixed(5)} RR {rr.toFixed(2)}
        </text>

        {isSelected && (
          <>
            {/* Handle izquierdo (anchor) en cada línea */}
            <circle cx={anchor.x} cy={yEntry} {...handleProps} fill={entryColor} />
            <circle cx={anchor.x} cy={yStop} {...handleProps} fill={stopColor} />
            <circle cx={anchor.x} cy={yTarget} {...handleProps} fill={targetColor} />
            {/* Handle DERECHO (endTime) */}
            <rect x={endX - 4} y={yEntry - 4} width={8} height={8}
              fill={entryColor} stroke="#fff" strokeWidth={1.5} />
            <rect x={endX - 4} y={yStop - 4} width={8} height={8}
              fill={stopColor} stroke="#fff" strokeWidth={1.5} />
            <rect x={endX - 4} y={yTarget - 4} width={8} height={8}
              fill={targetColor} stroke="#fff" strokeWidth={1.5} />
          </>
        )}
      </g>
    );
  }
  return null;
}
