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

  liveDrag: (id: string, next: Drawing) => void;
  commitDrag: () => void;

  undo: () => void;
  redo: () => void;

  setActiveTool: (t: DrawingTool) => void;
  setSelectedDrawingId: (id: string | null) => void;

  toggleChartLock: () => void;
  toggleDrawingsLock: () => void;
  toggleSettings: () => void;

  setBacktest: (on: boolean, yearStart?: number, yearEnd?: number) => void;
};

function pushHistory(state: State, nextDrawings: Drawing[]): Partial<State> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(nextDrawings);
  while (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    drawings: nextDrawings,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

// Validador de sesión: asegura que tenga todos los campos nuevos.
// Si falta algo, lo completa con default. Esto soluciona el bug del color
// (las sesiones del localStorage viejo no tenían `opacity`).
function migrateSession(s: any): Session {
  const def = DEFAULT_SESSIONS.find(ds => ds.id === s?.id) ?? DEFAULT_SESSIONS[0];
  return {
    id: s?.id ?? def.id,
    label: s?.label ?? def.label,
    startHourUTC: s?.startHourUTC ?? def.startHourUTC,
    startMinUTC: s?.startMinUTC ?? def.startMinUTC,
    endHourUTC: s?.endHourUTC ?? def.endHourUTC,
    endMinUTC: s?.endMinUTC ?? def.endMinUTC,
    color: typeof s?.color === "string" && s.color.startsWith("#") ? s.color : def.color,
    opacity: typeof s?.opacity === "number" ? s.opacity : def.opacity,
    borderOpacity: typeof s?.borderOpacity === "number" ? s.borderOpacity : def.borderOpacity,
    enabled: s?.enabled ?? def.enabled,
    emphasis: s?.emphasis ?? def.emphasis,
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
          sessions: s.sessions.map(ss =>
            ss.id === id ? migrateSession({ ...ss, ...patch }) : ss,
          ),
        })),

      addDrawing: (d) => set((s) => pushHistory(s, [...s.drawings, d])),

      updateDrawing: (id, patch) =>
        set((s) => pushHistory(
          s,
          s.drawings.map((d) => d.id === id ? ({ ...d, ...patch } as Drawing) : d),
        )),

      replaceDrawing: (id, next) =>
        set((s) => pushHistory(s, s.drawings.map((d) => d.id === id ? next : d))),

      removeDrawing: (id) =>
        set((s) => ({
          ...pushHistory(s, s.drawings.filter((d) => d.id !== id)),
          selectedDrawingId: s.selectedDrawingId === id ? null : s.selectedDrawingId,
        })),

      clearDrawings: () =>
        set((s) => ({ ...pushHistory(s, []), selectedDrawingId: null })),

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

      liveDrag: (id, next) =>
        set((s) => ({ drawings: s.drawings.map(d => d.id === id ? next : d) })),
      commitDrag: () => set((s) => pushHistory(s, s.drawings)),

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
        set({ drawings: s.history[newIndex], historyIndex: newIndex });
      },

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
      version: 2,
      // Cuando rehidrata desde localStorage, migra sesiones viejas
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (Array.isArray(state.sessions)) {
          state.sessions = state.sessions.map(migrateSession);
        } else {
          state.sessions = DEFAULT_SESSIONS;
        }
      },
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
      // Si migramos de v1 a v2, regeneramos sessions limpias
      migrate: (persisted: any, version: number) => {
        if (version < 2 && persisted) {
          persisted.sessions = DEFAULT_SESSIONS;
        }
        return persisted;
      },
    },
  ),
);
