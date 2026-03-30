"use client";

/**
 * LiveDetailClient — live price display and chart.
 *
 * Simplified: just shows the live price ticker and price chart.
 * The backtest and trade plan are now pre-computed and shown
 * directly in the server-rendered page.
 */

import { useState, useCallback } from "react";
import LivePriceTicker from "@/components/LivePriceTicker";
import PriceChart from "@/components/PriceChart";
import type { Direction } from "@/types";

interface LiveDetailClientProps {
  symbol: string;
  assetName: string;
  direction: Direction;
  historicalEntryPrice: number;
  chartData: { time: string; value: number }[];
  flagId: string;
}

export default function LiveDetailClient({
  symbol,
  assetName,
  direction,
  historicalEntryPrice,
  chartData,
  flagId: _flagId,
}: LiveDetailClientProps) {
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    setLivePrice(price);
  }, []);

  return (
    <>
      {/* Live price */}
      <div className="mb-8 p-5 rounded-lg card">
        <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wider mb-2">
          Current price
        </p>
        <LivePriceTicker
          symbol={symbol}
          assetName={assetName}
          onPriceUpdate={handlePriceUpdate}
          size="lg"
          showSource
        />
      </div>

      {/* Price chart */}
      {chartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[--text] mb-3">Price chart</h2>
          <PriceChart
            data={chartData}
            livePrice={livePrice ?? undefined}
            height={280}
            color="#7c5bf0"
          />
        </section>
      )}
    </>
  );
}
