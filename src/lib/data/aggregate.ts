// src/lib/data/aggregate.ts
// Agrupa velas de un timeframe menor en velas de uno mayor.
// Ej: 144 velas de 1min -> 1 vela de 144min.

import type { Candle } from "./types";

export function aggregateCandles(candles: Candle[], multiplier: number): Candle[] {
  if (multiplier <= 1) return candles;
  const result: Candle[] = [];

  for (let i = 0; i < candles.length; i += multiplier) {
    const chunk = candles.slice(i, i + multiplier);
    if (chunk.length === 0) continue;

    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map(c => c.high));
    const low = Math.min(...chunk.map(c => c.low));
    const volume = chunk.reduce((sum, c) => sum + (c.volume ?? 0), 0);

    result.push({
      time: chunk[0].time,
      open, high, low, close, volume,
    });
  }

  return result;
}
