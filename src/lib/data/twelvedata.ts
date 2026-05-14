// src/lib/data/twelvedata.ts
// Cliente del lado del browser que pega al proxy /api/twelvedata
import type { Candle, DataProvider, Symbol } from "./types";
import { AGGREGATE_BASE, TWELVEDATA_NATIVE_INTERVALS } from "../timeframes";
import { aggregateCandles } from "./aggregate";

async function call(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ path, ...params }).toString();
  const r = await fetch(`/api/twelvedata?${qs}`);
  return r.json();
}

function parseTimeSeries(raw: any): Candle[] {
  if (!raw?.values || !Array.isArray(raw.values)) {
    // Si TwelveData devuelve un error
    if (raw?.status === "error" || raw?.code >= 400) {
      throw new Error(raw.message || "TwelveData error");
    }
    return [];
  }
  // TwelveData devuelve más reciente primero, las invertimos
  return raw.values
    .map((v: any) => ({
      time: Math.floor(new Date(v.datetime).getTime() / 1000),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : undefined,
    }))
    .reverse();
}

export const TwelveDataProvider: DataProvider = {
  name: "TwelveData",

  async getCandles(symbol: string, interval: string, limit = 500): Promise<Candle[]> {
    // Si el intervalo es nativo, lo pedimos directo
    if (TWELVEDATA_NATIVE_INTERVALS.has(interval)) {
      const raw = await call("time_series", {
        symbol,
        interval,
        outputsize: String(limit),
        format: "JSON",
      });
      return parseTimeSeries(raw);
    }

    // Si no, traemos base y agregamos
    const agg = AGGREGATE_BASE[interval];
    if (!agg) throw new Error(`Intervalo no soportado: ${interval}`);
    const baseLimit = Math.min(limit * agg.multiplier, 5000);
    const raw = await call("time_series", {
      symbol,
      interval: agg.base,
      outputsize: String(baseLimit),
      format: "JSON",
    });
    const baseCandles = parseTimeSeries(raw);
    return aggregateCandles(baseCandles, agg.multiplier);
  },

  async searchSymbols(query: string): Promise<Symbol[]> {
    const raw = await call("symbol_search", { symbol: query });
    if (!raw?.data) return [];
    return raw.data.map((d: any) => ({
      symbol: d.symbol,
      name: d.instrument_name,
      type:
        d.instrument_type === "Physical Currency" ? "forex" :
        d.instrument_type?.toLowerCase().includes("metal") ? "metal" :
        d.instrument_type?.toLowerCase().includes("future") ? "future" :
        d.instrument_type?.toLowerCase().includes("index") ? "index" :
        "stock",
      exchange: d.exchange,
    }));
  },
};
