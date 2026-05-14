// src/lib/drawing/snap.ts
// Cuando el usuario tiene Ctrl presionado, buscamos la vela más cercana al cursor
// y "ajustamos" (snap) al high o al low — el que esté más cerca verticalmente.
//
// Por qué esto importa: dibujar trendlines exactas pixel-a-pixel es horrible.
// Con snap, la línea se pega al extremo real de una vela, lo que es lo que
// realmente querés trazar.

import type { Candle } from "../data/types";
import type { Point } from "./types";

export type SnapResult = {
  point: Point;
  candleTime: number;
  hit: "high" | "low";
};

// Encuentra la vela cuyo `time` es más cercano al `targetTime`.
// candles está ordenado por tiempo ascendente.
function nearestCandle(candles: Candle[], targetTime: number): Candle | null {
  if (candles.length === 0) return null;
  // Búsqueda binaria
  let lo = 0;
  let hi = candles.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time < targetTime) lo = mid + 1;
    else hi = mid;
  }
  // lo es el primer índice cuyo time >= targetTime
  // Comparamos lo y lo-1 para ver cuál está más cerca
  const a = candles[lo];
  const b = lo > 0 ? candles[lo - 1] : null;
  if (!b) return a;
  return Math.abs(a.time - targetTime) < Math.abs(b.time - targetTime) ? a : b;
}

// Dado un punto (tiempo + precio) que viene del cursor, devuelve el snap.
// Si no hay vela cerca, devuelve null y el caller usa el punto original.
export function snapToHighLow(
  cursor: Point,
  candles: Candle[],
): SnapResult | null {
  const c = nearestCandle(candles, cursor.time);
  if (!c) return null;
  // El más cercano verticalmente al precio del cursor
  const dHigh = Math.abs(c.high - cursor.price);
  const dLow = Math.abs(c.low - cursor.price);
  if (dHigh <= dLow) {
    return {
      point: { time: c.time, price: c.high },
      candleTime: c.time,
      hit: "high",
    };
  }
  return {
    point: { time: c.time, price: c.low },
    candleTime: c.time,
    hit: "low",
  };
}
