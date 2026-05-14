// src/lib/store/settings-store.ts
// Settings de apariencia: colores, fuente, grid, decimales.
// Separado del chart-store para evitar re-renders innecesarios.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartSettings = {
  // Velas
  upColor: string;          // alcista relleno
  upBorderColor: string;
  upWickColor: string;
  downColor: string;        // bajista relleno
  downBorderColor: string;
  downWickColor: string;

  // Fondo y ejes
  bgColor: string;
  gridVertColor: string;
  gridHorzColor: string;
  gridVisible: boolean;

  textColor: string;
  fontFamily: string;
  fontSize: number;         // tamaño base eje
  priceAxisBorderColor: string;
  timeAxisBorderColor: string;

  crosshairColor: string;

  // Precio
  priceDecimals: number;    // -1 = auto

  // Watermark (símbolo de fondo)
  watermarkVisible: boolean;
};

export const DEFAULT_SETTINGS: ChartSettings = {
  // Estilo TV "Dark" oficial
  upColor: "#ffffff",
  upBorderColor: "#ffffff",
  upWickColor: "#ffffff",
  downColor: "#5b9cf6",          // azul más claro que pediste
  downBorderColor: "#5b9cf6",
  downWickColor: "#5b9cf6",

  bgColor: "#131722",
  gridVertColor: "#1e222d",
  gridHorzColor: "#1e222d",
  gridVisible: false,            // grid OFF por default (lo pediste)

  textColor: "#d1d4dc",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
  fontSize: 12,
  priceAxisBorderColor: "#363c4e",
  timeAxisBorderColor: "#363c4e",

  crosshairColor: "#758696",

  priceDecimals: -1,

  watermarkVisible: true,
};

type State = ChartSettings & {
  set: <K extends keyof ChartSettings>(key: K, value: ChartSettings[K]) => void;
  reset: () => void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as any),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: "adrian-tv-settings" },
  ),
);
