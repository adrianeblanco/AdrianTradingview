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
} from "lightweight-charts";
import { useChartStore } from "@/lib/store/chart-store";
import { TwelveDataProvider } from "@/lib/data/twelvedata";
import { loadDukascopyRange } from "@/lib/data/dukascopy-csv";
import { ema, closesOf } from "@/lib/indicators";
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
  const [ready, setReady] = useState(false);

  const symbol       = useChartStore(s => s.symbol);
  const timeframe    = useChartStore(s => s.timeframe);
  const indicators   = useChartStore(s => s.indicators);
  const backtestMode = useChartStore(s => s.backtestMode);
  const yStart       = useChartStore(s => s.backtestYearStart);
  const yEnd         = useChartStore(s => s.backtestYearEnd);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#131722" },     // azul oscuro TradingView
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#363c4e",
      },
      rightPriceScale: { borderColor: "#363c4e" },
      crosshair: {
        mode: 1,
        vertLine: { color: "#758696", style: 3, width: 1 },
        horzLine: { color: "#758696", style: 3, width: 1 },
      },
      autoSize: true,
    });
    chartRef.current = chart;

    // Velas estilo TradingView: alcista = hueca/blanca, bajista = azul sólido
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "rgba(255, 255, 255, 0)",   // alcista: hueca (sin relleno)
      downColor: "#2962ff",                  // bajista: azul TradingView
      borderUpColor: "#ffffff",
      borderDownColor: "#2962ff",
      wickUpColor: "#ffffff",
      wickDownColor: "#2962ff",
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(255,255,255,0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (range) {
        setVisibleRange({ from: Number(range.from), to: Number(range.to) });
      }
    });

    setReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      setReady(false);
    };
  }, []);

  // Cargar datos
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let data: Candle[] = [];
        if (backtestMode) {
          const cleanSym = symbol.replace("/", "").replace("=F", "");
          data = await loadDukascopyRange(cleanSym, timeframe.value, yStart, yEnd);
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
    return () => { cancelled = true; };
  }, [symbol, timeframe, backtestMode, yStart, yEnd]);

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
          color: c.close >= c.open
            ? "rgba(255, 255, 255, 0.25)"
            : "rgba(41, 98, 255, 0.4)",
        })),
      );
    }
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;
    const closes = closesOf(candles);

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

    if (indicators.ema20)  addEMA(20,  "#ff9800", "ema20");
    if (indicators.ema50)  addEMA(50,  "#f23645", "ema50");
    if (indicators.ema200) addEMA(200, "#9c27b0", "ema200");

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

      {ready && chartRef.current && candleSeriesRef.current && visibleRange && (
        <>
          <SessionsOverlay
            chart={chartRef.current}
            visibleRange={visibleRange}
          />
          <DrawingsOverlay
            chart={chartRef.current}
            series={candleSeriesRef.current}
            candles={candles}
          />
        </>
      )}
    </div>
  );
}
