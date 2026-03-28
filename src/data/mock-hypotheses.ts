import type { Hypothesis } from "@/types";

export const mockHypotheses: Hypothesis[] = [
  // === Flag: flag-oil-geo ===
  {
    id: "hyp-oil-1",
    flagId: "flag-oil-geo",
    title: "Sustained Escalation Drives Brent Above $95",
    direction: "long",
    summary:
      "If geopolitical tensions continue to escalate and OPEC+ maintains production discipline, Brent crude is likely to break above $95 within the next three weeks as supply risk premiums expand further.",
    rationale:
      "The combination of active military positioning, stalled diplomatic talks, and OPEC+ refusing to increase output creates a supply squeeze scenario. Historical analogs suggest that sustained geopolitical supply disruptions push crude 15-25% above pre-crisis levels before stabilizing.",
    confidenceScore: 75,
    invalidation:
      "Ceasefire agreement or OPEC emergency production increase",
    timeHorizon: "weeks",
    timeHorizonDays: 21,
    status: "active",
    suggestedAction: "Run analog test against 2022 energy crisis",
    createdAt: "2026-03-15T09:00:00Z",
  },
  {
    id: "hyp-oil-2",
    flagId: "flag-oil-geo",
    title: "Diplomatic Resolution Causes Price Retreat",
    direction: "short",
    summary:
      "A surprise diplomatic breakthrough or de-escalation could unwind the geopolitical risk premium rapidly, sending Brent back toward the $78-82 range within days.",
    rationale:
      "Geopolitical premiums are inherently fragile — they can evaporate overnight on a single headline. Backchannel negotiations are ongoing, and there is historical precedent for sudden resolutions that catch the market off-guard. The current premium of ~$8-10 in Brent is vulnerable to a swift unwind.",
    confidenceScore: 30,
    invalidation:
      "Further military escalation or new sanctions",
    timeHorizon: "weeks",
    timeHorizonDays: 21,
    status: "active",
    suggestedAction: "Monitor diplomatic channels",
    createdAt: "2026-03-15T09:30:00Z",
  },
  {
    id: "hyp-oil-3",
    flagId: "flag-oil-geo",
    title: "Volatility Expansion Without Clear Direction",
    direction: "neutral",
    summary:
      "Conflicting signals — escalation headlines vs. quiet diplomatic efforts — could keep oil in a wide $82-95 range with elevated volatility, without a clean directional breakout.",
    rationale:
      "Markets may not resolve the uncertainty cleanly in one direction. Alternating escalation and de-escalation headlines create whipsaw conditions that frustrate directional bets. Implied volatility in crude options is already at the 90th percentile, and this could persist.",
    confidenceScore: 45,
    invalidation:
      "Clear directional breakout above $95 or below $82",
    timeHorizon: "weeks",
    timeHorizonDays: 21,
    status: "active",
    suggestedAction: "Consider volatility-based strategies",
    createdAt: "2026-03-15T10:00:00Z",
  },

  // === Flag: flag-crypto-sentiment ===
  {
    id: "hyp-crypto-1",
    flagId: "flag-crypto-sentiment",
    title: "Sentiment Recovery Drives BTC Toward $75K",
    direction: "long",
    summary:
      "Returning ETF inflows, on-chain accumulation, and the flush of excess leverage create a setup for Bitcoin to rally toward $75,000 over the next two weeks as sentiment transitions from fear to greed.",
    rationale:
      "The recent dip to $59K flushed leveraged longs and reset funding rates to neutral. Spot ETF inflows turning positive is historically one of the strongest leading indicators for BTC price. On-chain data showing accumulation by long-term holders during the dip mirrors setups that preceded the October 2025 and January 2026 rallies.",
    confidenceScore: 60,
    invalidation:
      "ETF inflows reverse to outflows for 3+ consecutive days, or BTC breaks below $59K",
    timeHorizon: "days",
    timeHorizonDays: 14,
    status: "active",
    suggestedAction: "Track daily ETF flow data and funding rates",
    createdAt: "2026-03-21T11:00:00Z",
  },
  {
    id: "hyp-crypto-2",
    flagId: "flag-crypto-sentiment",
    title: "Dead Cat Bounce Before Further Weakness",
    direction: "short",
    summary:
      "The current bounce may be a relief rally within a larger corrective structure. If macro risk appetite fades or ETF inflows stall, BTC could retest and break below $59K.",
    rationale:
      "The bounce from $59K occurred on declining volume after the initial spike, and retail participation remains muted. Previous bear-market rallies in BTC have averaged 15-20% before resuming downtrend. The macro backdrop — strong dollar, hawkish Fed — is not conducive to sustained crypto rallies.",
    confidenceScore: 35,
    invalidation:
      "BTC closes above $72K with expanding volume and positive ETF inflows sustained for 5+ days",
    timeHorizon: "days",
    timeHorizonDays: 14,
    status: "active",
    suggestedAction: "Monitor volume profile and retail sentiment indicators",
    createdAt: "2026-03-21T11:30:00Z",
  },

  // === Flag: flag-usd-strength ===
  {
    id: "hyp-fx-1",
    flagId: "flag-usd-strength",
    title: "Dollar Rally Extends on Rate Divergence",
    direction: "long",
    summary:
      "The widening rate differential between the Fed and other major central banks should push the DXY toward 107-108 over the next four weeks, with EUR/USD testing 1.05 and USD/JPY approaching 155.",
    rationale:
      "Central bank policy divergence is the most reliable driver of FX trends. With the Fed holding rates while the ECB cuts and the BoJ stays accommodative, carry trade flows will continue to favor the dollar. The technical breakout above 105.50 on the DXY adds momentum-following demand on top of the fundamental case.",
    confidenceScore: 70,
    invalidation:
      "Dovish Fed pivot or significantly stronger-than-expected Eurozone economic data",
    timeHorizon: "weeks",
    timeHorizonDays: 28,
    status: "active",
    suggestedAction: "Evaluate short EUR/USD and long USD/JPY setups",
    createdAt: "2026-03-10T08:00:00Z",
  },
  {
    id: "hyp-fx-2",
    flagId: "flag-usd-strength",
    title: "USD Overextension Leads to Mean Reversion",
    direction: "short",
    summary:
      "Crowded long-dollar positioning and the DXY approaching technical resistance at 106.50 could trigger a mean-reversion pullback of 1.5-2.5%, particularly if upcoming US data disappoints.",
    rationale:
      "CFTC positioning data shows net long USD at levels that have historically preceded 2-4 week corrections. The DXY RSI is at 72, in overbought territory. Any softness in US labor or inflation data could be the catalyst for position unwinding, especially with the market already pricing a hawkish Fed.",
    confidenceScore: 25,
    invalidation:
      "DXY closes above 107 with continued strong US data releases",
    timeHorizon: "weeks",
    timeHorizonDays: 28,
    status: "active",
    suggestedAction: "Watch for positioning unwind signals and US data surprises",
    createdAt: "2026-03-10T08:30:00Z",
  },
];
