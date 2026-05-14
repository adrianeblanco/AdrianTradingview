// src/lib/timeframes.ts
// Todas las temporalidades disponibles, agrupadas para el UI.
// El "value" es el string que enviamos al provider (TwelveData usa "1min", "5min", "1h", "1day", etc).
// El "seconds" lo usamos internamente para cálculos y para el chart.

export type Timeframe = {
  label: string;          // lo que ve el usuario: "3m", "1h", "1D"
  value: string;          // lo que mandamos a la API
  seconds: number;        // duración en segundos (para agrupar velas, etc)
  group: "minutes" | "hours" | "days" | "weeks" | "months";
};

export const TIMEFRAMES: Timeframe[] = [
  // ---- MINUTOS ----
  { label: "1m",   value: "1min",   seconds: 60,        group: "minutes" },
  { label: "3m",   value: "3min",   seconds: 180,       group: "minutes" },
  { label: "5m",   value: "5min",   seconds: 300,       group: "minutes" },
  { label: "10m",  value: "10min",  seconds: 600,       group: "minutes" },
  { label: "15m",  value: "15min",  seconds: 900,       group: "minutes" },
  { label: "30m",  value: "30min",  seconds: 1800,      group: "minutes" },
  { label: "45m",  value: "45min",  seconds: 2700,      group: "minutes" },
  { label: "90m",  value: "90min",  seconds: 5400,      group: "minutes" },
  { label: "144m", value: "144min", seconds: 8640,      group: "minutes" },

  // ---- HORAS ----
  { label: "1h",   value: "1h",   seconds: 3600,    group: "hours" },
  { label: "2h",   value: "2h",   seconds: 7200,    group: "hours" },
  { label: "3h",   value: "3h",   seconds: 10800,   group: "hours" },
  { label: "4h",   value: "4h",   seconds: 14400,   group: "hours" },
  { label: "5h",   value: "5h",   seconds: 18000,   group: "hours" },
  { label: "6h",   value: "6h",   seconds: 21600,   group: "hours" },
  { label: "8h",   value: "8h",   seconds: 28800,   group: "hours" },
  { label: "10h",  value: "10h",  seconds: 36000,   group: "hours" },
  { label: "12h",  value: "12h",  seconds: 43200,   group: "hours" },
  { label: "14h",  value: "14h",  seconds: 50400,   group: "hours" },
  { label: "16h",  value: "16h",  seconds: 57600,   group: "hours" },
  { label: "18h",  value: "18h",  seconds: 64800,   group: "hours" },

  // ---- DÍAS ----
  { label: "1D",   value: "1day",  seconds: 86400,   group: "days" },
  { label: "2D",   value: "2day",  seconds: 172800,  group: "days" },
  { label: "3D",   value: "3day",  seconds: 259200,  group: "days" },

  // ---- SEMANAS ----
  { label: "1W",   value: "1week",  seconds: 604800,    group: "weeks" },
  { label: "2W",   value: "2week",  seconds: 1209600,   group: "weeks" },
  { label: "3W",   value: "3week",  seconds: 1814400,   group: "weeks" },

  // ---- MESES ----
  { label: "1M",   value: "1month",  seconds: 2592000,   group: "months" },
  { label: "3M",   value: "3month",  seconds: 7776000,   group: "months" },
  { label: "6M",   value: "6month",  seconds: 15552000,  group: "months" },
  { label: "12M",  value: "12month", seconds: 31536000,  group: "months" },
];

export const DEFAULT_TIMEFRAME = TIMEFRAMES.find(t => t.label === "15m")!;

export function findTimeframe(label: string): Timeframe {
  return TIMEFRAMES.find(t => t.label === label) ?? DEFAULT_TIMEFRAME;
}

// IMPORTANTE: TwelveData NO soporta nativamente todos estos intervalos
// (ej. 144m, 18h, 2D, 3W, 6M no son intervalos estándar de la API).
// Para esos casos los marcamos como "agregables": traemos un timeframe menor
// y los reconstruimos en cliente. Ver src/lib/data/aggregate.ts
export const TWELVEDATA_NATIVE_INTERVALS = new Set([
  "1min","5min","15min","30min","45min",
  "1h","2h","4h","8h",
  "1day","1week","1month",
]);

// Para los timeframes no nativos, decimos cuál usar como base
export const AGGREGATE_BASE: Record<string, { base: string; multiplier: number }> = {
  "3min":   { base: "1min",  multiplier: 3   },
  "10min":  { base: "5min",  multiplier: 2   },
  "90min":  { base: "30min", multiplier: 3   },
  "144min": { base: "1min",  multiplier: 144 },
  "3h":     { base: "1h",    multiplier: 3   },
  "5h":     { base: "1h",    multiplier: 5   },
  "6h":     { base: "2h",    multiplier: 3   },
  "10h":    { base: "2h",    multiplier: 5   },
  "12h":    { base: "4h",    multiplier: 3   },
  "14h":    { base: "2h",    multiplier: 7   },
  "16h":    { base: "8h",    multiplier: 2   },
  "18h":    { base: "2h",    multiplier: 9   },
  "2day":   { base: "1day",  multiplier: 2   },
  "3day":   { base: "1day",  multiplier: 3   },
  "2week":  { base: "1week", multiplier: 2   },
  "3week":  { base: "1week", multiplier: 3   },
  "3month": { base: "1month", multiplier: 3  },
  "6month": { base: "1month", multiplier: 6  },
  "12month":{ base: "1month", multiplier: 12 },
};
