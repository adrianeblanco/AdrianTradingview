// src/components/drawing/HotkeyHint.tsx
"use client";
import { useChartStore } from "@/lib/store/chart-store";

export function HotkeyHint() {
  const tool = useChartStore(s => s.activeTool);
  if (tool === "none") return null;

  // Solo mostrar para tools donde aplica
  const showSnap = tool === "trendline" || tool === "hline" || tool === "measure" || tool === "fib";
  const showHoriz = tool === "trendline";

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-[11px] text-zinc-300 shadow-lg">
      {showSnap && (
        <span>
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">Ctrl</kbd>
          {" "}snap a high/low
        </span>
      )}
      {showSnap && showHoriz && <span className="mx-2 text-zinc-600">·</span>}
      {showHoriz && (
        <span>
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">Shift</kbd>
          {" "}línea horizontal
        </span>
      )}
      <span className="mx-2 text-zinc-600">·</span>
      <span>
        <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
        {" "}cancelar
      </span>
    </div>
  );
}
