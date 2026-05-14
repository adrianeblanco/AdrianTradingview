// src/components/settings/SettingsButton.tsx
"use client";
import { Settings } from "lucide-react";
import { useChartStore } from "@/lib/store/chart-store";

export function SettingsButton() {
  const toggle = useChartStore(s => s.toggleSettings);
  return (
    <button
      onClick={toggle}
      title="Configuración"
      className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white"
    >
      <Settings size={14} />
    </button>
  );
}
