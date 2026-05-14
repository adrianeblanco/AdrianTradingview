// src/components/drawing/FloatingToolbar.tsx
"use client";
// Toolbar flotante que aparece junto al dibujo seleccionado.
// Permite cambiar color, grosor, estilo, duplicar, borrar.

import { useState } from "react";
import { Copy, Trash2, Palette } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import { COLOR_PALETTE, type LineStyle } from "@/lib/drawing/types";

type Props = {
  x: number;
  y: number;
};

export function FloatingToolbar({ x, y }: Props) {
  const selectedId = useChartStore(s => s.selectedDrawingId);
  const drawing = useChartStore(s => s.drawings.find(d => d.id === selectedId));
  const updateDrawing = useChartStore(s => s.updateDrawing);
  const removeDrawing = useChartStore(s => s.removeDrawing);
  const duplicateDrawing = useChartStore(s => s.duplicateDrawing);
  const setSelected = useChartStore(s => s.setSelectedDrawingId);

  const [showPalette, setShowPalette] = useState(false);

  if (!drawing) return null;

  // Posicionamiento: tratamos de evitar que se salga del chart
  // (corrección simple: si está muy a la derecha, lo movemos a la izquierda)
  const TOOLBAR_WIDTH = 220;
  const left = Math.max(10, Math.min(x + 12, window.innerWidth - TOOLBAR_WIDTH - 10));
  const top = Math.max(60, y - 50);

  return (
    <div
      className="absolute z-30 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/95 px-1.5 py-1 shadow-2xl backdrop-blur"
      style={{ left, top, pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color */}
      <div className="relative">
        <button
          onClick={() => setShowPalette(v => !v)}
          title="Color"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-800"
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

      <div className="h-5 w-px bg-zinc-700" />

      {/* Grosor */}
      <select
        value={drawing.width ?? 1.5}
        onChange={(e) => updateDrawing(drawing.id, { width: parseFloat(e.target.value) })}
        className="h-7 rounded bg-zinc-800 px-1.5 text-xs text-zinc-200 outline-none"
        title="Grosor"
      >
        <option value={1}>1px</option>
        <option value={1.5}>1.5px</option>
        <option value={2}>2px</option>
        <option value={3}>3px</option>
        <option value={4}>4px</option>
      </select>

      {/* Estilo de línea */}
      <select
        value={drawing.lineStyle ?? "solid"}
        onChange={(e) => updateDrawing(drawing.id, { lineStyle: e.target.value as LineStyle })}
        className="h-7 rounded bg-zinc-800 px-1.5 text-xs text-zinc-200 outline-none"
        title="Estilo"
      >
        <option value="solid">— solid</option>
        <option value="dashed">- - dashed</option>
        <option value="dotted">··· dotted</option>
      </select>

      <div className="h-5 w-px bg-zinc-700" />

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
        onClick={() => {
          removeDrawing(drawing.id);
          setSelected(null);
        }}
        title="Borrar"
        className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-900/40"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
