// src/app/page.tsx
import { SymbolSelector } from "@/components/chart/SymbolSelector";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";
import { IndicatorMenu } from "@/components/chart/IndicatorMenu";
import { SessionsPanel } from "@/components/sessions/SessionsPanel";
import { BacktestPanel } from "@/components/backtest/BacktestPanel";
import { DrawingToolbar } from "@/components/drawing/DrawingToolbar";
import { PriceChart } from "@/components/chart/PriceChart";

export default function Page() {
  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex h-12 items-center gap-3 border-b border-zinc-800 px-3">
        <span className="font-bold text-blue-400">AdrianTV</span>
        <SymbolSelector />
        <div className="mx-2 h-6 w-px bg-zinc-800" />
        <TimeframeSelector />
        <div className="mx-2 h-6 w-px bg-zinc-800" />
        <IndicatorMenu />
        <BacktestPanel />
        <div className="flex-1" />
        <SessionsPanel />
      </header>

      {/* Body: toolbar + chart */}
      <div className="flex flex-1 overflow-hidden">
        <DrawingToolbar />
        <main className="relative flex-1">
          <PriceChart />
        </main>
      </div>

      {/* Footer */}
      <footer className="flex h-6 items-center justify-between border-t border-zinc-800 px-3 text-[10px] text-zinc-500">
        <span>Datos: TwelveData + Dukascopy CSV</span>
        <span>Powered by lightweight-charts (TradingView, Apache 2.0)</span>
      </footer>
    </div>
  );
}
