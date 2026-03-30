"use client";

/**
 * CandlestickChart — OHLCV candlestick chart with volume overlay.
 * Uses TradingView's lightweight-charts library.
 * Colours match the Shire/wizard design palette.
 */

import { useEffect, useRef, useState } from "react";

interface OHLCVBar {
  time: string;  // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol: string;
  height?: number;
}

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function CandlestickChart({ symbol, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [range, setRange] = useState(90); // default 3 months
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function loadChart() {
      setLoading(true);
      setError(null);

      try {
        // Fetch OHLCV data
        const res = await fetch(`/api/ohlcv?symbol=${encodeURIComponent(symbol)}&days=${range}`);
        if (!res.ok) throw new Error("Failed to load chart data");
        const bars: OHLCVBar[] = await res.json();

        if (cancelled || !containerRef.current || bars.length < 2) {
          if (bars.length < 2) setError("no_data");
          setLoading(false);
          return;
        }

        // Get theme colours from CSS
        const style = getComputedStyle(document.documentElement);
        const bg = style.getPropertyValue("--bg").trim() || "#0e110f";
        const text = style.getPropertyValue("--text-muted").trim() || "#55504a";
        const green = style.getPropertyValue("--green").trim() || "#6db87a";
        const red = style.getPropertyValue("--red").trim() || "#c75c5c";
        const surface = style.getPropertyValue("--surface").trim() || "#171c18";

        const { createChart, CandlestickSeries, HistogramSeries } = await import("lightweight-charts");

        // Clear previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
          layout: { background: { color: bg }, textColor: text, fontFamily: "Inter, sans-serif", fontSize: 11 },
          grid: { vertLines: { color: surface }, horzLines: { color: surface } },
          crosshair: { mode: 0 },
          rightPriceScale: { borderColor: surface },
          timeScale: { borderColor: surface, timeVisible: false },
        });

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: green,
          downColor: red,
          borderUpColor: green,
          borderDownColor: red,
          wickUpColor: green,
          wickDownColor: red,
        });

        candleSeries.setData(bars.map(b => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })));

        // Volume series
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });

        chart.priceScale("volume").applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });

        volumeSeries.setData(bars.map(b => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? green + "40" : red + "40",
        })));

        chart.timeScale().fitContent();
        chartRef.current = chart;

        // Resize observer
        const observer = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        observer.observe(containerRef.current);

        setLoading(false);

        return () => { observer.disconnect(); };
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "Chart failed"); setLoading(false); }
      }
    }

    loadChart();

    return () => { cancelled = true; if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [symbol, range, height]);

  // Hide entirely when no data available for this asset
  if (!loading && error === "no_data") return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Price chart</p>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className="pill transition-colors" style={{
                background: range === r.days ? "var(--accent)" : "var(--surface-hover)",
                color: range === r.days ? "white" : "var(--text-muted)",
                fontSize: 10,
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} style={{ height, borderRadius: "var(--radius)", overflow: "hidden" }}>
        {loading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} />
          </div>
        )}
        {error && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="caption" style={{ color: "var(--text-muted)" }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
