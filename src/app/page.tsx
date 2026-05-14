// src/app/page.tsx
import { SymbolSelector } from "@/components/chart/SymbolSelector";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";
import { TimezoneSelector } from "@/components/chart/TimezoneSelector";
import { IndicatorMenu } from "@/components/chart/IndicatorMenu";
import { SessionsPanel } from "@/components/sessions/SessionsPanel";
import { BacktestPanel } from "@/components/backtest/BacktestPanel";
import { DrawingToolbar } from "@/components/drawing/DrawingToolbar";
import { HotkeyHint } from "@/components/drawing/HotkeyHint";
import { UndoRedoButtons } from "@/components/drawing/UndoRedoButtons";
import { PriceChart } from "@/components/chart/PriceChart";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";

export default function Page() {
  return (
    <div className="flex h-screen w-screen flex-col bg-[#131722] text-zinc-100">
      <header className="flex h-12 items-center gap-3 border-b border-[#363c4e] bg-[#1e222d] px-3">
        <span className="font-bold text-blue-400">AdrianTV</span>
        <SymbolSelector />
        <div className="mx-2 h-6 w-px bg-[#363c4e]" />
        <TimeframeSelector />
        <div className="mx-2 h-6 w-px bg-[#363c4e]" />
        <UndoRedoButtons />
        <div className="mx-2 h-6 w-px bg-[#363c4e]" />
        <IndicatorMenu />
        <BacktestPanel />
        <div className="flex-1" />
        <TimezoneSelector />
        <div className="mx-2 h-6 w-px bg-[#363c4e]" />
        <SessionsPanel />
        <div className="mx-2 h-6 w-px bg-[#363c4e]" />
        <SettingsButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DrawingToolbar />
        <main className="relative flex-1">
          <PriceChart />
          <HotkeyHint />
        </main>
      </div>

      <footer className="flex h-6 items-center justify-between border-t border-[#363c4e] bg-[#1e222d] px-3 text-[10px] text-zinc-500">
        <span>Datos: TwelveData + Dukascopy CSV</span>
        <span>Powered by lightweight-charts (TradingView, Apache 2.0)</span>
      </footer>

      <SettingsDrawer />
    </div>
  );
}
