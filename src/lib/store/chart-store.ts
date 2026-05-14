// src/lib/store/chart-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TIMEFRAME, type Timeframe } from "../timeframes";
import { DEFAULT_SYMBOL } from "../data/default-symbols";
import { DEFAULT_SESSIONS, type Session } from "../sessions";
import type { Drawing, DrawingTool } from "../drawing/types";

type Indicators = {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  rsi: boolean;
  macd: boolean;
  volume: boolean;
};

type State = {
  // Selección actual
  symbol: string;
  symbolName: string;
  timeframe: Timeframe;

  // Indicadores
  indicators: Indicators;

  // Sesiones
  sessions: Session[];

  // Drawing
  drawings: Drawing[];
  activeTool: DrawingTool;

  // Backtest
  backtestMode: boolean;
  backtestYearStart: number;
  backtestYearEnd: number;

  // setters
  setSymbol: (symbol: string, name: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  toggleIndicator: (k: keyof Indicators) => void;
  toggleSession: (id: string) => void;
  setSessions: (sessions: Session[]) => void;
  addDrawing: (d: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  setActiveTool: (t: DrawingTool) => void;
  setBacktest: (on: boolean, yearStart?: number, yearEnd?: number) => void;
};

export const useChartStore = create<State>()(
  persist(
    (set) => ({
      symbol: DEFAULT_SYMBOL.symbol,
      symbolName: DEFAULT_SYMBOL.name,
      timeframe: DEFAULT_TIMEFRAME,

      indicators: {
        ema20: true, ema50: true, ema200: false,
        rsi: false, macd: false, volume: true,
      },

      sessions: DEFAULT_SESSIONS,
      drawings: [],
      activeTool: "none",

      backtestMode: false,
      backtestYearStart: 2023,
      backtestYearEnd: 2024,

      setSymbol: (symbol, symbolName) => set({ symbol, symbolName }),
      setTimeframe: (tf) => set({ timeframe: tf }),
      toggleIndicator: (k) =>
        set((s) => ({ indicators: { ...s.indicators, [k]: !s.indicators[k] } })),
      toggleSession: (id) =>
        set((s) => ({
          sessions: s.sessions.map((ss) =>
            ss.id === id ? { ...ss, enabled: !ss.enabled } : ss,
          ),
        })),
      setSessions: (sessions) => set({ sessions }),
      addDrawing: (d) => set((s) => ({ drawings: [...s.drawings, d] })),
      removeDrawing: (id) =>
        set((s) => ({ drawings: s.drawings.filter((d) => d.id !== id) })),
      clearDrawings: () => set({ drawings: [] }),
      setActiveTool: (t) => set({ activeTool: t }),
      setBacktest: (on, yearStart, yearEnd) =>
        set({
          backtestMode: on,
          ...(yearStart !== undefined ? { backtestYearStart: yearStart } : {}),
          ...(yearEnd !== undefined ? { backtestYearEnd: yearEnd } : {}),
        }),
    }),
    {
      name: "adrian-tradingview",
      partialize: (s) => ({
        symbol: s.symbol,
        symbolName: s.symbolName,
        timeframe: s.timeframe,
        indicators: s.indicators,
        sessions: s.sessions,
        drawings: s.drawings,
      }),
    },
  ),
);
