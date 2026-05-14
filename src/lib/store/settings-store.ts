// src/lib/store/settings-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimezoneOption = {
  id: string;
  label: string;
  offsetMinutes: number; // minutos respecto a UTC (negativo para oeste)
};

export const TIMEZONES: TimezoneOption[] = [
  { id: "utc",     label: "UTC",                       offsetMinutes: 0 },
  { id: "utc-4",   label: "UTC-4 · Nueva York / Caracas", offsetMinutes: -240 },
  { id: "utc-5",   label: "UTC-5 · Bogotá / Lima",     offsetMinutes: -300 },
  { id: "utc-3",   label: "UTC-3 · Buenos Aires / São Paulo", offsetMinutes: -180 },
  { id: "utc-6",   label: "UTC-6 · México / Centroamérica", offsetMinutes: -360 },
  { id: "utc+1",   label: "UTC+1 · Madrid / Frankfurt", offsetMinutes: 60 },
  { id: "utc+2",   label: "UTC+2 · Atenas / Helsinki",  offsetMinutes: 120 },
  { id: "utc+3",   label: "UTC+3 · Moscú / Estambul",   offsetMinutes: 180 },
  { id: "utc+9",   label: "UTC+9 · Tokio / Seúl",       offsetMinutes: 540 },
];

export type ChartSettings = {
  upColor: string;
  upBorderColor: string;
  upWickColor: string;
  downColor: string;
  downBorderColor: string;
  downWickColor: string;

  bgColor: string;
  gridVertColor: string;
  gridHorzColor: string;
  gridVisible: boolean;

  textColor: string;
  fontFamily: string;
  fontSize: number;
  priceAxisBorderColor: string;
  timeAxisBorderColor: string;

  crosshairColor: string;

  priceDecimals: number;     // -1 = auto-detectar por símbolo
  watermarkVisible: boolean;

  timezoneId: string;        // ID de TIMEZONES
};

export const DEFAULT_SETTINGS: ChartSettings = {
  upColor: "#ffffff",
  upBorderColor: "#ffffff",
  upWickColor: "#ffffff",
  downColor: "#5b9cf6",
  downBorderColor: "#5b9cf6",
  downWickColor: "#5b9cf6",

  bgColor: "#131722",
  gridVertColor: "#1e222d",
  gridHorzColor: "#1e222d",
  gridVisible: false,

  textColor: "#d1d4dc",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
  fontSize: 12,
  priceAxisBorderColor: "#363c4e",
  timeAxisBorderColor: "#363c4e",

  crosshairColor: "#758696",

  priceDecimals: -1,
  watermarkVisible: true,

  timezoneId: "utc-4", // Default: NY/Caracas como pediste
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

export function getTimezone(id: string): TimezoneOption {
  return TIMEZONES.find(t => t.id === id) ?? TIMEZONES[0];
}
