"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { AnalysisResponse, LinePoint } from "@/types";

const COLORS = {
  up: "#2EBD85",
  down: "#F6465D",
  grid: "#151C2C",
  border: "#1E2638",
  text: "#8B94A7",
  ink: "#E6EAF2",
  level: "#3E4A63",
  ema20: "#53B1FD",
  ema50: "#E8A33D",
  ema200: "#A8B3C9",
};

const EMA_LEGEND = [
  { label: "EMA 20", color: COLORS.ema20 },
  { label: "EMA 50", color: COLORS.ema50 },
  { label: "EMA 200", color: COLORS.ema200 },
];

interface ChartSeries {
  candles: ISeriesApi<"Candlestick">;
  ema20: ISeriesApi<"Line">;
  ema50: ISeriesApi<"Line">;
  ema200: ISeriesApi<"Line">;
}

export default function PriceChart({ data }: { data: AnalysisResponse }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ChartSeries | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const needsInitialViewRef = useRef(true);

  // Chart lifecycle — recreated only when the timeframe changes, so the
  // 60s data refresh never wipes the user's pan/zoom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // next/font registers the mono face under a generated family name, and a
    // canvas font string can't contain var() — resolve it from the CSS var.
    const monoFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-plex-mono")
        .trim() || "ui-monospace, monospace";

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: monoFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: data.timeframe !== "1d",
        secondsVisible: false,
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
    });

    const addEma = (color: string, lineWidth: 1 | 2) =>
      chart.addSeries(LineSeries, {
        color,
        lineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

    chartRef.current = chart;
    seriesRef.current = {
      candles,
      ema20: addEma(COLORS.ema20, 1),
      ema50: addEma(COLORS.ema50, 1),
      ema200: addEma(COLORS.ema200, 2),
    };
    priceLinesRef.current = [];
    needsInitialViewRef.current = true;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [data.timeframe]);

  // Data updates — refresh the existing series and level lines in place.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    series.candles.setData(
      data.candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    );
    const toLine = (points: LinePoint[]) =>
      points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
    series.ema20.setData(toLine(data.overlays.ema20));
    series.ema50.setData(toLine(data.overlays.ema50));
    series.ema200.setData(toLine(data.overlays.ema200));

    for (const line of priceLinesRef.current) {
      series.candles.removePriceLine(line);
    }
    priceLinesRef.current = [];

    const addLevel = (
      price: number | null,
      color: string,
      title: string,
      lineStyle: LineStyle,
    ) => {
      if (price === null) return;
      priceLinesRef.current.push(
        series.candles.createPriceLine({
          price,
          color,
          lineWidth: 1,
          lineStyle,
          axisLabelVisible: true,
          title,
        }),
      );
    };

    addLevel(data.snapshot.resistance, COLORS.level, "RES", LineStyle.Dotted);
    addLevel(data.snapshot.support, COLORS.level, "SUP", LineStyle.Dotted);
    if (data.signal.plan) {
      addLevel(data.signal.plan.entry, COLORS.ink, "ENTRY", LineStyle.Solid);
      addLevel(data.signal.plan.stopLoss, COLORS.down, "STOP", LineStyle.Dashed);
      addLevel(data.signal.plan.takeProfit, COLORS.up, "TARGET", LineStyle.Dashed);
    }

    if (needsInitialViewRef.current) {
      needsInitialViewRef.current = false;
      const barCount = data.candles.length;
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, barCount - 110),
        to: barCount + 4,
      });
    }
  }, [data]);

  return (
    <div className="relative">
      <div className="absolute left-3 top-2 z-10 flex gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {EMA_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
      <div ref={containerRef} className="h-[380px] w-full sm:h-[460px]" />
    </div>
  );
}
