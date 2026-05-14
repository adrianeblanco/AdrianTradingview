// src/lib/drawing/types.ts
export type Point = { time: number; price: number };

export type LineStyle = "solid" | "dashed" | "dotted";

export type DrawingBase = {
  id: string;
  color: string;
  width?: number;          // grosor en px (default 1.5)
  lineStyle?: LineStyle;   // estilo de línea (default solid)
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
  time: number;
};

export type Drawing = TrendLine | HorizontalLine | Measure | Fibonacci | OrderBox;

export type DrawingTool =
  | "none"
  | "trendline"
  | "hline"
  | "measure"
  | "fib"
  | "order-long"
  | "order-short";

export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];

export const COLOR_PALETTE = [
  "#60a5fa", // azul
  "#22c55e", // verde
  "#ef4444", // rojo
  "#facc15", // amarillo
  "#a78bfa", // violeta
  "#f97316", // naranja
  "#ec4899", // rosa
  "#ffffff", // blanco
];

// Estilo SVG según LineStyle
export function dashArray(style?: LineStyle): string {
  if (style === "dashed") return "6,4";
  if (style === "dotted") return "2,3";
  return "";
}
