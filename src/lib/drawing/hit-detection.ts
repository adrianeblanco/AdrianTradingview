// src/lib/drawing/hit-detection.ts
import type { Drawing } from "./types";

export type Handle =
  | "p1" | "p2"
  | "price"
  | "entry" | "stop" | "target"
  | "left" | "right";

export type HitResult =
  | { type: "handle"; drawing: Drawing; handle: Handle }
  | { type: "body"; drawing: Drawing }
  | null;

const HANDLE_RADIUS = 8;
const LINE_TOLERANCE = 6;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function near(ax: number, ay: number, bx: number, by: number, r: number) {
  return Math.hypot(ax - bx, ay - by) <= r;
}

export type ToXY = (time: number, price: number) => { x: number; y: number } | null;

export function hitTest(
  px: number, py: number,
  drawings: Drawing[], toXY: ToXY, chartWidth: number,
): HitResult {
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];

    if (d.kind === "hline") {
      const xy = toXY(0, d.price);
      if (!xy) continue;
      if (Math.abs(py - xy.y) <= LINE_TOLERANCE) {
        return { type: "handle", drawing: d, handle: "price" };
      }
      continue;
    }

    if (d.kind === "trendline" || d.kind === "measure" || d.kind === "fib") {
      const a = toXY(d.p1.time, d.p1.price);
      const b = toXY(d.p2.time, d.p2.price);
      if (!a || !b) continue;

      if (near(px, py, a.x, a.y, HANDLE_RADIUS))
        return { type: "handle", drawing: d, handle: "p1" };
      if (near(px, py, b.x, b.y, HANDLE_RADIUS))
        return { type: "handle", drawing: d, handle: "p2" };

      if (d.kind === "trendline") {
        if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= LINE_TOLERANCE) {
          return { type: "body", drawing: d };
        }
      }
      if (d.kind === "fib") {
        if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= LINE_TOLERANCE) {
          return { type: "body", drawing: d };
        }
        const diffY = b.y - a.y;
        for (const level of d.levels) {
          const y = a.y + diffY * level;
          if (Math.abs(py - y) <= LINE_TOLERANCE && px >= Math.min(a.x, b.x)) {
            return { type: "body", drawing: d };
          }
        }
      }
      if (d.kind === "measure") {
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
        const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
        if (px >= x1 && px <= x2 && py >= y1 && py <= y2) {
          return { type: "body", drawing: d };
        }
      }
      continue;
    }

    if (d.kind === "order") {
      const anchor = toXY(d.time, d.entry);
      if (!anchor) continue;

      const yEntry = toXY(d.time, d.entry)?.y;
      const yStop = toXY(d.time, d.stop)?.y;
      const yTarget = toXY(d.time, d.target)?.y;
      if (yEntry == null || yStop == null || yTarget == null) continue;

      // Calcular extremo derecho
      const endX = d.endTime
        ? (toXY(d.endTime, d.entry)?.x ?? chartWidth)
        : chartWidth;

      // Handle IZQUIERDO (anchor): pequeño cuadrado al lado izquierdo de las líneas
      if (px >= anchor.x - HANDLE_RADIUS && px <= anchor.x + HANDLE_RADIUS) {
        const yMin = Math.min(yEntry, yStop, yTarget);
        const yMax = Math.max(yEntry, yStop, yTarget);
        if (py >= yMin - HANDLE_RADIUS && py <= yMax + HANDLE_RADIUS) {
          // Si es cerca de una de las líneas, prefiero el handle de esa línea
          if (Math.abs(py - yEntry) <= HANDLE_RADIUS)
            return { type: "handle", drawing: d, handle: "entry" };
          if (Math.abs(py - yStop) <= HANDLE_RADIUS)
            return { type: "handle", drawing: d, handle: "stop" };
          if (Math.abs(py - yTarget) <= HANDLE_RADIUS)
            return { type: "handle", drawing: d, handle: "target" };
          return { type: "handle", drawing: d, handle: "left" };
        }
      }

      // Handle DERECHO (endTime): igual pero en endX
      if (d.endTime != null && px >= endX - HANDLE_RADIUS && px <= endX + HANDLE_RADIUS) {
        const yMin = Math.min(yEntry, yStop, yTarget);
        const yMax = Math.max(yEntry, yStop, yTarget);
        if (py >= yMin - HANDLE_RADIUS && py <= yMax + HANDLE_RADIUS) {
          return { type: "handle", drawing: d, handle: "right" };
        }
      }

      // Click sobre una de las líneas (entre anchor y endX)
      if (px >= anchor.x && px <= endX) {
        if (Math.abs(py - yEntry) <= LINE_TOLERANCE)
          return { type: "handle", drawing: d, handle: "entry" };
        if (Math.abs(py - yStop) <= LINE_TOLERANCE)
          return { type: "handle", drawing: d, handle: "stop" };
        if (Math.abs(py - yTarget) <= LINE_TOLERANCE)
          return { type: "handle", drawing: d, handle: "target" };
      }

      // BODY: cualquier punto dentro del rectángulo (anchor..endX, yMin..yMax)
      const yMin = Math.min(yEntry, yStop, yTarget);
      const yMax = Math.max(yEntry, yStop, yTarget);
      if (px >= anchor.x && px <= endX && py >= yMin && py <= yMax) {
        return { type: "body", drawing: d };
      }
    }
  }
  return null;
}
