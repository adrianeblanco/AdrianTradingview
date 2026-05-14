// src/lib/drawing/types.ts
export type Point = { time: number; price: number };

export type DrawingBase = {
  id: string;
  color: string;
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
  p1: Point;  // 0% (low)
  p2: Point;  // 100% (high)
  levels: number[];  // [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618]
};

export type OrderBox = DrawingBase & {
  kind: "order";
  side: "long" | "short";
  entry: number;
  stop: number;
  target: number;
  time: number; // donde se ancla horizontalmente
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
