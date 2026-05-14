// src/components/drawing/DrawingToolbar.tsx
"use client";
import {
  TrendingUp, Minus, Ruler, GitBranch, ArrowUpCircle, ArrowDownCircle,
  Trash2, Lock, Unlock, LockKeyhole, Clock,
} from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";
import type { DrawingTool } from "@/lib/drawing/types";
import { useCandleCountdown, formatCountdown } from "@/lib/hooks/useCandleCountdown";

const TOOLS: { id: DrawingTool; icon: any; label: string }[] = [
  { id: "trendline",   icon: TrendingUp,      label: "Línea de tendencia" },
  { id: "hline",       icon: Minus,           label: "Línea horizontal" },
  { id: "measure",     icon: Ruler,           label: "Medir" },
  { id: "fib",         icon: GitBranch,       label: "Fibonacci" },
  { id: "order-long",  icon: ArrowUpCircle,   label: "Orden LONG" },
  { id: "order-short", icon: ArrowDownCircle, label: "Orden SHORT" },
];

export function DrawingToolbar() {
  const activeTool = useChartStore(s => s.activeTool);
  const setActiveTool = useChartStore(s => s.setActiveTool);
  const clearDrawings = useChartStore(s => s.clearDrawings);
  const chartLocked = useChartStore(s => s.chartLocked);
  const drawingsLocked = useChartStore(s => s.drawingsLocked);
  const toggleChartLock = useChartStore(s => s.toggleChartLock);
  const toggleDrawingsLock = useChartStore(s => s.toggleDrawingsLock);
  const timeframe = useChartStore(s => s.timeframe);

  const countdown = useCandleCountdown(timeframe.seconds);
  const countdownText = formatCountdown(countdown);

  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-950 py-2">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveTool(activeTool === id ? "none" : id)}
          title={label}
          className={`flex h-9 w-9 items-center justify-center rounded transition-colors
            ${activeTool === id
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="my-1 h-px w-6 bg-zinc-800" />

      {/* Candado chart */}
      <button
        onClick={toggleChartLock}
        title={chartLocked ? "Desbloquear chart (pan/zoom)" : "Bloquear chart (pan/zoom)"}
        className={`flex h-9 w-9 items-center justify-center rounded transition-colors
          ${chartLocked
            ? "bg-orange-600 text-white"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
      >
        {chartLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>

      {/* Candado dibujos */}
      <button
        onClick={toggleDrawingsLock}
        title={drawingsLocked ? "Desbloquear dibujos" : "Bloquear dibujos"}
        className={`flex h-9 w-9 items-center justify-center rounded transition-colors
          ${drawingsLocked
            ? "bg-amber-600 text-white"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
      >
        <LockKeyhole size={14} />
      </button>

      <div className="my-1 h-px w-6 bg-zinc-800" />

      {/* Borrar todos */}
      <button
        onClick={() => { if (confirm("¿Borrar todos los dibujos?")) clearDrawings(); }}
        title="Borrar todos"
        className="flex h-9 w-9 items-center justify-center rounded text-zinc-400 hover:bg-red-900/40 hover:text-red-400"
      >
        <Trash2 size={16} />
      </button>

      <div className="flex-1" />

      {/* Countdown */}
      <div
        title={`Cierre próxima vela (${timeframe.label})`}
        className="flex w-10 flex-col items-center rounded bg-zinc-900 px-1 py-1.5"
      >
        <Clock size={12} className="text-zinc-500" />
        <span className="mt-0.5 text-[9px] font-mono leading-tight text-zinc-300">
          {countdownText}
        </span>
      </div>
    </div>
  );
}
