// src/lib/drawing/hit-detection.ts
// Dado un evento de click en píxeles (x, y), preguntamos:
//   - ¿Cayó sobre un handle (extremo) de algún dibujo? → para arrastrar ese punto
//   - ¿Cayó sobre el cuerpo de algún dibujo? → para seleccionarlo o arrastrarlo entero
//
// Trabaja en PÍXELES porque el zoom cambia la escala de precio/tiempo,
// y "estar cerca" debe sentirse igual en cualquier zoom.

import type { Drawing } from "./types";

export type Handle =
  | "p1" | "p2"               // trendline, measure, fib
  | "price"                   // hline
  | "entry" | "stop" | "target"; // order

export type HitResult =
  | { type: "handle"; drawing: Drawing; handle: Handle }
  | { type: "body"; drawing: Drawing }
  | null;

const HANDLE_RADIUS = 7;    // píxeles para "tocar" un handle
const LINE_TOLERANCE = 5;   // píxeles de tolerancia para clickear sobre una línea

// Función auxiliar: distancia de un punto (px, py) al segmento (x1,y1)-(x2,y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function near(ax: number, ay: number, bx: number, by: number, r: number) {
  return Math.hypot(ax - bx, ay - by) <= r;
}

// El caller nos pasa una función que convierte un punto del dibujo a píxeles
// (porque eso depende del chart y la series). Mantenemos hit-detection puro.
export type ToXY = (time: number, price: number) => { x: number; y: number } | null;

export function hitTest(
  px: number,
  py: number,
  drawings: Drawing[],
  toXY: ToXY,
  chartWidth: number,
): HitResult {
  // Recorremos en orden inverso (los últimos dibujos están "encima")
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];

    if (d.kind === "hline") {
      // La hline cruza todo el ancho del chart. Solo importa la Y.
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

      // Handles primero (tienen prioridad sobre el cuerpo)
      if (near(px, py, a.x, a.y, HANDLE_RADIUS))
        return { type: "handle", drawing: d, handle: "p1" };
      if (near(px, py, b.x, b.y, HANDLE_RADIUS))
        return { type: "handle", drawing: d, handle: "p2" };

      // Cuerpo
      if (d.kind === "trendline" || d.kind === "fib") {
        if (distToSegment(px, py, a.x, a.y, b.x, b.y) <= LINE_TOLERANCE) {
          return { type: "body", drawing: d };
        }
      }
      if (d.kind === "measure") {
        // El measure es un rectángulo: hit dentro del rect
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
        const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
        if (px >= x1 && px <= x2 && py >= y1 && py <= y2) {
          return { type: "body", drawing: d };
        }
      }
      // En el caso fib también miramos si está cerca de alguna de las líneas horizontales
      if (d.kind === "fib") {
        const diffY = b.y - a.y;
        for (const level of d.levels) {
          const y = a.y + diffY * level;
          if (Math.abs(py - y) <= LINE_TOLERANCE && px >= Math.min(a.x, b.x)) {
            return { type: "body", drawing: d };
          }
        }
      }
      continue;
    }

    if (d.kind === "order") {
      const anchor = toXY(d.time, d.entry);
      if (!anchor) continue;
      // Las 3 líneas se extienden desde anchor.x hasta el final del chart
      if (px < anchor.x - HANDLE_RADIUS) continue;

      const yEntry = toXY(d.time, d.entry)?.y;
      const yStop = toXY(d.time, d.stop)?.y;
      const yTarget = toXY(d.time, d.target)?.y;
      if (yEntry == null || yStop == null || yTarget == null) continue;

      if (Math.abs(py - yEntry) <= LINE_TOLERANCE)
        return { type: "handle", drawing: d, handle: "entry" };
      if (Math.abs(py - yStop) <= LINE_TOLERANCE)
        return { type: "handle", drawing: d, handle: "stop" };
      if (Math.abs(py - yTarget) <= LINE_TOLERANCE)
        return { type: "handle", drawing: d, handle: "target" };

      // Cuerpo: dentro del rectángulo que forma la orden
      const yMin = Math.min(yEntry, yStop, yTarget);
      const yMax = Math.max(yEntry, yStop, yTarget);
      if (py >= yMin && py <= yMax && px >= anchor.x) {
        return { type: "body", drawing: d };
      }
    }
  }
  return null;
}
