// src/components/settings/SettingsDrawer.tsx
"use client";
import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/lib/store/settings-store";
import type { Session } from "@/lib/sessions";

const TABS = [
  { id: "candles",  label: "Velas" },
  { id: "chart",    label: "Chart" },
  { id: "text",     label: "Texto" },
  { id: "sessions", label: "Sesiones" },
] as const;

type TabId = typeof TABS[number]["id"];

const FONTS = [
  "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
  "'Inter', system-ui, sans-serif",
  "'Roboto Mono', 'Courier New', monospace",
  "'Georgia', serif",
];
const FONT_LABELS = ["Sistema", "Inter", "Mono", "Serif"];

export function SettingsDrawer() {
  const open = useChartStore(s => s.settingsOpen);
  const toggle = useChartStore(s => s.toggleSettings);
  const reset = useSettingsStore(s => s.reset);
  const [tab, setTab] = useState<TabId>("candles");

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={toggle} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Configuración</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (confirm("¿Restablecer todos los valores?")) reset(); }}
              title="Restablecer"
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <RotateCcw size={13} />
            </button>
            <button onClick={toggle}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-zinc-800">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors
                ${tab === t.id ? "border-b-2 border-blue-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "candles"  && <CandlesTab />}
          {tab === "chart"    && <ChartTab />}
          {tab === "text"     && <TextTab />}
          {tab === "sessions" && <SessionsTab />}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-7 w-24 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[10px] font-mono text-zinc-200 outline-none" />
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 1, step = 0.01 }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 cursor-pointer" />
      <span className="w-10 text-right text-[10px] font-mono text-zinc-400">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/50 p-3">
        {children}
      </div>
    </div>
  );
}

function CandlesTab() {
  const s = useSettingsStore();
  return (
    <>
      <Section title="Alcistas">
        <Row label="Cuerpo"><ColorInput value={s.upColor} onChange={v => s.set("upColor", v)} /></Row>
        <Row label="Borde"><ColorInput value={s.upBorderColor} onChange={v => s.set("upBorderColor", v)} /></Row>
        <Row label="Mecha"><ColorInput value={s.upWickColor} onChange={v => s.set("upWickColor", v)} /></Row>
      </Section>
      <Section title="Bajistas">
        <Row label="Cuerpo"><ColorInput value={s.downColor} onChange={v => s.set("downColor", v)} /></Row>
        <Row label="Borde"><ColorInput value={s.downBorderColor} onChange={v => s.set("downBorderColor", v)} /></Row>
        <Row label="Mecha"><ColorInput value={s.downWickColor} onChange={v => s.set("downWickColor", v)} /></Row>
      </Section>
      <Section title="Precio">
        <Row label="Decimales">
          <select value={s.priceDecimals}
            onChange={(e) => s.set("priceDecimals", parseInt(e.target.value))}
            className="h-7 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200 outline-none">
            <option value={-1}>Auto</option>
            <option value={2}>2 (índices/metales)</option>
            <option value={3}>3 (JPY)</option>
            <option value={4}>4</option>
            <option value={5}>5 (forex)</option>
            <option value={6}>6</option>
          </select>
        </Row>
      </Section>
    </>
  );
}

function ChartTab() {
  const s = useSettingsStore();
  return (
    <>
      <Section title="Fondo">
        <Row label="Color"><ColorInput value={s.bgColor} onChange={v => s.set("bgColor", v)} /></Row>
        <Row label="Marca de agua">
          <input type="checkbox" checked={s.watermarkVisible}
            onChange={(e) => s.set("watermarkVisible", e.target.checked)} />
        </Row>
      </Section>
      <Section title="Cuadrícula">
        <Row label="Visible">
          <input type="checkbox" checked={s.gridVisible}
            onChange={(e) => s.set("gridVisible", e.target.checked)} />
        </Row>
        <Row label="Vertical"><ColorInput value={s.gridVertColor} onChange={v => s.set("gridVertColor", v)} /></Row>
        <Row label="Horizontal"><ColorInput value={s.gridHorzColor} onChange={v => s.set("gridHorzColor", v)} /></Row>
      </Section>
      <Section title="Ejes">
        <Row label="Borde precio"><ColorInput value={s.priceAxisBorderColor} onChange={v => s.set("priceAxisBorderColor", v)} /></Row>
        <Row label="Borde tiempo"><ColorInput value={s.timeAxisBorderColor} onChange={v => s.set("timeAxisBorderColor", v)} /></Row>
        <Row label="Crosshair"><ColorInput value={s.crosshairColor} onChange={v => s.set("crosshairColor", v)} /></Row>
      </Section>
    </>
  );
}

function TextTab() {
  const s = useSettingsStore();
  return (
    <>
      <Section title="Fuente">
        <Row label="Familia">
          <select value={s.fontFamily}
            onChange={(e) => s.set("fontFamily", e.target.value)}
            className="h-7 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200 outline-none">
            {FONTS.map((f, i) => <option key={f} value={f}>{FONT_LABELS[i]}</option>)}
          </select>
        </Row>
        <Row label="Tamaño">
          <select value={s.fontSize}
            onChange={(e) => s.set("fontSize", parseInt(e.target.value))}
            className="h-7 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200 outline-none">
            {[10, 11, 12, 13, 14, 16].map(n => <option key={n} value={n}>{n}px</option>)}
          </select>
        </Row>
        <Row label="Color"><ColorInput value={s.textColor} onChange={v => s.set("textColor", v)} /></Row>
      </Section>
    </>
  );
}

function SessionsTab() {
  const sessions = useChartStore(s => s.sessions);
  const updateSession = useChartStore(s => s.updateSession);
  const toggleSession = useChartStore(s => s.toggleSession);

  return (
    <>
      {sessions.map(sess => (
        <Section key={sess.id} title={sess.label}>
          <Row label="Activo">
            <input type="checkbox" checked={sess.enabled}
              onChange={() => toggleSession(sess.id)} />
          </Row>
          <Row label="Color">
            <ColorInput value={sess.color}
              onChange={v => updateSession(sess.id, { color: v })} />
          </Row>
          <Row label="Intensidad">
            <Slider value={sess.opacity}
              onChange={v => updateSession(sess.id, { opacity: v })} />
          </Row>
          <Row label="Borde">
            <Slider value={sess.borderOpacity}
              onChange={v => updateSession(sess.id, { borderOpacity: v })} />
          </Row>
          <Row label="Inicio (UTC)">
            <TimeInput
              hour={sess.startHourUTC} min={sess.startMinUTC}
              onChange={(h, m) => updateSession(sess.id, { startHourUTC: h, startMinUTC: m })} />
          </Row>
          <Row label="Fin (UTC)">
            <TimeInput
              hour={sess.endHourUTC} min={sess.endMinUTC}
              onChange={(h, m) => updateSession(sess.id, { endHourUTC: h, endMinUTC: m })} />
          </Row>
        </Section>
      ))}
    </>
  );
}

function TimeInput({
  hour, min, onChange,
}: {
  hour: number; min: number;
  onChange: (h: number, m: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <input type="number" min="0" max="23" value={hour}
        onChange={(e) => onChange(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)), min)}
        className="h-7 w-12 rounded border border-zinc-700 bg-zinc-900 px-1 text-center text-xs text-zinc-200 outline-none" />
      <span className="text-zinc-500">:</span>
      <input type="number" min="0" max="59" value={min}
        onChange={(e) => onChange(hour, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
        className="h-7 w-12 rounded border border-zinc-700 bg-zinc-900 px-1 text-center text-xs text-zinc-200 outline-none" />
    </div>
  );
}
