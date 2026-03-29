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
  height?: number;
  color?: string;
  showVolume?: boolean;
}

export default function PriceChart({
  data,
  height = 300,
  color = "#6366f1",
  showVolume: _showVolume,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#131720" },
        textColor: "#4b5468",
      },
      grid: {
        vertLines: { color: "#1a1f2b" },
        horzLines: { color: "#1a1f2b" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 6,
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: color + "33",
      bottomColor: "transparent",
      lineColor: color,
      lineWidth: 2,
    });

    seriesRef.current = areaSeries;
    areaSeries.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, height, color]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-surface-border overflow-hidden"
    />
  );
}
