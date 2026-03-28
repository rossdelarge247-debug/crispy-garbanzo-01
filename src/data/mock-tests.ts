import type { TestScenario } from "@/types";

export const mockTests: TestScenario[] = [
  // === Hypothesis: hyp-oil-1 (Sustained Escalation Drives Brent Above $95) ===
  {
    id: "test-oil-1a",
    hypothesisId: "hyp-oil-1",
    flagId: "flag-oil-geo",
    name: "2022 Russia-Ukraine Energy Crisis Analog",
    type: "analog",
    description:
      "Compares the current Middle East escalation setup to the 2022 Russia-Ukraine energy crisis, examining price trajectory, volatility structure, and supply disruption magnitude over a similar timeframe.",
    result: "pass",
    confidenceImpact: 8,
    details:
      "The analog shows strong structural similarity between the two episodes. Both feature a sudden geopolitical supply shock, OPEC+ reluctance to increase output, and rising tanker/shipping costs. In 2022, Brent rallied 22% over 45 days from the onset of acute supply fears before stabilizing. The current move of 8.2% over 21 days tracks the early phase of that analog closely. Key divergence: the 2022 shock involved actual physical supply loss, while the current situation is primarily risk-premium driven — meaning the upside may be more capped unless physical disruption materializes.",
    metrics: {
      similarity: "73%",
      duration: "45 days",
      peakMove: "+22%",
    },
    runAt: "2026-03-26T10:00:00Z",
  },
  {
    id: "test-oil-1b",
    hypothesisId: "hyp-oil-1",
    flagId: "flag-oil-geo",
    name: "Brent Momentum Continuation (21-day)",
    type: "backtest",
    description:
      "Backtests the historical performance of going long Brent crude when price has risen more than 7% over 21 days with above-average volume and elevated geopolitical risk indicators.",
    result: "pass",
    confidenceImpact: 5,
    details:
      "Over the past 10 years, there have been 14 instances where Brent rose more than 7% over a 21-day window with volume at least 20% above its 30-day average. In 10 of those cases, the trend continued for at least another 10 trading days, with a median additional gain of 5.8%. The average maximum drawdown during the continuation phase was -3.2%, suggesting manageable risk for a trend-following entry. The strategy had a Sharpe ratio of 1.4 during continuation periods.",
    metrics: {
      winRate: "71%",
      avgReturn: "+5.8%",
      avgDrawdown: "-3.2%",
      sampleSize: 14,
      sharpeRatio: "1.4",
    },
    runAt: "2026-03-26T10:30:00Z",
  },

  // === Hypothesis: hyp-oil-2 (Diplomatic Resolution Causes Price Retreat) ===
  {
    id: "test-oil-2a",
    hypothesisId: "hyp-oil-2",
    flagId: "flag-oil-geo",
    name: "Geopolitical De-escalation Scenario Analysis",
    type: "scenario",
    description:
      "Models the impact of a surprise diplomatic breakthrough on Brent crude pricing, estimating the speed and magnitude of risk-premium unwind under different resolution scenarios.",
    result: "weak",
    confidenceImpact: -3,
    details:
      "The scenario analysis suggests that even in a rapid de-escalation, the price retreat would likely be more gradual than expected. In the three most comparable historical de-escalation episodes (Libya 2011 ceasefire, Iran 2015 nuclear deal framework, Saudi-Yemen 2023 truce), crude prices took an average of 18 trading days to unwind 60% of the risk premium. Full unwind took 35+ days. This suggests the short thesis has a slower payoff timeline than the hypothesis implies, and the $78-82 target may take weeks rather than days to reach.",
    metrics: {
      avgUnwindDuration: "18 days",
      premiumUnwind60pct: "18 days",
      fullUnwindDuration: "35+ days",
      comparableEpisodes: 3,
    },
    runAt: "2026-03-26T11:00:00Z",
  },
  {
    id: "test-oil-2b",
    hypothesisId: "hyp-oil-2",
    flagId: "flag-oil-geo",
    name: "Diplomatic Probability Assessment via News Sentiment",
    type: "sensitivity",
    description:
      "Analyzes the current state of diplomatic activity using news sentiment scoring, tracking the frequency and tone of diplomatic keywords in major wire services over the past 14 days.",
    result: "fail",
    confidenceImpact: -8,
    details:
      "News sentiment analysis shows diplomatic language frequency declining by 40% over the past two weeks, while military and escalation keywords increased by 65%. The ratio of 'ceasefire' to 'escalation' mentions has fallen from 0.8 to 0.3, indicating the market narrative is moving further from a diplomatic resolution. Historical analysis shows that when this ratio falls below 0.4, the probability of a near-term diplomatic breakthrough drops to approximately 15%. This significantly undermines the de-escalation thesis.",
    metrics: {
      diplomaticSentimentTrend: "-40%",
      escalationKeywordTrend: "+65%",
      ceasefireToEscalationRatio: "0.3",
      impliedBreakthroughProbability: "15%",
    },
    runAt: "2026-03-27T09:00:00Z",
  },

  // === Hypothesis: hyp-oil-3 (Volatility Expansion Without Clear Direction) ===
  {
    id: "test-oil-3a",
    hypothesisId: "hyp-oil-3",
    flagId: "flag-oil-geo",
    name: "Crude Oil Implied Volatility Regime Analysis",
    type: "backtest",
    description:
      "Examines historical periods when crude oil implied volatility reached the 90th percentile to determine how long elevated volatility regimes typically persist and whether they resolve directionally or through compression.",
    result: "mixed",
    confidenceImpact: 2,
    details:
      "In 18 historical instances where crude IV reached the 90th percentile, the elevated regime lasted an average of 23 trading days. In 44% of cases, volatility resolved via a directional breakout (roughly equally split between up and down). In 56% of cases, volatility compressed without a clear directional move, supporting the neutral hypothesis. However, when a geopolitical catalyst was present (8 of 18 cases), directional resolution was more common (62%), which partially undermines the range-bound thesis for the current situation.",
    metrics: {
      avgElevatedDuration: "23 days",
      directionalResolution: "44%",
      compressionResolution: "56%",
      geopoliticalSubset: "62% directional",
      sampleSize: 18,
    },
    runAt: "2026-03-27T09:30:00Z",
  },
  {
    id: "test-oil-3b",
    hypothesisId: "hyp-oil-3",
    flagId: "flag-oil-geo",
    name: "Straddle P&L Simulation ($82-$95 Range)",
    type: "simulation",
    description:
      "Simulates the performance of a long straddle strategy on Brent crude options assuming the $82-$95 range holds, testing whether current IV levels make volatility-based strategies profitable.",
    result: "mixed",
    confidenceImpact: 1,
    details:
      "The simulation ran 5,000 Monte Carlo paths with current IV (38%) and the hypothesized $82-$95 range. A long straddle at the $89 strike with 21-day expiry was profitable in 52% of paths, with a median return of +3.2% but a mean return of -1.1% due to theta decay in low-movement scenarios. The strategy performs best when large intra-day swings occur without clear direction — which matches the hypothesis but requires precise timing. A strangle strategy ($84/$94) showed better risk-adjusted returns with a 48% win rate but higher median payoff of +6.8% when profitable.",
    metrics: {
      straddleWinRate: "52%",
      straddleMedianReturn: "+3.2%",
      strangleWinRate: "48%",
      strangleMedianPayoff: "+6.8%",
      simulationPaths: 5000,
    },
    runAt: "2026-03-27T10:00:00Z",
  },

  // === Hypothesis: hyp-crypto-1 (Sentiment Recovery Drives BTC Toward $75K) ===
  {
    id: "test-crypto-1a",
    hypothesisId: "hyp-crypto-1",
    flagId: "flag-crypto-sentiment",
    name: "BTC Post-Dip Recovery Pattern Backtest",
    type: "backtest",
    description:
      "Backtests Bitcoin performance following 15%+ drawdowns that were accompanied by ETF inflow reversals and long-term holder accumulation, matching the current setup.",
    result: "pass",
    confidenceImpact: 7,
    details:
      "Since spot BTC ETFs launched in January 2024, there have been 5 instances where BTC dropped 15%+ and then saw ETF inflows turn positive within 10 days of the low. In 4 of 5 cases, BTC rallied at least 20% from the dip low within 30 days. The one failure occurred during a broader equity market selloff that dragged crypto lower regardless of ETF flows. The current setup — positive ETF inflows, declining exchange balances, reset funding rates — matches the successful pattern closely. Average time from inflow reversal to peak was 22 days.",
    metrics: {
      winRate: "80%",
      avgRallyFromLow: "+24%",
      avgDaysToTarget: 22,
      sampleSize: 5,
      currentPatternMatch: "strong",
    },
    runAt: "2026-03-26T14:00:00Z",
  },

  {
    id: "test-crypto-1b",
    hypothesisId: "hyp-crypto-1",
    flagId: "flag-crypto-sentiment",
    name: "2023 ETF Approval Rally Analog",
    type: "analog",
    description:
      "Compares the current sentiment recovery and ETF-driven inflow pattern to the 2023 rally that followed spot ETF approval expectations, examining price structure and volume similarity over a comparable window.",
    result: "mixed",
    confidenceImpact: 3,
    details:
      "The 2023 ETF approval rally saw BTC gain 18% over 28 days as institutional inflow expectations built momentum. The current recovery shares some structural similarities — rising open interest, positive funding rates, and steady spot ETF inflows — but diverges in macro backdrop. In 2023, the Fed was near the end of its hiking cycle, providing a tailwind that is absent today. The analog suggests upside is plausible but may be more muted without a comparable macro catalyst.",
    metrics: {
      similarity: "61%",
      duration: "28 days",
      peakMove: "+18%",
    },
    runAt: "2026-03-27T14:00:00Z",
  },
  {
    id: "test-crypto-1c",
    hypothesisId: "hyp-crypto-1",
    flagId: "flag-crypto-sentiment",
    name: "Sensitivity to ETF Flow Reversal",
    type: "sensitivity",
    description:
      "Tests the sensitivity of the BTC recovery thesis to a reversal in spot ETF inflows, modeling the price impact if daily net inflows drop below the critical $100M/day threshold.",
    result: "pass",
    confidenceImpact: 4,
    details:
      "The sensitivity analysis shows that BTC can absorb a moderate slowdown in ETF inflows without derailing the recovery trend. If inflows drop below $100M/day, historical precedent suggests an initial price impact of approximately -8%, but on-chain accumulation by long-term holders has provided a floor in prior episodes. Recovery time from flow-driven dips averages 5 days when broader sentiment remains positive. The thesis survives this stress test, though the margin of safety narrows considerably below the $100M/day threshold.",
    metrics: {
      "Flow threshold": "$100M/day",
      "Price impact": "-8%",
      "Recovery time": "5 days",
    },
    runAt: "2026-03-28T09:00:00Z",
  },

  // === Hypothesis: hyp-crypto-2 (Dead Cat Bounce Before Further Weakness) ===
  {
    id: "test-crypto-2a",
    hypothesisId: "hyp-crypto-2",
    flagId: "flag-crypto-sentiment",
    name: "Bear Rally Volume Profile Analysis",
    type: "analog",
    description:
      "Compares the current BTC bounce volume profile to historical dead-cat bounces in crypto bear markets, looking for signs of weakening buyer conviction as price recovers.",
    result: "weak",
    confidenceImpact: -2,
    details:
      "The volume profile of the current bounce does not strongly match historical dead-cat bounce patterns. In typical bear-market relief rallies, volume declines steadily after the initial bounce day, with each subsequent up-day showing lower volume. The current recovery shows mixed signals: volume did decline on March 23-24, but surged again on March 25 during the short liquidation event and remained elevated on March 26-27. The short liquidation-driven volume complicates the pattern — it could represent genuine demand or simply mechanical covering. The comparison is inconclusive, leaning slightly against the dead-cat thesis.",
    metrics: {
      volumeTrend: "mixed",
      patternMatch: "38%",
      shortLiquidationDistortion: "significant",
      comparableEpisodes: 7,
    },
    runAt: "2026-03-27T11:00:00Z",
  },

  {
    id: "test-crypto-2b",
    hypothesisId: "hyp-crypto-2",
    flagId: "flag-crypto-sentiment",
    name: "Scenario: Risk-Off Event During Recovery",
    type: "scenario",
    description:
      "Models the impact of a sudden risk-off event — such as an equity flash crash or geopolitical shock — occurring while BTC is in the early stages of a recovery bounce.",
    result: "mixed",
    confidenceImpact: 1,
    details:
      "The scenario analysis indicates that a risk-off event during an early-stage BTC recovery would likely produce a sharp drawdown of approximately 15%, consistent with crypto's high beta to risk sentiment. Recovery probability from such an event is estimated at only 40%, with the remaining 60% of cases seeing price establish a new local low within 12 days. This partially supports the dead-cat bounce thesis — exogenous shocks can easily derail fragile recoveries — but the scenario requires a specific catalyst that may not materialize.",
    metrics: {
      Drawdown: "-15%",
      "Recovery probability": "40%",
      "Time to new low": "12 days",
    },
    runAt: "2026-03-28T10:00:00Z",
  },

  // === Hypothesis: hyp-fx-1 (Dollar Rally Extends on Rate Divergence) ===
  {
    id: "test-fx-1a",
    hypothesisId: "hyp-fx-1",
    flagId: "flag-usd-strength",
    name: "Rate Divergence DXY Regression Model",
    type: "backtest",
    description:
      "Tests the historical relationship between US-EU and US-JP rate differentials and DXY performance, estimating the implied fair value for DXY given current spreads.",
    result: "pass",
    confidenceImpact: 6,
    details:
      "A multivariate regression model using 2-year rate differentials (US-EU, US-JP, US-UK) as inputs explains 78% of DXY variance over the past 5 years. Given current rate spreads, the model estimates DXY fair value at 106.80 — approximately 1% above the current level of 105.80. If the ECB cuts in April as expected, the model projects fair value rising to 107.40-108.10. This supports the thesis that the dollar rally has room to extend and is not yet overvalued relative to rate fundamentals. The 95% confidence interval for the 28-day forecast is 104.50-108.80.",
    metrics: {
      modelR2: "78%",
      impliedFairValue: "106.80",
      postECBcutFairValue: "107.40-108.10",
      forecastRange95pct: "104.50-108.80",
      samplePeriod: "5 years",
    },
    runAt: "2026-03-26T15:00:00Z",
  },

  {
    id: "test-fx-1b",
    hypothesisId: "hyp-fx-1",
    flagId: "flag-usd-strength",
    name: "2022 Fed Hawkish Cycle DXY Analog",
    type: "analog",
    description:
      "Compares the current USD strength driven by rate divergence to the 2022 Fed tightening cycle, when aggressive rate hikes pushed DXY to multi-decade highs against EUR and JPY.",
    result: "pass",
    confidenceImpact: 5,
    details:
      "The 2022 tightening cycle saw DXY rally 7.5% over 35 days during the most aggressive phase of Fed hawkishness, peaking near 114.80 in late September. The current setup shows 68% structural similarity: both periods feature widening US-EU rate differentials, hawkish Fed rhetoric, and dovish ECB expectations. The key difference is magnitude — 2022 involved 75bp hikes, while the current divergence stems from delayed cuts rather than active tightening. This suggests the directional thesis is sound but the magnitude of the move may be smaller than the 2022 analog implies.",
    metrics: {
      similarity: "68%",
      duration: "35 days",
      peakMove: "+7.5%",
    },
    runAt: "2026-03-27T15:00:00Z",
  },
  {
    id: "test-fx-1c",
    hypothesisId: "hyp-fx-1",
    flagId: "flag-usd-strength",
    name: "Scenario: ECB Surprise Hawkish Pivot",
    type: "scenario",
    description:
      "Tests the impact on USD strength if the ECB unexpectedly signals a hawkish pivot, narrowing the rate differential that underpins the dollar rally thesis.",
    result: "weak",
    confidenceImpact: -3,
    details:
      "An ECB surprise hawkish pivot — such as pausing cuts or signaling concern about inflation persistence — would compress the US-EU rate differential and undermine the primary driver of DXY strength. The model estimates EUR-USD would rally approximately 2.5%, translating to a DXY drawdown of roughly 1.8%. Historical precedent from similar central bank surprises suggests recovery takes about 8 days as markets reprice. While this scenario has low base-rate probability (estimated at 15-20%), it represents a meaningful tail risk to the dollar rally thesis.",
    metrics: {
      "EUR-USD impact": "+2.5%",
      "DXY drawdown": "-1.8%",
      "Recovery time": "8 days",
    },
    runAt: "2026-03-28T08:00:00Z",
  },

  // === Hypothesis: hyp-fx-2 (USD Overextension Leads to Mean Reversion) ===
  {
    id: "test-fx-2a",
    hypothesisId: "hyp-fx-2",
    flagId: "flag-usd-strength",
    name: "DXY Overbought RSI Mean-Reversion Backtest",
    type: "backtest",
    description:
      "Backtests DXY performance following periods when RSI exceeds 70 while CFTC net long positioning is above the 80th percentile, testing the mean-reversion hypothesis.",
    result: "weak",
    confidenceImpact: -4,
    details:
      "Over the past 10 years, there have been 12 instances where DXY RSI exceeded 70 with CFTC net long positioning above the 80th percentile. In 5 of 12 cases (42%), DXY pulled back at least 1.5% within 4 weeks — supporting the mean-reversion thesis. However, in 7 of 12 cases (58%), DXY continued higher or held steady, particularly when the rate divergence was the primary driver rather than positioning alone. In the current regime, where rate divergence is the dominant factor, the historical hit rate for mean reversion drops to just 33% (2 of 6 cases). The backtest suggests that overbought positioning is a necessary but not sufficient condition for reversal when fundamentals support the trend.",
    metrics: {
      overallReversionRate: "42%",
      rateDivergenceSubset: "33%",
      avgReversionMagnitude: "-1.8%",
      avgReversionDuration: "14 days",
      sampleSize: 12,
    },
    runAt: "2026-03-27T08:00:00Z",
  },
  {
    id: "test-fx-2b",
    hypothesisId: "hyp-fx-2",
    flagId: "flag-usd-strength",
    name: "Sensitivity to US Data Weakening",
    type: "sensitivity",
    description:
      "Tests how DXY responds to weaker-than-expected US economic data releases, modeling the impact of consecutive data misses on the dollar's rate-divergence-driven rally.",
    result: "mixed",
    confidenceImpact: 2,
    details:
      "The sensitivity analysis examines DXY behavior following periods when US economic surprises turn negative by at least one standard deviation. Historically, a sustained data miss of -1 sigma or worse produces an average DXY decline of 0.8%, but the effect is transient — lasting 3-5 trading days before rate differentials reassert dominance. The probability of such a data weakening sequence occurring in the next 4 weeks is estimated at 35% based on current economic momentum indicators. The mean-reversion thesis gains credibility only if data misses persist beyond a single release cycle.",
    metrics: {
      "Data miss threshold": "-1 sigma",
      "DXY impact": "-0.8%",
      Probability: "35%",
    },
    runAt: "2026-03-28T11:00:00Z",
  },
];
