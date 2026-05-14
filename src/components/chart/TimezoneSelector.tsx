// src/components/chart/TimezoneSelector.tsx
"use client";
import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useSettingsStore, TIMEZONES, getTimezone } from "@/lib/store/settings-store";

export function TimezoneSelector() {
  const tzId = useSettingsStore(s => s.timezoneId);
  const setKey = useSettingsStore(s => s.set);
  const [open, setOpen] = useState(false);
  const current = getTimezone(tzId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        title="Zona horaria"
      >
        <Globe size={13} />
        <span className="font-mono">{current.label.split(" · ")[0]}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
            {TIMEZONES.map(tz => (
              <button
                key={tz.id}
                onClick={() => { setKey("timezoneId", tz.id); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-zinc-900
                  ${tz.id === tzId ? "text-blue-400" : "text-zinc-300"}`}
              >
                <span>{tz.label}</span>
                {tz.id === tzId && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
