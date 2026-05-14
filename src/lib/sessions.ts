// src/lib/sessions.ts
// Sesiones de Forex. Toda la lógica en UTC.
// Ahora con `opacity` separada para que el usuario pueda controlar intensidad
// sin tocar el color base.

export type Session = {
  id: string;
  label: string;
  startHourUTC: number;
  startMinUTC: number;
  endHourUTC: number;
  endMinUTC: number;
  color: string;       // color base (hex)
  opacity: number;     // 0-1, intensidad del relleno
  borderOpacity: number; // 0-1, intensidad del borde
  enabled: boolean;
  emphasis?: boolean;
};

export const DEFAULT_SESSIONS: Session[] = [
  {
    id: "london",
    label: "London Killzone",
    startHourUTC: 8, startMinUTC: 0,
    endHourUTC: 11, endMinUTC: 0,
    color: "#388bfd",
    opacity: 0.08,
    borderOpacity: 0.35,
    enabled: true,
  },
  {
    id: "ny-killzone",
    label: "NY Killzone",
    startHourUTC: 12, startMinUTC: 0,
    endHourUTC: 15, endMinUTC: 0,
    color: "#ffb800",
    opacity: 0.18,
    borderOpacity: 0.65,
    enabled: true,
    emphasis: true,
  },
  {
    id: "london-close",
    label: "London Close",
    startHourUTC: 15, startMinUTC: 0,
    endHourUTC: 17, endMinUTC: 0,
    color: "#f85149",
    opacity: 0.06,
    borderOpacity: 0.25,
    enabled: false,
  },
];

// Helper: hex + opacity → rgba string
export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function sessionForTime(t: number, sessions: Session[]): Session | null {
  const d = new Date(t * 1000);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  for (const s of sessions) {
    if (!s.enabled) continue;
    const start = s.startHourUTC * 60 + s.startMinUTC;
    const end = s.endHourUTC * 60 + s.endMinUTC;
    if (minutes >= start && minutes < end) return s;
  }
  return null;
}

export function sessionRangesInWindow(
  fromTime: number, toTime: number, sessions: Session[],
): Array<{ session: Session; from: number; to: number }> {
  const out: Array<{ session: Session; from: number; to: number }> = [];
  const dayMs = 86400 * 1000;
  const startDay = new Date(fromTime * 1000);
  startDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(toTime * 1000);
  endDay.setUTCHours(23, 59, 59, 999);

  for (let day = startDay.getTime(); day <= endDay.getTime(); day += dayMs) {
    const d = new Date(day);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    for (const s of sessions) {
      if (!s.enabled) continue;
      const from = Math.floor(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                 s.startHourUTC, s.startMinUTC) / 1000,
      );
      const to = Math.floor(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                 s.endHourUTC, s.endMinUTC) / 1000,
      );
      if (to < fromTime || from > toTime) continue;
      out.push({ session: s, from, to });
    }
  }
  return out;
}
