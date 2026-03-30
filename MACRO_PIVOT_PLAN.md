# Macro Trader Pivot — Architecture Plan

## The insight

The platform has been trying to serve everyone — technical traders, swing traders, momentum traders, mean reversion traders. The result is a tool that does many things averagely rather than one thing exceptionally.

**The pivot: serve discretionary macro traders specifically.**

These traders are thesis-led. They don't look at RSI or moving average crossovers. They look at:
- What is the ECB going to do on Thursday?
- What does the market expect vs what's likely?
- If CPI surprises to the upside, what's the second-order effect on gold?
- Is the Fed's tone shifting? What does that mean for EUR/USD?

**The economic calendar IS the product.** Everything else serves it.

## Current vs proposed architecture

### Current flow
```
News + Calendar → AI scanner → trade ideas → dashboard (by asset/day)
                                                ↓
                                          setup detail
                                                ↓
                                          backtest (price pattern matching)
                                                ↓
                                          trade plan
```

### Proposed flow
```
Economic Calendar (next 7-30 days)
        ↓
Each event = an opportunity to investigate
        ↓
AI deep analysis per event:
  - What's expected (consensus)
  - What could surprise (scenarios)
  - Which assets move and why (transmission mechanism)
  - Historical precedent (what happened last time this event occurred)
  - Sentiment: what's the market positioned for?
  - Cross-asset implications
        ↓
Ranked calendar of opportunities (by conviction)
        ↓
Drill into any event → full trade thesis:
  - The event, the forecast, the scenarios
  - The recommended trade (asset, direction, entry, stop, target)
  - Default £1,000 with leverage, expected return
  - 2:1 asymmetric R:R built in
  - Backtest: what happened in previous instances of THIS event type
  - News narrative matching from those historical instances
  - AI interrogation: ask questions, tweak, stress-test
        ↓
Finalise → Journal
```

## What changes

### Dashboard becomes an EVENT CALENDAR
- Not grouped by asset. Grouped by DATE → EVENT.
- Each event card shows: date, time, event name, country, forecast vs previous,
  affected assets, conviction score, and the top trade idea.
- Events ranked by opportunity quality (how tradeable, how clear the setup).
- Toggle: this week / next week / this month.

### Event detail page replaces setup detail
- The EVENT is the anchor, not the asset.
- One page per event with:
  1. Event details (what, when, forecast, previous, country)
  2. AI scenario analysis (3-4 outcomes with probabilities)
  3. Recommended trade (singular — the best play for this event)
  4. Trade plan with £1,000 default, leverage, 2:1 R:R
  5. Historical precedent: every past instance of this event type
     with what happened to the recommended asset
  6. News narrative from those historical instances
  7. Sentiment overlay: what's the market expecting?
  8. AI interrogation panel: ask Claude/Grok questions about this event
  9. Finalise + journal

### Backtest becomes EVENT-SPECIFIC
- Instead of "find similar price conditions": find every previous instance
  of THIS SPECIFIC economic event (CPI, NFP, FOMC, ECB, etc.)
- Show what happened to the recommended asset each time
- Calculate actual historical win rate for THIS event type

### Trade plan always includes
- Asset + direction
- Entry timing (before event / on release / after reaction)
- Stop: tighter side (e.g., 1% or specific level)
- Target: wider side (2% or specific level) — always 2:1 minimum
- Leverage from Plus500 limits
- £1,000 default position
- Expected return: (win rate × target) - (loss rate × stop)
- Max loss on this trade

## What we keep (reuse)
- Regime detection (useful for context)
- Signal profile (momentum, vol, trend — context for the event)
- CandlestickChart (shows price action around events)
- AI analysis infrastructure (Claude + Grok)
- Historical news cross-reference (GDELT archive)
- Journal system
- Feed status / data resilience layer
- Design system + typography
- Leverage module
- All data providers (Yahoo, Polygon, CoinGecko, RSS, GDELT)

## What we deprecate
- Setup detection (trend continuation, pullback, breakout, mean reversion)
- Signal-matched backtesting (replaced by event-type-specific backtesting)
- "By asset" dashboard view
- The opportunity scanner generating generic trade ideas

## New components needed

### 1. Event Calendar Engine
- Fetches all upcoming economic events (Forex Factory + mock)
- Enriches each event with: affected assets, historical instances,
  AI analysis, conviction score
- Ranks by opportunity quality

### 2. Event-Specific Backtest
- Given an event type (e.g., "US CPI"), find all historical instances
- For each: fetch the price data around that date for the target asset
- Calculate: how did the asset move in the hours/days after?
- Win rate for the recommended direction

### 3. Event Detail Page
- The main investigation screen
- AI scenario analysis
- Trade plan with 2:1 R:R
- Historical precedent
- Sentiment
- AI Q&A

### 4. Trade Calculator
- £1,000 default
- Leverage per asset class
- 2:1 R:R always
- Expected value calculation
- Max loss

## Build sequence

Phase 1: Event calendar dashboard + event detail page
Phase 2: Event-specific backtesting + historical precedent
Phase 3: AI scenario analysis per event + sentiment
Phase 4: Trade calculator + finalise flow + journal integration
Phase 5: AI interrogation panel (ask questions about the event)
