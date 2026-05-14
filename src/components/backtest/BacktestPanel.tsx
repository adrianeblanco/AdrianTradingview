// src/components/backtest/BacktestPanel.tsx
"use client";
import { History } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";

export function BacktestPanel() {
  const backtestMode = useChartStore(s => s.backtestMode);
  const yStart       = useChartStore(s => s.backtestYearStart);
  const yEnd         = useChartStore(s => s.backtestYearEnd);
  const setBacktest  = useChartStore(s => s.setBacktest);

  const years = Array.from({ length: 26 }, (_, i) => 2000 + i);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setBacktest(!backtestMode)}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors
          ${backtestMode
            ? "bg-orange-600 text-white"
            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
      >
        <History size={14} />
        {backtestMode ? "BACKTEST ON" : "Backtest"}
      </button>
      {backtestMode && (
        <>
          <select
            value={yStart}
            onChange={e => setBacktest(true, +e.target.value, yEnd)}
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-zinc-500">→</span>
          <select
            value={yEnd}
            onChange={e => setBacktest(true, yStart, +e.target.value)}
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </>
      )}
    </div>
  );
}
