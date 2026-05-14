// src/lib/drawing/types.ts
export type Point = { time: number; price: number };

export type LineStyle = "solid" | "dashed" | "dotted";

export type DrawingBase = {
  id: string;
  color: string;
  width?: number;
  lineStyle?: LineStyle;
};

export type TrendLine = DrawingBase & {
  kind: "trendline";
  p1: Point;
  p2: Point;
};

export type HorizontalLine = DrawingBase & {
  kind: "hline";
  price: number;
};

export type Measure = DrawingBase & {
  kind: "measure";
  p1: Point;
  p2: Point;
};

export type Fibonacci = DrawingBase & {
  kind: "fib";
  p1: Point;
  p2: Point;
  levels: number[];
};

export type OrderBox = DrawingBase & {
  kind: "order";
  side: "long" | "short";
  entry: number;
  stop: number;
  target: number;
  time: number;          // anclaje horizontal (inicio)
  endTime?: number;      // si está definido, las líneas terminan acá; si no, van al borde
  entryColor?: string;   // override del color de la línea de entry
  stopColor?: string;
  targetColor?: string;
  size?: number;         // tamaño en lotes (informativo, default 1)
};

export type Drawing = TrendLine | HorizontalLine | Measure | Fibonacci | OrderBox;

export type DrawingTool =
  | "none" | "trendline" | "hline" | "measure" | "fib"
  | "order-long" | "order-short";

export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];

export const COLOR_PALETTE = [
  "#60a5fa", "#22c55e", "#ef4444", "#facc15",
  "#a78bfa", "#f97316", "#ec4899", "#ffffff",
];

export const WIDTHS = [0.5, 1, 1.5, 2, 3, 4];

export function dashArray(style?: LineStyle): string {
  if (style === "dashed") return "6,4";
  if (style === "dotted") return "2,3";
  return "";
}
