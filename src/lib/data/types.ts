// src/lib/data/types.ts
export type Candle = {
  time: number;   // unix seconds (lightweight-charts lo necesita así)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Symbol = {
  symbol: string;       // "EUR/USD", "XAU/USD", "ES=F"
  name: string;         // "Euro / US Dollar"
  type: "forex" | "metal" | "future" | "index" | "stock";
  exchange?: string;
};

// Lo que cada provider tiene que cumplir
export interface DataProvider {
  name: string;
  getCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  searchSymbols(query: string): Promise<Symbol[]>;
  subscribe?(symbol: string, interval: string, onCandle: (c: Candle) => void): () => void;
}
