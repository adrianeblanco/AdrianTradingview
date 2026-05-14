// src/components/chart/PriceChart.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type LogicalRange,
} from "lightweight-charts";
import { useChartStore } from "@/lib/store/chart-store";
import { TwelveDataProvider } from "@/lib/data/twelvedata";
import { loadDukascopyRange } from "@/lib/data/dukascopy-csv";
import { ema, rsi, macd, closesOf } from "@/lib/indicators";
import type { Candle } from "@/lib/data/types";
import { SessionsOverlay } from "../sessions/SessionsOverlay";
import { DrawingsOverlay } from "../drawing/DrawingsOverlay";

export function PriceChart() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const emaRefs = useRef<Record<string, ISeriesApi<"Line"> | null>>({});

  const [candles, setCandles] = useState<Candle[]>([]);
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const symbol       = useChartStore(s => s.symbol);
  const timeframe    = useChartStore(s => s.timeframe);
  const indicators   = useChartStore(s => s.indicators);
  const backtestMode = useChartStore(s => s.backtestMode);
  const yStart       = useChartStore(s => s.backtestYearStart);
  const yEnd         = useChartStore(s => s.backtestYearEnd);

  // -------- Crear chart una sola vez --------
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0d1117" },
        textColor: "#c9d1d9",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#30363d",
      },
      rightPriceScale: { borderColor: "#30363d" },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a", wickDownColor: "#ef5350",
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    // Track visible range para overlays
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (range) {
        setVisibleRange({
          from: Number(range.from),
          to: Number(range.to),
        });
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // -------- Cargar datos al cambiar símbolo / timeframe / modo --------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let data: Candle[] = [];
        if (backtestMode) {
          // Histórico de Dukascopy: símbolo sin slash, ej "EUR/USD" -> "EURUSD"
          const cleanSym = symbol.replace("/", "").replace("=F", "");
          data = await loadDukascopyRange(cleanSym, timeframe.value, yStart, yEnd);
          if (data.length === 0) {
            console.warn("[backtest] CSVs no encontrados. Subí archivos a /public/historical/");
          }
        } else {
          data = await TwelveDataProvider.getCandles(symbol, timeframe.value, 500);
        }
        if (cancelled) return;
        setCandles(data);
      } catch (err) {
        console.error("[chart] error cargando datos:", err);
        if (!cancelled) setCandles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, backtestMode, yStart, yEnd]);

  // -------- Actualizar velas en el chart --------
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || candles.length === 0) return;
    series.setData(
      candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })),
    );
    if (volSeriesRef.current) {
      volSeriesRef.current.setData(
        candles.map(c => ({
          time: c.time as Time,
          value: c.volume ?? 0,
          color: c.close >= c.open ? "rgba(38, 166, 154, 0.5)" : "rgba(239, 83, 80, 0.5)",
        })),
      );
    }
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // -------- Indicadores --------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;
    const closes = closesOf(candles);

    // Limpiar líneas previas
    Object.values(emaRefs.current).forEach(s => { if (s) chart.removeSeries(s); });
    emaRefs.current = {};

    const addEMA = (period: number, color: string, key: string) => {
      const data = ema(closes, period);
      const series = chart.addSeries(LineSeries, {
        color, lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        candles
          .map((c, i) => ({ time: c.time as Time, value: data[i] }))
          .filter(p => p.value !== null) as { time: Time; value: number }[],
      );
      emaRefs.current[key] = series;
    };

    if (indicators.ema20)  addEMA(20,  "#2962ff", "ema20");
    if (indicators.ema50)  addEMA(50,  "#ff9800", "ema50");
    if (indicators.ema200) addEMA(200, "#e91e63", "ema200");

    if (volSeriesRef.current) {
      volSeriesRef.current.applyOptions({ visible: indicators.volume });
    }
  }, [candles, indicators]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm text-white">
          Cargando datos…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />

      {/* Overlays SVG que coordinan con el chart */}
      {chartRef.current && candleSeriesRef.current && visibleRange && (
        <>
          <SessionsOverlay
            chart={chartRef.current}
            visibleRange={visibleRange}
          />
          <DrawingsOverlay
            chart={chartRef.current}
            series={candleSeriesRef.current}
          />
        </>
      )}
    </div>
  );
}
