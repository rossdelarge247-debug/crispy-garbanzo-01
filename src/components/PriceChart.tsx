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
  color = "#1b1b1b",
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
        textColor: "#aeaeb2",
      },
      grid: {
        vertLines: { color: "#f2f0ed" },
        horzLines: { color: "#f2f0ed" },
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
