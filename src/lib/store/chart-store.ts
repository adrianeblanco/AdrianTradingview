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
  symbol: string;
  symbolName: string;
  timeframe: Timeframe;

  indicators: Indicators;
  sessions: Session[];

  drawings: Drawing[];
  activeTool: DrawingTool;
  selectedDrawingId: string | null;

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
  updateDrawing: (id: string, patch: Partial<Drawing>) => void;
  replaceDrawing: (id: string, next: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  duplicateDrawing: (id: string) => void;

  setActiveTool: (t: DrawingTool) => void;
  setSelectedDrawingId: (id: string | null) => void;

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
      selectedDrawingId: null,

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

      updateDrawing: (id, patch) =>
        set((s) => ({
          drawings: s.drawings.map((d) => (d.id === id ? ({ ...d, ...patch } as Drawing) : d)),
        })),

      replaceDrawing: (id, next) =>
        set((s) => ({
          drawings: s.drawings.map((d) => (d.id === id ? next : d)),
        })),

      removeDrawing: (id) =>
        set((s) => ({
          drawings: s.drawings.filter((d) => d.id !== id),
          selectedDrawingId: s.selectedDrawingId === id ? null : s.selectedDrawingId,
        })),

      clearDrawings: () => set({ drawings: [], selectedDrawingId: null }),

      duplicateDrawing: (id) =>
        set((s) => {
          const orig = s.drawings.find((d) => d.id === id);
          if (!orig) return s;
          const copy = { ...orig, id: Math.random().toString(36).slice(2, 10) } as Drawing;
          // Offset levemente para que no se superponga
          if (copy.kind === "hline") copy.price *= 1.001;
          return { drawings: [...s.drawings, copy], selectedDrawingId: copy.id };
        }),

      setActiveTool: (t) => set({ activeTool: t, selectedDrawingId: null }),
      setSelectedDrawingId: (id) => set({ selectedDrawingId: id }),

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
