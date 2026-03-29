"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  AreaSeries,
} from "lightweight-charts";

interface PriceChartProps {
  data: { time: string; value: number }[];
  livePrice?: number;   // optional live price tick to append
  height?: number;
  color?: string;
}

function getThemeColors() {
  // Read from CSS variables so chart matches current theme
  const style = getComputedStyle(document.documentElement);
  return {
    bg:   style.getPropertyValue("--chart-bg").trim()   || "#ffffff",
    grid: style.getPropertyValue("--chart-grid").trim() || "#f5f5f4",
    text: style.getPropertyValue("--chart-text").trim() || "#a8a29e",
  };
}

export default function PriceChart({
  data,
  livePrice,
  height = 280,
  color = "#7c5bf0",
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const colors = getThemeColors();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.grid, style: 0 },
        horzLines: { color: colors.grid, style: 0 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 7,
      },
      crosshair: {
        vertLine: { color: color + "60", labelBackgroundColor: color },
        horzLine: { color: color + "60", labelBackgroundColor: color },
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: color + "28",
      bottomColor: color + "04",
      lineColor: color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    seriesRef.current = areaSeries;

    // Merge historical data with live price
    const chartData = [...data];
    if (livePrice && chartData.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const last = chartData[chartData.length - 1];
      if (last.time !== today) {
        chartData.push({ time: today, value: livePrice });
      } else {
        chartData[chartData.length - 1] = { time: today, value: livePrice };
      }
    }

    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    // Re-apply theme colors when data-theme changes
    const themeObserver = new MutationObserver(() => {
      const c = getThemeColors();
      chart.applyOptions({
        layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
        grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height, color]);

  // Update live price without re-creating the chart
  useEffect(() => {
    if (!seriesRef.current || livePrice === undefined || data.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    seriesRef.current.update({ time: today as Parameters<typeof seriesRef.current.update>[0]["time"], value: livePrice });
  }, [livePrice, data.length]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-surface-border overflow-hidden bg-[--chart-bg]"
    />
  );
}
