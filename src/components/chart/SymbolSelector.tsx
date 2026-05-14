// src/components/chart/SymbolSelector.tsx
"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { DEFAULT_SYMBOLS } from "@/lib/data/default-symbols";
import { TwelveDataProvider } from "@/lib/data/twelvedata";
import { useChartStore } from "@/lib/store/chart-store";
import type { Symbol } from "@/lib/data/types";

const TYPE_BADGE: Record<string, string> = {
  forex:  "bg-blue-900/50 text-blue-300",
  metal:  "bg-amber-900/50 text-amber-300",
  future: "bg-purple-900/50 text-purple-300",
  index:  "bg-emerald-900/50 text-emerald-300",
  stock:  "bg-zinc-800 text-zinc-300",
};

export function SymbolSelector() {
  const symbol     = useChartStore(s => s.symbol);
  const symbolName = useChartStore(s => s.symbolName);
  const setSymbol  = useChartStore(s => s.setSymbol);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Symbol[]>(DEFAULT_SYMBOLS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults(DEFAULT_SYMBOLS);
      return;
    }
    // Primero filtra defaults instantáneamente
    const local = DEFAULT_SYMBOLS.filter(s =>
      s.symbol.toLowerCase().includes(q.toLowerCase()) ||
      s.name.toLowerCase().includes(q.toLowerCase()),
    );
    setResults(local);
    // Después busca en TwelveData si no hay match local
    if (local.length < 5) {
      setLoading(true);
      const id = setTimeout(async () => {
        try {
          const remote = await TwelveDataProvider.searchSymbols(q);
          // Excluimos crypto
          const filtered = remote.filter(r =>
            !r.name.toLowerCase().includes("bitcoin") &&
            !r.name.toLowerCase().includes("crypto") &&
            !r.type.toString().includes("crypto") &&
            r.type !== "stock", // si no querés stocks, dejá este filtro; quitalo si los querés
          );
          setResults([...local, ...filtered.slice(0, 20)]);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 300);
      return () => clearTimeout(id);
    }
  }, [query, open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
      >
        <Search size={14} className="text-zinc-500" />
        <span className="font-semibold text-white">{symbol}</span>
        <span className="hidden text-xs text-zinc-500 md:inline">{symbolName}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-96 rounded border border-zinc-800 bg-zinc-950 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 p-2">
              <Search size={14} className="text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="EUR/USD, XAU/USD, ES=F…"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
              {loading && <span className="text-xs text-zinc-500">buscando…</span>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {results.map(r => (
                <button
                  key={`${r.symbol}-${r.exchange ?? ""}`}
                  onClick={() => { setSymbol(r.symbol, r.name); setOpen(false); setQuery(""); }}
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-900 px-3 py-2 text-left text-sm hover:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{r.symbol}</div>
                    <div className="truncate text-xs text-zinc-500">{r.name}</div>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${TYPE_BADGE[r.type] ?? "bg-zinc-800"}`}>
                    {r.type}
                  </span>
                </button>
              ))}
              {results.length === 0 && (
                <div className="p-4 text-center text-sm text-zinc-500">Sin resultados</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
