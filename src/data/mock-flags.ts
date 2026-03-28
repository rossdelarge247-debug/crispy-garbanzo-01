import type { MarketFlag, MarketFlagDetail } from "@/types";

export const mockFlags: MarketFlag[] = [
  {
    id: "flag-oil-geo",
    title: "Energy Shock: Conflict Escalation Sustaining Brent Upside Pressure",
    summary:
      "Escalating geopolitical tensions in the Middle East are sustaining upward pressure on crude oil prices. Brent has held above $87 for two weeks as markets price in continued supply risk from the region.",
    whyItMatters:
      "Oil price shocks ripple through the entire economy — from transport costs to inflation expectations. When crude stays elevated for weeks rather than days, it signals that the market sees structural supply risk, not just a headline scare.",
    convictionScore: 82,
    convictionLevel: "high",
    status: "active",
    timeHorizon: "weeks",
    timeHorizonDays: 21,
    affectedAssets: [
      {
        symbol: "BZ=F",
        name: "Brent Crude",
        assetClass: "commodity",
        direction: "long",
        impact: "primary",
      },
      {
        symbol: "XOM",
        name: "Exxon Mobil",
        assetClass: "equity",
        direction: "long",
        impact: "secondary",
      },
      {
        symbol: "USO",
        name: "US Oil Fund",
        assetClass: "equity",
        direction: "long",
        impact: "secondary",
      },
    ],
    drivers: [
      "Middle East conflict escalation",
      "OPEC+ production discipline",
      "Strategic reserve drawdowns paused",
      "Shipping route disruptions",
    ],
    category: "Geopolitical / Energy",
    suggestedAction: "Review energy exposure → Explore hypothesis scenarios",
    createdAt: "2026-03-14T08:00:00Z",
    updatedAt: "2026-03-27T14:30:00Z",
  },
  {
    id: "flag-crypto-sentiment",
    title: "Bitcoin Sentiment Rebound After Sharp Risk-On Rotation",
    summary:
      "Bitcoin has recovered 12% from its recent $59K dip as risk-on sentiment returns to crypto markets. Institutional ETF inflows turned positive for the first time in three weeks, and on-chain metrics show accumulation by long-term holders accelerating.",
    whyItMatters:
      "Crypto sentiment shifts can be rapid and self-reinforcing. The combination of returning institutional flows and on-chain accumulation suggests this recovery may have more substance than a typical dead-cat bounce, though confirmation is still needed.",
    convictionScore: 68,
    convictionLevel: "medium",
    status: "emerging",
    timeHorizon: "days",
    timeHorizonDays: 14,
    affectedAssets: [
      {
        symbol: "BTC-USD",
        name: "Bitcoin",
        assetClass: "crypto",
        direction: "long",
        impact: "primary",
      },
      {
        symbol: "ETH-USD",
        name: "Ethereum",
        assetClass: "crypto",
        direction: "long",
        impact: "secondary",
      },
      {
        symbol: "COIN",
        name: "Coinbase",
        assetClass: "equity",
        direction: "long",
        impact: "secondary",
      },
    ],
    drivers: [
      "Spot BTC ETF inflow reversal",
      "Risk-on rotation in equities spilling into crypto",
      "On-chain accumulation by long-term holders",
      "Short liquidation cascade above $64K",
    ],
    category: "Crypto / Sentiment",
    suggestedAction: "Monitor sentiment indicators → Consider hypothesis testing",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-27T16:00:00Z",
  },
  {
    id: "flag-usd-strength",
    title: "USD Strength Building After Central Bank Repricing",
    summary:
      "The US dollar index has gained 2.8% over four weeks as markets reprice Fed rate expectations higher while the ECB and BoJ maintain dovish guidance. Rate differentials are widening in favor of the dollar across all major pairs.",
    whyItMatters:
      "Dollar strength driven by central bank divergence tends to persist longer than headline-driven moves. The widening rate differential creates carry trade incentives that reinforce the trend, and this divergence is still being priced in.",
    convictionScore: 75,
    convictionLevel: "high",
    status: "active",
    timeHorizon: "weeks",
    timeHorizonDays: 28,
    affectedAssets: [
      {
        symbol: "DXY",
        name: "Dollar Index",
        assetClass: "index",
        direction: "long",
        impact: "primary",
      },
      {
        symbol: "EUR-USD",
        name: "Euro",
        assetClass: "forex",
        direction: "short",
        impact: "secondary",
      },
      {
        symbol: "GBP-USD",
        name: "British Pound",
        assetClass: "forex",
        direction: "short",
        impact: "secondary",
      },
      {
        symbol: "USD-JPY",
        name: "Japanese Yen",
        assetClass: "forex",
        direction: "long",
        impact: "secondary",
      },
    ],
    drivers: [
      "Hawkish Fed repricing — rate cuts pushed to H2 2026",
      "ECB dovish pivot with April cut signaled",
      "BoJ maintaining ultra-loose policy despite yen weakness",
      "Widening US-EU and US-JP rate differentials",
    ],
    category: "Macro / FX",
    suggestedAction: "Explore FX positioning → Review macro hypothesis",
    createdAt: "2026-03-08T09:00:00Z",
    updatedAt: "2026-03-26T11:45:00Z",
  },
];

