// src/components/drawing/FloatingToolbar.tsx
"use client";
import { useState } from "react";
import { Copy, Trash2, Palette, Info, X } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import { COLOR_PALETTE, type LineStyle } from "@/lib/drawing/types";

type Props = {
  x: number;
  y: number;
  chartWidth: number;
};

const TOOLBAR_WIDTH = 260;
const TOOLBAR_HEIGHT = 36;

export function FloatingToolbar({ x, y, chartWidth }: Props) {
  const selectedId = useChartStore(s => s.selectedDrawingId);
  const drawing = useChartStore(s => s.drawings.find(d => d.id === selectedId));
  const updateDrawing = useChartStore(s => s.updateDrawing);
  const removeDrawing = useChartStore(s => s.removeDrawing);
  const duplicateDrawing = useChartStore(s => s.duplicateDrawing);
  const setSelected = useChartStore(s => s.setSelectedDrawingId);

  const [showPalette, setShowPalette] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  if (!drawing) return null;

  // Posicionamiento inteligente: evita salirse del chart
  const padX = 10;
  const padY = 60;
  let left = x + 14;
  if (left + TOOLBAR_WIDTH > chartWidth - padX) {
    left = Math.max(padX, x - TOOLBAR_WIDTH - 14);
  }
  let top = y - TOOLBAR_HEIGHT - 12;
  if (top < padY) top = y + 14;

  // Info del dibujo
  let infoLines: string[] = [];
  if (drawing.kind === "trendline" || drawing.kind === "measure" || drawing.kind === "fib") {
    const dP = drawing.p2.price - drawing.p1.price;
    const dPct = (dP / drawing.p1.price) * 100;
    infoLines = [
      `P1: ${drawing.p1.price.toFixed(5)}`,
      `P2: ${drawing.p2.price.toFixed(5)}`,
      `Δ ${dP.toFixed(5)} (${dPct.toFixed(2)}%)`,
    ];
  } else if (drawing.kind === "hline") {
    infoLines = [`Precio: ${drawing.price.toFixed(5)}`];
  } else if (drawing.kind === "order") {
    const rr = Math.abs(drawing.target - drawing.entry) / Math.abs(drawing.entry - drawing.stop || 1e-10);
    infoLines = [
      `${drawing.side.toUpperCase()} @ ${drawing.entry.toFixed(5)}`,
      `SL: ${drawing.stop.toFixed(5)}`,
      `TP: ${drawing.target.toFixed(5)}`,
      `RR: ${rr.toFixed(2)}`,
    ];
  }

  return (
    <div
      className="absolute z-30"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 rounded-md border border-zinc-700 bg-zinc-900/97 px-1 py-0.5 shadow-2xl backdrop-blur">
        {/* Color */}
        <div className="relative">
          <button
            onClick={() => setShowPalette(v => !v)}
            title="Color"
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800 relative"
          >
            <Palette size={14} className="text-zinc-300" />
            <span
              className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-sm border border-zinc-700"
              style={{ background: drawing.color }}
            />
          </button>
          {showPalette && (
            <div className="absolute left-0 top-full z-40 mt-1 grid grid-cols-4 gap-1 rounded border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    updateDrawing(drawing.id, { color: c });
                    setShowPalette(false);
                  }}
                  className="h-5 w-5 rounded border border-zinc-700 transition-transform hover:scale-110"
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Grosor */}
        <select
          value={drawing.width ?? 1.5}
          onChange={(e) => updateDrawing(drawing.id, { width: parseFloat(e.target.value) })}
          className="h-7 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none"
          title="Grosor"
        >
          <option value={1}>1</option>
          <option value={1.5}>1.5</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>

        {/* Estilo */}
        <select
          value={drawing.lineStyle ?? "solid"}
          onChange={(e) => updateDrawing(drawing.id, { lineStyle: e.target.value as LineStyle })}
          className="h-7 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none"
          title="Estilo"
        >
          <option value="solid">━</option>
          <option value="dashed">- - -</option>
          <option value="dotted">·····</option>
        </select>

        <div className="h-5 w-px bg-zinc-700 mx-0.5" />

        {/* Info */}
        <button
          onClick={() => setShowInfo(v => !v)}
          title="Info"
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800 ${showInfo ? "bg-zinc-800" : ""}`}
        >
          <Info size={13} className="text-zinc-300" />
        </button>

        {/* Duplicar */}
        <button
          onClick={() => duplicateDrawing(drawing.id)}
          title="Duplicar"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800"
        >
          <Copy size={13} />
        </button>

        {/* Borrar */}
        <button
          onClick={() => { removeDrawing(drawing.id); setSelected(null); }}
          title="Borrar (Del)"
          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-900/40"
        >
          <Trash2 size={13} />
        </button>

        {/* Deseleccionar */}
        <button
          onClick={() => setSelected(null)}
          title="Cerrar (Esc)"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X size={13} />
        </button>
      </div>

      {/* Info expandida */}
      {showInfo && (
        <div className="mt-1 rounded-md border border-zinc-700 bg-zinc-900/97 px-2 py-1.5 text-[11px] font-mono leading-tight text-zinc-300 shadow-xl">
          {infoLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
