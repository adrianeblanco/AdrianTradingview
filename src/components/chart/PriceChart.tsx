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
import { useSettingsStore } from "@/lib/store/settings-store";
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
  const symbolName   = useChartStore(s => s.symbolName);
  const timeframe    = useChartStore(s => s.timeframe);
  const indicators   = useChartStore(s => s.indicators);
  const backtestMode = useChartStore(s => s.backtestMode);
  const yStart       = useChartStore(s => s.backtestYearStart);
  const yEnd         = useChartStore(s => s.backtestYearEnd);
  const chartLocked  = useChartStore(s => s.chartLocked);

  // Settings (re-render cuando cambian)
  const settings = useSettingsStore();

  // ---- Crear chart una sola vez ----
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: settings.bgColor },
        textColor: settings.textColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
      },
      grid: {
        vertLines: { color: settings.gridVertColor, visible: settings.gridVisible },
        horzLines: { color: settings.gridHorzColor, visible: settings.gridVisible },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: settings.timeAxisBorderColor,
      },
      rightPriceScale: {
        borderColor: settings.priceAxisBorderColor,
        scaleMargins: { top: 0.08, bottom: 0.15 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: settings.crosshairColor, style: 3, width: 1 },
        horzLine: { color: settings.crosshairColor, style: 3, width: 1 },
      },
      autoSize: true,
      // Watermark hace falta llamada extra en lightweight-charts v5 con createTextWatermark
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: settings.upColor,
      borderUpColor: settings.upBorderColor,
      wickUpColor: settings.upWickColor,
      downColor: settings.downColor,
      borderDownColor: settings.downBorderColor,
      wickDownColor: settings.downWickColor,
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(255,255,255,0.25)",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Aplicar settings reactivamente al chart ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: {
        background: { color: settings.bgColor },
        textColor: settings.textColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
      },
      grid: {
        vertLines: { color: settings.gridVertColor, visible: settings.gridVisible },
        horzLines: { color: settings.gridHorzColor, visible: settings.gridVisible },
      },
      timeScale: { borderColor: settings.timeAxisBorderColor },
      rightPriceScale: { borderColor: settings.priceAxisBorderColor },
      crosshair: {
        vertLine: { color: settings.crosshairColor },
        horzLine: { color: settings.crosshairColor },
      },
    });
    candleSeriesRef.current?.applyOptions({
      upColor: settings.upColor,
      borderUpColor: settings.upBorderColor,
      wickUpColor: settings.upWickColor,
      downColor: settings.downColor,
      borderDownColor: settings.downBorderColor,
      wickDownColor: settings.downWickColor,
      ...(settings.priceDecimals >= 0 ? {
        priceFormat: {
          type: "price" as const,
          precision: settings.priceDecimals,
          minMove: 1 / Math.pow(10, settings.priceDecimals),
        },
      } : {}),
    });
  }, [settings]);

  // ---- Aplicar candado al chart ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      handleScroll: !chartLocked,
      handleScale: !chartLocked,
    });
  }, [chartLocked]);

  // ---- Cargar datos ----
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

  // ---- Pintar velas ----
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
            : "rgba(91, 156, 246, 0.4)",
        })),
      );
    }
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // ---- Indicadores EMA ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;
    const closes = closesOf(candles);

    Object.values(emaRefs.current).forEach(s => { if (s) chart.removeSeries(s); });
    emaRefs.current = {};

    const addEMA = (period: number, color: string, key: string) => {
      const data = ema(closes, period);
      const s = chart.addSeries(LineSeries, {
        color, lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        candles
          .map((c, i) => ({ time: c.time as Time, value: data[i] }))
          .filter(p => p.value !== null) as { time: Time; value: number }[],
      );
      emaRefs.current[key] = s;
    };

    if (indicators.ema20)  addEMA(20,  "#ff9800", "ema20");
    if (indicators.ema50)  addEMA(50,  "#f23645", "ema50");
    if (indicators.ema200) addEMA(200, "#9c27b0", "ema200");

    if (volSeriesRef.current) {
      volSeriesRef.current.applyOptions({ visible: indicators.volume });
    }
  }, [candles, indicators]);

  return (
    <div className="relative h-full w-full" style={{ background: settings.bgColor }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm text-white">
          Cargando datos…
        </div>
      )}

      {/* Watermark del símbolo */}
      {settings.watermarkVisible && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"
             style={{ zIndex: 1 }}>
          <div className="select-none text-center">
            <div className="text-7xl font-bold text-white/[0.03]">{symbol}</div>
            <div className="mt-2 text-base text-white/[0.04]">{symbolName}</div>
          </div>
        </div>
      )}

      {/* Indicador de candado activo */}
      {chartLocked && (
        <div className="pointer-events-none absolute right-16 top-3 z-20 rounded bg-orange-600/90 px-2 py-1 text-[10px] font-semibold text-white shadow">
          🔒 Chart bloqueado
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
