// src/components/chart/TimeframeSelector.tsx
"use client";
import { useState } from "react";
import { TIMEFRAMES, type Timeframe } from "@/lib/timeframes";
import { useChartStore } from "@/lib/store/chart-store";
import { ChevronDown } from "lucide-react";

const QUICK = ["1m", "5m", "15m", "1h", "4h", "1D"];
const GROUP_LABEL: Record<Timeframe["group"], string> = {
  minutes: "Minutos",
  hours:   "Horas",
  days:    "Días",
  weeks:   "Semanas",
  months:  "Meses",
};

export function TimeframeSelector() {
  const timeframe = useChartStore(s => s.timeframe);
  const setTimeframe = useChartStore(s => s.setTimeframe);
  const [open, setOpen] = useState(false);

  const grouped = TIMEFRAMES.reduce<Record<string, Timeframe[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1">
      {/* Quick access */}
      {QUICK.map(label => {
        const t = TIMEFRAMES.find(x => x.label === label)!;
        const active = timeframe.label === label;
        return (
          <button
            key={label}
            onClick={() => setTimeframe(t)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors
              ${active
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
          >
            {label}
          </button>
        );
      })}

      {/* Botón de "más" */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {QUICK.includes(timeframe.label) ? "Más" : timeframe.label}
          <ChevronDown size={12} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded border border-zinc-800 bg-zinc-950 p-3 shadow-xl">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    {GROUP_LABEL[group as Timeframe["group"]]}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {items.map(t => (
                      <button
                        key={t.label}
                        onClick={() => { setTimeframe(t); setOpen(false); }}
                        className={`rounded px-2 py-1 text-xs transition-colors
                          ${timeframe.label === t.label
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
