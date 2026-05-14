// src/components/drawing/UndoRedoButtons.tsx
"use client";
import { Undo2, Redo2 } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";

export function UndoRedoButtons() {
  const undo = useChartStore(s => s.undo);
  const redo = useChartStore(s => s.redo);
  const historyIndex = useChartStore(s => s.historyIndex);
  const historyLen = useChartStore(s => s.history.length);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLen - 1;

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Deshacer (Ctrl+Z)"
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors
          ${canUndo
            ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            : "text-zinc-700 cursor-not-allowed"}`}
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Rehacer (Ctrl+Shift+Z)"
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors
          ${canRedo
            ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            : "text-zinc-700 cursor-not-allowed"}`}
      >
        <Redo2 size={14} />
      </button>
    </div>
  );
}
