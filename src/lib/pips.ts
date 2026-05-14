// src/lib/pips.ts
// Cuántos decimales y cuánto vale un pip según el instrumento.
//
// Forex no-JPY: 1 pip = 0.0001 (4to decimal). Pipette = 0.00001
// Forex JPY:   1 pip = 0.01   (2do decimal).  Pipette = 0.001
// Oro (XAU):   1 pip = 0.1    (1er decimal después del punto)
// Plata (XAG): 1 pip = 0.01
// Índices/Futuros: cada punto = 1 "pip" (sin convención estándar)

export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 0.01;
  if (s.startsWith("XAU")) return 0.1;
  if (s.startsWith("XAG")) return 0.01;
  if (s.startsWith("XPT") || s.startsWith("XPD")) return 0.1;
  if (s.includes("/")) return 0.0001; // forex estándar
  return 1; // índices, futuros
}

// Cuántos decimales mostrar
export function priceDecimals(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 3;
  if (s.startsWith("XAU") || s.startsWith("XAG") || s.startsWith("XPT") || s.startsWith("XPD")) return 2;
  if (s.includes("/")) return 5;
  return 2;
}

// Diferencia en pips entre dos precios (signo incluido)
export function diffPips(symbol: string, from: number, to: number): number {
  return (to - from) / pipSize(symbol);
}

// Formato bonito: "+44.7 pips" o "-22.3 pips"
export function formatPips(symbol: string, from: number, to: number): string {
  const d = diffPips(symbol, from, to);
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(1)} pips`;
}
