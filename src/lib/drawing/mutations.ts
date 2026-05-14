// src/lib/drawing/mutations.ts
import type { Drawing } from "./types";
import type { Handle } from "./hit-detection";
import type { Point } from "./types";

export function moveHandle(d: Drawing, handle: Handle, p: Point): Drawing {
  if (d.kind === "hline") {
    if (handle === "price") return { ...d, price: p.price };
    return d;
  }
  if (d.kind === "trendline" || d.kind === "measure" || d.kind === "fib") {
    if (handle === "p1") return { ...d, p1: p } as Drawing;
    if (handle === "p2") return { ...d, p2: p } as Drawing;
    return d;
  }
  if (d.kind === "order") {
    if (handle === "entry") return { ...d, entry: p.price };
    if (handle === "stop") return { ...d, stop: p.price };
    if (handle === "target") return { ...d, target: p.price };
    // Mover el extremo izquierdo: cambia el "time" (anchor)
    if (handle === "left") return { ...d, time: p.time };
    // Mover el extremo derecho: cambia endTime
    if (handle === "right") {
      // Evitar que endTime sea menor que time
      const newEnd = Math.max(p.time, d.time + 60);
      return { ...d, endTime: newEnd };
    }
    return d;
  }
  return d;
}

export function moveBody(d: Drawing, dTime: number, dPrice: number): Drawing {
  if (d.kind === "hline") {
    return { ...d, price: d.price + dPrice };
  }
  if (d.kind === "trendline" || d.kind === "measure" || d.kind === "fib") {
    return {
      ...d,
      p1: { time: d.p1.time + dTime, price: d.p1.price + dPrice },
      p2: { time: d.p2.time + dTime, price: d.p2.price + dPrice },
    } as Drawing;
  }
  if (d.kind === "order") {
    return {
      ...d,
      time: d.time + dTime,
      endTime: d.endTime != null ? d.endTime + dTime : undefined,
      entry: d.entry + dPrice,
      stop: d.stop + dPrice,
      target: d.target + dPrice,
    };
  }
  return d;
}

export function setDrawingColor(d: Drawing, color: string): Drawing {
  return { ...d, color };
}
