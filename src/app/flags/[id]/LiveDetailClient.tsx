"use client";

/**
 * LiveDetailClient — client wrapper for the flag detail page.
 *
 * Owns the live price state and intelligence context, passing them to:
 *  - LivePriceTicker (display)
 *  - ScenarioTestPanel (backtest with regime context)
 *  - PriceChart (live tick extension)
 */

import { useState, useCallback, useEffect } from "react";
import LivePriceTicker from "@/components/LivePriceTicker";
import PriceChart from "@/components/PriceChart";
import ScenarioTestPanel from "./ScenarioTestPanel";
import type { Direction } from "@/types";
import type { RegimeType } from "@/services/intelligence/regime";

interface IntelligenceContext {
  regime: RegimeType;
  regimeLabel: string;
  confidenceGrade: string;
  confidenceScore: number;
}

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
  flagId,
}: LiveDetailClientProps) {
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [intel, setIntel] = useState<IntelligenceContext | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    setLivePrice(price);
    setIsLive(true);
  }, []);

  // Fetch intelligence context for regime + confidence
  useEffect(() => {
    fetch(`/api/intelligence/${flagId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setIntel({
          regime: data.regime?.regime ?? "unknown",
          regimeLabel: data.regime?.badge ?? "",
          confidenceGrade: data.confidence?.grade ?? "",
          confidenceScore: data.confidence?.finalScore ?? 0,
        });
      })
      .catch(() => {});
  }, [flagId]);

  return (
    <>
      {/* Live price hero */}
      <div className="mb-8 p-5 rounded-xl border border-[--border] bg-[--surface-raised]">
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

      {/* Scenario test — uses live price + regime context */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Test this trade</h2>
        <ScenarioTestPanel
          asset={symbol}
          assetName={assetName}
          direction={direction}
          entryPrice={historicalEntryPrice}
          livePrice={livePrice}
          isLive={isLive}
          regime={intel?.regime}
          regimeLabel={intel?.regimeLabel}
          confidenceGrade={intel?.confidenceGrade}
          confidenceScore={intel?.confidenceScore}
        />
      </section>

      {/* Price chart — with live tick appended */}
      {chartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Price chart</h2>
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
