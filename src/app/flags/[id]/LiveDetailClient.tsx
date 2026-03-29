"use client";

/**
 * LiveDetailClient — client wrapper for the flag detail page.
 *
 * Owns the live price state and passes it down to:
 *  - LivePriceTicker (display)
 *  - DryRunPanel (entry price)
 *  - PriceChart (live tick extension)
 *
 * This pattern keeps the server component (page.tsx) fast while the
 * client enriches it progressively once JS hydrates.
 */

import { useState, useCallback } from "react";
import LivePriceTicker from "@/components/LivePriceTicker";
import PriceChart from "@/components/PriceChart";
import DryRunPanel from "./DryRunPanel";
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
  const [isLive, setIsLive] = useState(false);

  const handlePriceUpdate = useCallback((price: number) => {
    setLivePrice(price);
    setIsLive(true);
  }, []);

  return (
    <>
      {/* Live price hero */}
      <div className="mb-8 p-5 rounded-xl border border-surface-border bg-surface-raised">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
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

      {/* Simulation panel — uses live price as entry */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Test this trade</h2>
        <DryRunPanel
          asset={symbol}
          assetName={assetName}
          direction={direction}
          entryPrice={historicalEntryPrice}
          livePrice={livePrice}
          isLive={isLive}
        />
      </section>

      {/* Price chart — with live tick appended */}
      {chartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Price chart</h2>
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
