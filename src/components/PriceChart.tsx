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
  color = "#1a1a2e",
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
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#f0f1f4" },
        horzLines: { color: "#f0f1f4" },
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
