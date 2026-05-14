// src/components/sessions/SessionsPanel.tsx
"use client";
import { useChartStore } from "@/lib/store/chart-store";
import { hexWithAlpha } from "@/lib/sessions";

export function SessionsPanel() {
  const sessions       = useChartStore(s => s.sessions);
  const toggleSession  = useChartStore(s => s.toggleSession);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-zinc-500">Sesiones</span>
      {sessions.map(s => (
        <button
          key={s.id}
          onClick={() => toggleSession(s.id)}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors
            ${s.enabled
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:bg-zinc-900"}`}
          title={`${s.startHourUTC.toString().padStart(2,"0")}:${s.startMinUTC.toString().padStart(2,"0")} - ${s.endHourUTC.toString().padStart(2,"0")}:${s.endMinUTC.toString().padStart(2,"0")} UTC`}
        >
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: s.enabled ? hexWithAlpha(s.color, s.borderOpacity) : "#3f3f46" }}
          />
          {s.label}
        </button>
      ))}
    </div>
  );
}
