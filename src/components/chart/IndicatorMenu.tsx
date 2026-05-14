// src/components/chart/IndicatorMenu.tsx
"use client";
import { useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";

const ITEMS: { key: any; label: string }[] = [
  { key: "ema20",  label: "EMA 20"  },
  { key: "ema50",  label: "EMA 50"  },
  { key: "ema200", label: "EMA 200" },
  { key: "rsi",    label: "RSI 14"  },
  { key: "macd",   label: "MACD"    },
  { key: "volume", label: "Volumen" },
];

export function IndicatorMenu() {
  const indicators     = useChartStore(s => s.indicators);
  const toggle         = useChartStore(s => s.toggleIndicator);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
      >
        <Activity size={14} />
        Indicadores
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
            {ITEMS.map(it => (
              <button
                key={it.key}
                onClick={() => toggle(it.key)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-zinc-900"
              >
                <span className="text-zinc-300">{it.label}</span>
                <input
                  type="checkbox"
                  checked={(indicators as any)[it.key]}
                  readOnly
                  className="pointer-events-none"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
