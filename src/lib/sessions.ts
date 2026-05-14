// src/lib/sessions.ts
// Marcado de sesiones de Forex sobre el chart.
// Horarios estándar (los más usados por ICT/SMC). Todos en UTC.
// El usuario puede ajustarlos en el panel.
//
// Estándar (no en daylight saving):
//   London Open:      08:00–11:00 UTC   (3:00–6:00 NY EST)
//   NY Killzone:      12:00–15:00 UTC   (7:00–10:00 NY EST)  <-- LA QUE INTERESA
//   NY AM Session:    13:30–16:00 UTC   (8:30–11:00 NY)
//   London Close:     15:00–17:00 UTC   (10:00–12:00 NY)
//
// Estos son los "Killzones" de ICT más populares.

export type Session = {
  id: string;
  label: string;
  startHourUTC: number;
  startMinUTC: number;
  endHourUTC: number;
  endMinUTC: number;
  color: string;       // rgba con alpha
  borderColor: string; // borde
  enabled: boolean;
  emphasis?: boolean;  // si true, se pinta más fuerte (caso NY Killzone)
};

export const DEFAULT_SESSIONS: Session[] = [
  {
    id: "london",
    label: "London Killzone",
    startHourUTC: 8, startMinUTC: 0,
    endHourUTC: 11, endMinUTC: 0,
    color: "rgba(56, 139, 253, 0.08)",
    borderColor: "rgba(56, 139, 253, 0.35)",
    enabled: true,
  },
  {
    id: "ny-killzone",
    label: "NY Killzone",
    startHourUTC: 12, startMinUTC: 0,
    endHourUTC: 15, endMinUTC: 0,
    color: "rgba(255, 184, 0, 0.18)",       // amarillo más fuerte
    borderColor: "rgba(255, 184, 0, 0.65)",
    enabled: true,
    emphasis: true,
  },
  {
    id: "london-close",
    label: "London Close",
    startHourUTC: 15, startMinUTC: 0,
    endHourUTC: 17, endMinUTC: 0,
    color: "rgba(248, 81, 73, 0.06)",
    borderColor: "rgba(248, 81, 73, 0.25)",
    enabled: false,
  },
];

// Para una vela dada (time en unix seconds, UTC), nos dice en qué sesión cae (o null)
export function sessionForTime(t: number, sessions: Session[]): Session | null {
  const d = new Date(t * 1000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const minutes = h * 60 + m;
  for (const s of sessions) {
    if (!s.enabled) continue;
    const start = s.startHourUTC * 60 + s.startMinUTC;
    const end = s.endHourUTC * 60 + s.endMinUTC;
    if (minutes >= start && minutes < end) return s;
  }
  return null;
}

// Calcula los rangos de tiempo (start, end en unix seconds) donde cada sesión
// activa estuvo abierta dentro del rango visible del chart.
// Esto lo usa el overlay para dibujar las bandas.
export function sessionRangesInWindow(
  fromTime: number,
  toTime: number,
  sessions: Session[],
): Array<{ session: Session; from: number; to: number }> {
  const out: Array<{ session: Session; from: number; to: number }> = [];

  // Recorremos día por día UTC
  const dayMs = 86400 * 1000;
  const startDay = new Date(fromTime * 1000);
  startDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(toTime * 1000);
  endDay.setUTCHours(23, 59, 59, 999);

  for (let day = startDay.getTime(); day <= endDay.getTime(); day += dayMs) {
    const d = new Date(day);
    const dow = d.getUTCDay(); // 0=domingo, 6=sábado: forex cerrado
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
      // Sólo si cae dentro de la ventana visible
      if (to < fromTime || from > toTime) continue;
      out.push({ session: s, from, to });
    }
  }

  return out;
}
