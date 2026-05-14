// src/lib/drawing/mutations.ts
// Funciones puras que modifican un dibujo. No tocan el store, solo devuelven
// una versión nueva. Quien las usa decide cuándo persistir.

import type { Drawing } from "./types";
import type { Handle } from "./hit-detection";
import type { Point } from "./types";

// Mueve un handle a un nuevo punto (tiempo/precio). Si no aplica, devuelve igual.
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
    return d;
  }
  return d;
}

// Mueve el cuerpo entero: aplica un delta de tiempo y de precio a todos los puntos.
// Para hline solo cambia el precio. Para order, mueve entry/stop/target juntos.
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
