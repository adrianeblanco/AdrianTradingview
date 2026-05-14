// src/lib/store/chart-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TIMEFRAME, type Timeframe } from "../timeframes";
import { DEFAULT_SYMBOL } from "../data/default-symbols";
import { DEFAULT_SESSIONS, type Session } from "../sessions";
import type { Drawing, DrawingTool } from "../drawing/types";

type Indicators = {
  ema20: boolean; ema50: boolean; ema200: boolean;
  rsi: boolean; macd: boolean; volume: boolean;
};

// Historia: snapshots de drawings, hasta 50.
// Cada acción de mutación pushea uno. Undo retrocede el puntero, redo avanza.
const MAX_HISTORY = 50;

type State = {
  symbol: string;
  symbolName: string;
  timeframe: Timeframe;

  indicators: Indicators;
  sessions: Session[];

  drawings: Drawing[];
  activeTool: DrawingTool;
  selectedDrawingId: string | null;

  history: Drawing[][];
  historyIndex: number;

  chartLocked: boolean;
  drawingsLocked: boolean;
  settingsOpen: boolean;

  backtestMode: boolean;
  backtestYearStart: number;
  backtestYearEnd: number;

  setSymbol: (symbol: string, name: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  toggleIndicator: (k: keyof Indicators) => void;
  toggleSession: (id: string) => void;
  setSessions: (sessions: Session[]) => void;
  updateSession: (id: string, patch: Partial<Session>) => void;

  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, patch: Partial<Drawing>) => void;
  replaceDrawing: (id: string, next: Drawing) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  duplicateDrawing: (id: string) => void;

  // Solo durante drag: NO crea entrada de historia (sería un spam)
  liveDrag: (id: string, next: Drawing) => void;
  // Al soltar el drag, sí pushea
  commitDrag: () => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setActiveTool: (t: DrawingTool) => void;
  setSelectedDrawingId: (id: string | null) => void;

  toggleChartLock: () => void;
  toggleDrawingsLock: () => void;
  toggleSettings: () => void;

  setBacktest: (on: boolean, yearStart?: number, yearEnd?: number) => void;
};

// Helper: pushear snapshot
function pushHistory(state: State, nextDrawings: Drawing[]): Partial<State> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(nextDrawings);
  // Limitar
  while (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    drawings: nextDrawings,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

export const useChartStore = create<State>()(
  persist(
    (set, get) => ({
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

      history: [[]],
      historyIndex: 0,

      chartLocked: false,
      drawingsLocked: false,
      settingsOpen: false,

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
      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map(ss => ss.id === id ? { ...ss, ...patch } : ss),
        })),

      addDrawing: (d) =>
        set((s) => pushHistory(s, [...s.drawings, d])),

      updateDrawing: (id, patch) =>
        set((s) => pushHistory(
          s,
          s.drawings.map((d) => d.id === id ? ({ ...d, ...patch } as Drawing) : d),
        )),

      replaceDrawing: (id, next) =>
        set((s) => pushHistory(
          s,
          s.drawings.map((d) => d.id === id ? next : d),
        )),

      removeDrawing: (id) =>
        set((s) => ({
          ...pushHistory(s, s.drawings.filter((d) => d.id !== id)),
          selectedDrawingId: s.selectedDrawingId === id ? null : s.selectedDrawingId,
        })),

      clearDrawings: () =>
        set((s) => ({
          ...pushHistory(s, []),
          selectedDrawingId: null,
        })),

      duplicateDrawing: (id) =>
        set((s) => {
          const orig = s.drawings.find((d) => d.id === id);
          if (!orig) return s;
          const copy = { ...orig, id: Math.random().toString(36).slice(2, 10) } as Drawing;
          if (copy.kind === "hline") copy.price *= 1.001;
          return {
            ...pushHistory(s, [...s.drawings, copy]),
            selectedDrawingId: copy.id,
          };
        }),

      // Live drag: muta drawings SIN tocar history
      liveDrag: (id, next) =>
        set((s) => ({
          drawings: s.drawings.map(d => d.id === id ? next : d),
        })),

      // Cuando suelta el mouse, snapshot el estado actual
      commitDrag: () =>
        set((s) => pushHistory(s, s.drawings)),

      undo: () => {
        const s = get();
        if (s.historyIndex <= 0) return;
        const newIndex = s.historyIndex - 1;
        set({
          drawings: s.history[newIndex],
          historyIndex: newIndex,
          selectedDrawingId: null,
        });
      },
      redo: () => {
        const s = get();
        if (s.historyIndex >= s.history.length - 1) return;
        const newIndex = s.historyIndex + 1;
        set({
          drawings: s.history[newIndex],
          historyIndex: newIndex,
        });
      },
      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      setActiveTool: (t) => set({ activeTool: t, selectedDrawingId: null }),
      setSelectedDrawingId: (id) => set({ selectedDrawingId: id }),

      toggleChartLock: () => set((s) => ({ chartLocked: !s.chartLocked })),
      toggleDrawingsLock: () =>
        set((s) => ({ drawingsLocked: !s.drawingsLocked, selectedDrawingId: null })),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

      setBacktest: (on, yearStart, yearEnd) =>
        set({
          backtestMode: on,
          ...(yearStart !== undefined ? { backtestYearStart: yearStart } : {}),
          ...(yearEnd !== undefined ? { backtestYearEnd: yearEnd } : {}),
        }),
    }),
    {
      name: "adrian-tradingview",
      // No persistimos la historia: se reinicia al recargar
      partialize: (s) => ({
        symbol: s.symbol,
        symbolName: s.symbolName,
        timeframe: s.timeframe,
        indicators: s.indicators,
        sessions: s.sessions,
        drawings: s.drawings,
        chartLocked: s.chartLocked,
        drawingsLocked: s.drawingsLocked,
      }),
    },
  ),
);
