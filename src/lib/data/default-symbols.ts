// src/lib/data/default-symbols.ts
// Símbolos preferidos por el usuario: forex, metales, futuros, índices.
// Crypto fuera. Estos cargan rápido sin pegar al search de TwelveData.
import type { Symbol } from "./types";

export const DEFAULT_SYMBOLS: Symbol[] = [
  // ---- FOREX MAYORES ----
  { symbol: "EUR/USD", name: "Euro / US Dollar",            type: "forex" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar",    type: "forex" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen",     type: "forex" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc",      type: "forex" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar",type: "forex" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar",  type: "forex" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar",type: "forex" },

  // ---- FOREX CRUCES ----
  { symbol: "EUR/GBP", name: "Euro / British Pound",         type: "forex" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen",          type: "forex" },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", type: "forex" },

  // ---- METALES ----
  { symbol: "XAU/USD", name: "Gold / US Dollar",             type: "metal" },
  { symbol: "XAG/USD", name: "Silver / US Dollar",           type: "metal" },
  { symbol: "XPT/USD", name: "Platinum / US Dollar",         type: "metal" },

  // ---- ÍNDICES (como CFDs) ----
  { symbol: "SPX",     name: "S&P 500 Index",                type: "index" },
  { symbol: "NDX",     name: "NASDAQ 100",                   type: "index" },
  { symbol: "DJI",     name: "Dow Jones Industrial",         type: "index" },
  { symbol: "DAX",     name: "DAX (Alemania)",               type: "index" },

  // ---- FUTUROS ----
  { symbol: "ES=F",    name: "E-mini S&P 500 Futures",       type: "future" },
  { symbol: "NQ=F",    name: "E-mini NASDAQ 100 Futures",    type: "future" },
  { symbol: "CL=F",    name: "Crude Oil Futures",            type: "future" },
  { symbol: "GC=F",    name: "Gold Futures",                 type: "future" },
];

export const DEFAULT_SYMBOL = DEFAULT_SYMBOLS[0]; // EUR/USD