export const mockFlagDetails: MarketFlagDetail[] = [
  {
    ...mockFlags[0],
    whatChanged:
      "Over the past 10 days, diplomatic channels narrowed while military positioning intensified. Tanker insurance rates in the Strait of Hormuz rose 15%, reflecting elevated shipping risk. OPEC+ maintained production cuts at their latest meeting, removing a potential pressure relief valve.",
    timeline: [
      {
        date: "2026-03-12",
        title: "Strait of Hormuz Transit Warning Issued",
        description:
          "The US Maritime Administration issued an advisory warning commercial vessels of heightened risk in the Strait of Hormuz following naval confrontations earlier in the week.",
        impact: "negative",
      },
      {
        date: "2026-03-16",
        title: "OPEC+ Maintains Production Cuts",
        description:
          "OPEC+ concluded its emergency session with no change to existing production quotas, citing the need for market stability despite rising prices.",
        impact: "positive",
      },
      {
        date: "2026-03-20",
        title: "Tanker Insurance Premiums Surge",
        description:
          "War-risk insurance premiums for tankers transiting the Persian Gulf rose 15% in a single week, the largest jump since 2024.",
        impact: "negative",
      },
      {
        date: "2026-03-24",
        title: "Diplomatic Talks Stall in Geneva",
        description:
          "Multilateral negotiations in Geneva ended without agreement after key parties rejected proposed ceasefire terms, dashing hopes for a near-term resolution.",
        impact: "negative",
      },
      {
        date: "2026-03-27",
        title: "Brent Closes Above $89 for Third Consecutive Session",
        description:
          "Brent crude settled at $89.40, marking the third straight close above $89 as traders priced in sustained supply risk with no diplomatic relief in sight.",
        impact: "positive",
      },
    ],
    sentimentSummary:
      "Market sentiment is firmly bullish on crude. Fear of supply disruption dominates, with speculative long positioning at a 6-month high.",
    sentimentScore: 72,
    priceContext:
      "Brent crude is trading at $89.40, up 8.2% over the past 21 days. The move has been steady rather than spiking, suggesting sustained conviction rather than panic buying. Volume has increased 25% above the 30-day average.",
    supportingEvidence: [
      "Brent crude has closed above $87 for 10 consecutive trading sessions, the longest streak above that level since October 2023.",
      "CFTC data shows net speculative long positions in crude oil futures at the highest level in 6 months.",
      "Tanker tracking data indicates a 12% decline in Persian Gulf departures over the past two weeks.",
      "US strategic petroleum reserve releases remain paused, removing a key source of non-OPEC supply.",
      "Goldman Sachs and JP Morgan both revised their Q2 2026 Brent forecasts upward by $5-8 per barrel.",
    ],
  },
  {
    ...mockFlags[1],
    whatChanged:
      "Spot Bitcoin ETF inflows flipped positive on March 22 after three weeks of outflows totaling $1.2B. On-chain data shows wallets holding >1 BTC increased by 4,200 in the past 10 days. The fear-and-greed index moved from 28 (fear) to 52 (neutral), suggesting sentiment is recovering but not yet euphoric.",
    timeline: [
      {
        date: "2026-03-20",
        title: "BTC Bounces Off $59K Support",
        description:
          "Bitcoin tested the $59,000 level and found strong buyer support, forming a double-bottom pattern on the 4-hour chart with above-average volume.",
        impact: "positive",
      },
      {
        date: "2026-03-22",
        title: "Spot ETF Inflows Turn Positive",
        description:
          "US spot Bitcoin ETFs recorded $340M in net inflows, breaking a three-week streak of outflows and signaling renewed institutional interest.",
        impact: "positive",
      },
      {
        date: "2026-03-25",
        title: "Short Liquidation Cascade Above $64K",
        description:
          "Over $180M in short positions were liquidated as BTC broke above $64,000, accelerating the upward move and pushing price to $66,200.",
        impact: "positive",
      },
      {
        date: "2026-03-27",
        title: "On-Chain Accumulation Signal Strengthens",
        description:
          "Glassnode data shows long-term holder supply increasing for 8 consecutive days while exchange balances continue to decline, a historically bullish setup.",
        impact: "positive",
      },
    ],
    sentimentSummary:
      "Sentiment has flipped from fearful to cautiously optimistic. Retail participation is still muted, but institutional flows are returning. The market is in a transitional phase where confirmation of the recovery is still needed.",
    sentimentScore: 45,
    priceContext:
      "Bitcoin is trading at $66,800, up 12.2% from its $59,500 low on March 19. The recovery has been driven primarily by spot buying rather than leverage, which is a healthier sign. Daily volume is 18% above the 30-day average.",
    supportingEvidence: [
      "Spot Bitcoin ETF net inflows totaled $680M over the past 5 trading days after $1.2B in outflows over the prior three weeks.",
      "The BTC fear-and-greed index moved from 28 to 52, crossing above the neutral threshold for the first time since early March.",
      "Exchange BTC balances dropped to a 3-year low, indicating coins are moving to long-term cold storage.",
      "Open interest in BTC futures has declined 15% from the March high, suggesting the leverage excess has been flushed.",
      "Coinbase premium turned positive after two weeks in negative territory, indicating US institutional buying interest.",
    ],
  },
  {
    ...mockFlags[2],
    whatChanged:
      "Fed funds futures shifted dramatically over the past three weeks, now pricing only one 25bp cut in 2026 versus three cuts expected at the start of March. Meanwhile, ECB President Lagarde signaled an April rate cut is likely, and the BoJ left policy unchanged despite yen weakness. The resulting rate differential widening is the primary driver of USD strength.",
    timeline: [
      {
        date: "2026-03-10",
        title: "US CPI Comes in Hot at 3.4%",
        description:
          "February CPI printed at 3.4% year-over-year, above the 3.2% consensus, reigniting concerns about sticky inflation and pushing back rate-cut expectations.",
        impact: "positive",
      },
      {
        date: "2026-03-14",
        title: "Fed Chair Powell Strikes Hawkish Tone",
        description:
          "In prepared remarks, Powell emphasized the need for 'further evidence' of disinflation before considering rate cuts, sending the dollar index up 0.8% in a single session.",
        impact: "positive",
      },
      {
        date: "2026-03-18",
        title: "ECB Signals April Rate Cut",
        description:
          "ECB President Lagarde stated that 'conditions are aligning for an adjustment in April,' effectively pre-committing to a 25bp cut and widening the EU-US rate differential.",
        impact: "positive",
      },
      {
        date: "2026-03-22",
        title: "BoJ Holds Rates Steady Despite Yen at 152",
        description:
          "The Bank of Japan left its policy rate unchanged at 0.25% despite USD/JPY trading above 152, disappointing those who expected a hawkish shift to defend the yen.",
        impact: "positive",
      },
      {
        date: "2026-03-26",
        title: "DXY Breaks Above 105.50 Resistance",
        description:
          "The Dollar Index closed above 105.50 for the first time since November 2024, confirming the technical breakout and attracting momentum-following flows.",
        impact: "positive",
      },
    ],
    sentimentSummary:
      "Dollar bulls are in control as the rate divergence narrative strengthens. Positioning is getting crowded on the long-dollar side, which creates some mean-reversion risk, but the fundamental case remains intact as long as the Fed stays hawkish.",
    sentimentScore: 58,
    priceContext:
      "The DXY is trading at 105.80, up 2.8% over the past 28 days. EUR/USD has fallen to 1.0710 and GBP/USD to 1.2580. USD/JPY is at 152.40. The move has been orderly and trend-following, with no signs of exhaustion in momentum indicators.",
    supportingEvidence: [
      "Fed funds futures now price only one 25bp cut in 2026, down from three cuts expected at the start of March.",
      "The US-Germany 2-year yield spread has widened to 210bp, the widest since Q4 2023.",
      "CFTC data shows net long USD positioning at a 4-month high across major currency pairs.",
      "The ECB-Fed policy rate differential is expected to widen by an additional 50bp by mid-2026.",
      "Real yield differentials favor the dollar, with US 10-year real yields at 2.1% versus -0.2% for Germany.",
    ],
  },
];
