# Conviction

A browser-based AI market opportunity platform for non-traders. Conviction surfaces high-conviction market situations and guides users from understanding to action — without requiring prior trading knowledge.

## Quick Start

```bash
cd conviction
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs in **demo mode** by default with realistic mock data. No API keys required to explore the full UI.

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard — high-conviction flags
│   ├── flags/[id]/         # Flag detail, hypothesis, test runner, trade plan
│   └── settings/           # Risk & controls
├── components/             # Shared UI components
├── data/                   # Mock/seed data (Phase 1)
├── services/               # Provider-abstracted service layer
│   ├── flag-engine.ts      # Core orchestrator
│   ├── market-data.ts      # Market data (Polygon stub)
│   ├── news.ts             # News (GDELT/NewsAPI stubs)
│   ├── sentiment.ts        # Sentiment (Alpha Vantage stub)
│   ├── calendar.ts         # Economic calendar (Finnhub stub)
│   └── execution.ts        # Trade execution (Alpaca stub)
├── lib/                    # Utilities
└── types/                  # TypeScript definitions
```

## Core Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| **Dashboard** | `/` | Small set of high-conviction market flags |
| **Flag Detail** | `/flags/[id]` | Deep dive into a market situation |
| **Hypothesis Workbench** | `/flags/[id]/hypothesis` | Explore possible scenarios |
| **Test Runner** | `/flags/[id]/test-runner` | Validate hypotheses with experiments |
| **Trade Plan** | `/flags/[id]/trade-plan` | Structured trade plan + execution mode |
| **Risk & Controls** | `/settings` | Safety thresholds, risk limits, kill switch |

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **React 18** + **TypeScript**
- **Tailwind CSS 3** (dark-mode-first design system)

## Connecting Live Data Sources

Copy `.env.example` to `.env.local` and add credentials:

```bash
cp .env.example .env.local
```

### Market Data — Polygon.io
1. Sign up at [polygon.io](https://polygon.io/pricing) (free tier available)
2. Set `POLYGON_API_KEY` in `.env.local`
3. The `MarketDataProvider` in `src/services/market-data.ts` will auto-switch from mock to live

### News — NewsAPI / GDELT
- **GDELT** (free, no key): Public API at `api.gdeltproject.org`
- **NewsAPI**: Sign up at [newsapi.org](https://newsapi.org), set `NEWSAPI_KEY`
- Provider in `src/services/news.ts`

### Sentiment — Alpha Vantage
1. Get a free key at [alphavantage.co](https://www.alphavantage.co/support/#api-key)
2. Set `ALPHA_VANTAGE_KEY`
3. Provider in `src/services/sentiment.ts`

### Economic Calendar — Finnhub
1. Sign up at [finnhub.io](https://finnhub.io) (free tier)
2. Set `FINNHUB_API_KEY`
3. Provider in `src/services/calendar.ts`

### Paper Trading — Alpaca
1. Create a paper trading account at [alpaca.markets](https://alpaca.markets)
2. Set `ALPACA_API_KEY` and `ALPACA_SECRET_KEY`
3. Set `ALPACA_PAPER=true`
4. Provider in `src/services/execution.ts`

## Provider Pattern

Every external dependency uses the same abstraction:

```typescript
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketDataPoint>;
  getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]>;
}

// Factory auto-selects based on env config
export function getMarketDataProvider(): MarketDataProvider {
  if (process.env.POLYGON_API_KEY) return new PolygonMarketDataProvider();
  return new MockMarketDataProvider();
}
```

To replace any mock with a live source:
1. Implement the provider interface
2. Add env var detection to the factory function
3. Set the env var

## Mock Data Scenarios

Three realistic end-to-end examples included:

1. **Oil / Geopolitical Shock** — Conflict escalation sustaining Brent crude upside
2. **Crypto Sentiment Reversal** — Bitcoin rebound after risk-on rotation
3. **Forex / Macro Repricing** — USD strength on central bank divergence

## Design Principles

- **Progressive disclosure**: Show minimum info upfront, reveal detail on drill-down
- **Plain English**: Every summary is written for non-traders
- **Dark mode first**: Premium, calm, minimal aesthetic
- **Summary → Evidence → Mechanics → Execution**: Every page follows this hierarchy

## Phase Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| **1 — Working UI + mocked data** | ✅ Complete | All screens, provider abstraction, realistic mock data |
| **2 — Real sources** | 🔲 Next | Connect market data, news, calendar, sentiment |
| **3 — Simulation + paper trading** | 🔲 Planned | vectorbt/Backtrader test runner, Alpaca paper trading |
| **4 — Live trading + gated autonomy** | 🔲 Future | Live execution, permissions, kill switches, alerting |
