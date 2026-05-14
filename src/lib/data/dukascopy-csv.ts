// src/lib/data/dukascopy-csv.ts
// Carga CSVs históricos descargados manualmente de Dukascopy y servidos desde /public/historical/
//
// Formato esperado del CSV (el que descarga el "Historical Data Feed" de Dukascopy):
//   Gmt time,Open,High,Low,Close,Volume
//   01.01.2024 00:00:00.000,1.10453,1.10458,1.10449,1.10455,123.45
//
// Convención de nombres de archivo:
//   EURUSD_M1_2024.csv, XAUUSD_M15_2023.csv, etc.

import type { Candle } from "./types";
import { AGGREGATE_BASE, TWELVEDATA_NATIVE_INTERVALS } from "../timeframes";
import { aggregateCandles } from "./aggregate";

// Mapeo de nuestros intervalos al sufijo del archivo CSV
const FILE_SUFFIX: Record<string, string> = {
  "1min": "M1", "5min": "M5", "15min": "M15", "30min": "M30",
  "1h": "H1", "4h": "H4",
  "1day": "D1", "1week": "W1", "1month": "MN",
};

function parseDukascopyLine(line: string): Candle | null {
  // "01.01.2024 00:00:00.000,1.10453,1.10458,1.10449,1.10455,123.45"
  const parts = line.split(",");
  if (parts.length < 6) return null;
  const [dateStr, o, h, l, c, v] = parts;
  // dd.mm.yyyy HH:MM:SS.mmm
  const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yyyy, HH, MM, SS] = m;
  const date = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +HH, +MM, +SS));
  return {
    time: Math.floor(date.getTime() / 1000),
    open: parseFloat(o),
    high: parseFloat(h),
    low: parseFloat(l),
    close: parseFloat(c),
    volume: parseFloat(v) || 0,
  };
}

// Carga un archivo y devuelve velas. Si el archivo no existe, devuelve []
export async function loadDukascopyCSV(
  symbol: string,    // "EURUSD" (sin slash)
  interval: string,  // ej "15min"
  year: number,
): Promise<Candle[]> {
  // Si es un intervalo nativo de Dukascopy, lo cargamos directo
  if (FILE_SUFFIX[interval]) {
    const url = `/historical/${symbol}_${FILE_SUFFIX[interval]}_${year}.csv`;
    return await fetchAndParse(url);
  }
  // Si no, cargamos M1 y agregamos
  const agg = AGGREGATE_BASE[interval];
  const baseInterval = agg?.base ?? "1min";
  const multiplier = agg?.multiplier ?? 1;

  const baseUrl = `/historical/${symbol}_${FILE_SUFFIX[baseInterval] ?? "M1"}_${year}.csv`;
  const base = await fetchAndParse(baseUrl);
  return aggregateCandles(base, multiplier);
}

async function fetchAndParse(url: string): Promise<Candle[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`[dukascopy] no encontrado: ${url}`);
      return [];
    }
    const text = await r.text();
    const lines = text.trim().split("\n");
    // Quitar header si existe
    const start = lines[0].toLowerCase().includes("gmt") || lines[0].toLowerCase().includes("time") ? 1 : 0;
    const candles: Candle[] = [];
    for (let i = start; i < lines.length; i++) {
      const c = parseDukascopyLine(lines[i]);
      if (c) candles.push(c);
    }
    return candles;
  } catch (err) {
    console.error("[dukascopy] error parseando", url, err);
    return [];
  }
}

// Carga múltiples años y los concatena
export async function loadDukascopyRange(
  symbol: string,
  interval: string,
  yearStart: number,
  yearEnd: number,
): Promise<Candle[]> {
  const chunks = await Promise.all(
    Array.from({ length: yearEnd - yearStart + 1 }, (_, i) =>
      loadDukascopyCSV(symbol, interval, yearStart + i),
    ),
  );
  return chunks.flat().sort((a, b) => a.time - b.time);
}
