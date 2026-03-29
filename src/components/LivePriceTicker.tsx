"use client";

/**
 * LivePriceTicker — polls /api/quote/[symbol] and displays a live price.
 *
 * Updates every 10s for crypto (24/7), 30s for other assets.
 * Shows price, change %, a direction arrow, and a "live" pulse dot.
 * Flashes the price briefly on each update.
 *
 * Exposes the current price via `onPriceUpdate` callback so parent
 * components (DryRunPanel, IntelligencePanel) can consume it.
 */

import { useEffect, useState, useRef, useCallback } from "react";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: "live" | "mock";
}

interface LivePriceTickerProps {
  symbol: string;
  assetName: string;
  onPriceUpdate?: (price: number, change: number, changePercent: number) => void;
  size?: "sm" | "md" | "lg";
  showSource?: boolean;
}

function isCrypto(symbol: string): boolean {
  return symbol.endsWith("-USD") && !["SPY", "QQQ", "DIA", "IWM"].includes(symbol);
}

function formatPrice(price: number, symbol: string): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

export default function LivePriceTicker({
  symbol,
  assetName,
  onPriceUpdate,
  size = "md",
  showSource = false,
}: LivePriceTickerProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(false);
  const prevPrice = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollInterval = isCrypto(symbol) ? 10000 : 30000;

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
      if (!res.ok) return;
      const data: Quote = await res.json();
      setQuote(data);
      setLoading(false);

      // Flash animation on price change
      if (prevPrice.current !== null && prevPrice.current !== data.price) {
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }
      prevPrice.current = data.price;

      onPriceUpdate?.(data.price, data.change, data.changePercent);
    } catch {
      setLoading(false);
    }
  }, [symbol, onPriceUpdate]);

  useEffect(() => {
    fetchQuote();
    intervalRef.current = setInterval(fetchQuote, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuote, pollInterval]);

  const priceClass =
    !quote ? "" :
    quote.changePercent > 0 ? "price-up" :
    quote.changePercent < 0 ? "price-down" : "price-flat";

  const arrow = !quote ? "" : quote.changePercent > 0 ? "↑" : quote.changePercent < 0 ? "↓" : "→";

  if (loading) {
    return (
      <div className={`flex items-baseline gap-3 ${size === "lg" ? "py-2" : ""}`}>
        <div className="skeleton h-8 w-32 rounded bg-surface-overlay" />
        <div className="skeleton h-4 w-16 rounded bg-surface-overlay" />
      </div>
    );
  }

  if (!quote) return null;

  const priceSizes = {
    sm: "text-xl font-bold",
    md: "text-2xl font-bold",
    lg: "text-4xl font-bold",
  };

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      {/* Price */}
      <span
        className={`${priceSizes[size]} text-text-primary tabular-nums tracking-tight transition-colors ${flash ? "price-tick rounded px-1" : ""}`}
        style={{ letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
      >
        {size === "lg" && <span className="text-text-muted text-xl font-medium mr-1">$</span>}
        {formatPrice(quote.price, symbol)}
      </span>

      {/* Change */}
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold tabular-nums ${priceClass}`}>
          {arrow} {quote.changePercent > 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
        </span>
        <span className={`text-xs tabular-nums ${priceClass} opacity-70`}>
          ({quote.change > 0 ? "+" : ""}{formatPrice(Math.abs(quote.change), symbol)})
        </span>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse-dot ${
            quote.source === "live" ? "bg-conviction-high" : "bg-text-muted"
          }`}
        />
        <span className="text-xs text-text-muted">
          {quote.source === "live" ? "Live" : "Demo"}
          {showSource && ` · ${new Date(quote.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
        </span>
      </div>
    </div>
  );
}
