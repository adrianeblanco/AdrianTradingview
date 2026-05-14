// src/components/drawing/FloatingToolbar.tsx
"use client";
import { useState } from "react";
import { Copy, Trash2, Palette, Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import { COLOR_PALETTE, WIDTHS, type LineStyle } from "@/lib/drawing/types";
import { formatPips, diffPips } from "@/lib/pips";

type Props = { x: number; y: number; chartWidth: number };

const TOOLBAR_WIDTH = 280;

export function FloatingToolbar({ x, y, chartWidth }: Props) {
  const selectedId = useChartStore(s => s.selectedDrawingId);
  const drawing = useChartStore(s => s.drawings.find(d => d.id === selectedId));
  const symbol = useChartStore(s => s.symbol);
  const updateDrawing = useChartStore(s => s.updateDrawing);
  const removeDrawing = useChartStore(s => s.removeDrawing);
  const duplicateDrawing = useChartStore(s => s.duplicateDrawing);
  const setSelected = useChartStore(s => s.setSelectedDrawingId);

  const [showPalette, setShowPalette] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!drawing) return null;

  const isOrder = drawing.kind === "order";

  // Posicionamiento
  const padX = 10;
  let left = x + 14;
  if (left + TOOLBAR_WIDTH > chartWidth - padX) {
    left = Math.max(padX, x - TOOLBAR_WIDTH - 14);
  }
  let top = y - 50;
  if (top < 60) top = y + 20;

  return (
    <div
      className="absolute z-30"
      style={{ left, top, width: TOOLBAR_WIDTH }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Toolbar principal */}
      <div className="flex items-center gap-0.5 rounded-md border border-zinc-700 bg-zinc-900/97 px-1 py-0.5 shadow-2xl backdrop-blur">
        {/* Color principal */}
        <div className="relative">
          <button onClick={() => setShowPalette(v => !v)} title="Color"
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800 relative">
            <Palette size={14} className="text-zinc-300" />
            <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-sm border border-zinc-700"
              style={{ background: drawing.color }} />
          </button>
          {showPalette && (
            <div className="absolute left-0 top-full z-40 mt-1 grid grid-cols-4 gap-1 rounded border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
              {COLOR_PALETTE.map(c => (
                <button key={c}
                  onClick={() => { updateDrawing(drawing.id, { color: c }); setShowPalette(false); }}
                  className="h-5 w-5 rounded border border-zinc-700 hover:scale-110 transition-transform"
                  style={{ background: c }} />
              ))}
            </div>
          )}
        </div>

        {/* Grosor — incluye 0.5 ahora */}
        <select value={drawing.width ?? 1.5}
          onChange={(e) => updateDrawing(drawing.id, { width: parseFloat(e.target.value) })}
          className="h-7 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none">
          {WIDTHS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        {/* Estilo */}
        <select value={drawing.lineStyle ?? "solid"}
          onChange={(e) => updateDrawing(drawing.id, { lineStyle: e.target.value as LineStyle })}
          className="h-7 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none">
          <option value="solid">━</option>
          <option value="dashed">- -</option>
          <option value="dotted">···</option>
        </select>

        <div className="h-5 w-px bg-zinc-700 mx-0.5" />

        {/* Si es orden, mostrar botón de expandir */}
        {isOrder && (
          <button onClick={() => setExpanded(v => !v)} title="Editor avanzado"
            className={`flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800 ${expanded ? "bg-zinc-800" : ""}`}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        <button onClick={() => setShowInfo(v => !v)} title="Info"
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800 ${showInfo ? "bg-zinc-800" : ""}`}>
          <Info size={13} className="text-zinc-300" />
        </button>

        <button onClick={() => duplicateDrawing(drawing.id)} title="Duplicar"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800">
          <Copy size={13} />
        </button>

        <button onClick={() => { removeDrawing(drawing.id); setSelected(null); }} title="Borrar"
          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-900/40">
          <Trash2 size={13} />
        </button>

        <button onClick={() => setSelected(null)} title="Cerrar"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800">
          <X size={13} />
        </button>
      </div>

      {/* Editor de orden expandido */}
      {isOrder && expanded && drawing.kind === "order" && (
        <OrderEditor symbol={symbol} drawing={drawing} onChange={(patch) => updateDrawing(drawing.id, patch)} />
      )}

      {/* Info panel */}
      {showInfo && <InfoPanel drawing={drawing} symbol={symbol} />}
    </div>
  );
}

function OrderEditor({
  symbol, drawing, onChange,
}: {
  symbol: string;
  drawing: Extract<import("@/lib/drawing/types").Drawing, { kind: "order" }>;
  onChange: (patch: Partial<Extract<import("@/lib/drawing/types").Drawing, { kind: "order" }>>) => void;
}) {
  const slPips = diffPips(symbol, drawing.entry, drawing.stop);
  const tpPips = diffPips(symbol, drawing.entry, drawing.target);
  const rr = Math.abs(drawing.target - drawing.entry) / Math.abs(drawing.entry - drawing.stop || 1e-10);

  return (
    <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900/97 p-2 shadow-xl space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
        {drawing.side === "long" ? "LONG" : "SHORT"} · {symbol}
      </div>
      <Row label="Entry" color={drawing.entryColor ?? "#ffffff"}
        onColorChange={(c) => onChange({ entryColor: c })}>
        <NumberInput value={drawing.entry}
          onChange={(v) => onChange({ entry: v })} />
        <span className="w-20 text-right text-[10px] font-mono text-zinc-500">—</span>
      </Row>
      <Row label="Stop" color={drawing.stopColor ?? "#ef4444"}
        onColorChange={(c) => onChange({ stopColor: c })}>
        <NumberInput value={drawing.stop}
          onChange={(v) => onChange({ stop: v })} />
        <span className={`w-20 text-right text-[10px] font-mono ${slPips < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {slPips.toFixed(1)}p
        </span>
      </Row>
      <Row label="Target" color={drawing.targetColor ?? "#22c55e"}
        onColorChange={(c) => onChange({ targetColor: c })}>
        <NumberInput value={drawing.target}
          onChange={(v) => onChange({ target: v })} />
        <span className={`w-20 text-right text-[10px] font-mono ${tpPips < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {tpPips.toFixed(1)}p
        </span>
      </Row>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 text-[11px]">
        <span className="text-zinc-500">RR</span>
        <span className="font-mono text-zinc-200">1 : {rr.toFixed(2)}</span>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Lotes</span>
        <input type="number" step="0.01" min="0"
          value={drawing.size ?? 1}
          onChange={(e) => onChange({ size: parseFloat(e.target.value) || 0 })}
          className="h-6 w-20 rounded border border-zinc-700 bg-zinc-800 px-1.5 text-right text-[11px] font-mono text-zinc-200 outline-none" />
      </div>
    </div>
  );
}

function Row({
  label, color, onColorChange, children,
}: {
  label: string;
  color: string;
  onColorChange: (c: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="color" value={color}
        onChange={(e) => onColorChange(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border border-zinc-700 bg-zinc-900 p-0" />
      <span className="w-12 text-[10px] text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value.toString());
  // Mantener sincronizado cuando cambie de afuera
  if (parseFloat(local) !== value && local !== "" && local !== ".") {
    // skip
  }
  return (
    <input
      type="number"
      step="0.00001"
      value={local}
      onFocus={() => setLocal(value.toString())}
      onChange={(e) => {
        setLocal(e.target.value);
        const n = parseFloat(e.target.value);
        if (!isNaN(n)) onChange(n);
      }}
      onBlur={() => setLocal(value.toString())}
      className="h-6 flex-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 text-right text-[11px] font-mono text-zinc-200 outline-none focus:border-blue-500"
    />
  );
}

function InfoPanel({ drawing, symbol }: { drawing: any; symbol: string }) {
  let lines: string[] = [];
  if (drawing.kind === "trendline" || drawing.kind === "measure" || drawing.kind === "fib") {
    const dP = drawing.p2.price - drawing.p1.price;
    lines = [
      `P1: ${drawing.p1.price.toFixed(5)}`,
      `P2: ${drawing.p2.price.toFixed(5)}`,
      `Δ: ${dP.toFixed(5)} · ${formatPips(symbol, drawing.p1.price, drawing.p2.price)}`,
    ];
  } else if (drawing.kind === "hline") {
    lines = [`Precio: ${drawing.price.toFixed(5)}`];
  } else if (drawing.kind === "order") {
    lines = [
      `${drawing.side.toUpperCase()} @ ${drawing.entry.toFixed(5)}`,
      `SL: ${drawing.stop.toFixed(5)} · ${formatPips(symbol, drawing.entry, drawing.stop)}`,
      `TP: ${drawing.target.toFixed(5)} · ${formatPips(symbol, drawing.entry, drawing.target)}`,
    ];
  }
  return (
    <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900/97 px-2 py-1.5 text-[11px] font-mono leading-tight text-zinc-300 shadow-xl">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
