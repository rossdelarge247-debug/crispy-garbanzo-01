# Conviction — Architecture & Technical Specification

## Overview
Conviction is a browser-based AI market opportunity platform for non-traders. It surfaces high-conviction market situations and guides users from understanding → analysis → testing → execution.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (future: separate Node.js services)
- **Simulation**: Python service (future: vectorbt/backtrader integration)
- **Storage**: PostgreSQL + Redis (future; Phase 1 uses in-memory mock data)
- **Execution**: Alpaca paper trading (future; Phase 1 is demo-only)

## Design System

### Color Palette (Dark Mode First)
| Token | Hex | Usage |
|-------|-----|-------|
| `surface.DEFAULT` | `#0a0a0f` | Page background |
| `surface.raised` | `#12121a` | Cards, panels |
| `surface.overlay` | `#1a1a25` | Modals, dropdowns |
| `surface.border` | `#2a2a3a` | Borders, dividers |
| `surface.hover` | `#22222f` | Hover states |
| `accent.DEFAULT` | `#6366f1` | Primary actions, brand |
| `accent.dim` | `#4f46e5` | Pressed states |
| `accent.glow` | `#818cf8` | Highlights |
| `conviction.high` | `#22c55e` | Score ≥70 |
| `conviction.medium` | `#eab308` | Score 50-69 |
| `conviction.low` | `#94a3b8` | Score <50 |
| `conviction.caution` | `#f97316` | Warnings |
| `conviction.danger` | `#ef4444` | Danger, kill switch |
| `text.primary` | `#f1f5f9` | Headings, body |
| `text.secondary` | `#94a3b8` | Descriptions |
| `text.muted` | `#64748b` | Metadata, hints |

### Typography
- Font: Inter (300-700 weights)
- Mono: JetBrains Mono (prices, numbers)
- Scale: text-sm (meta), text-base (body), text-lg (section), text-xl/2xl (page titles)

### Spacing & Layout
- Max content width: `max-w-4xl` (prose-like, not dashboard-wide)
- Card padding: `p-6`
- Section gaps: `space-y-8` between sections, `space-y-4` within
- Cards use `rounded-xl border border-surface-border bg-surface-raised`

### Animations
- Page entry: `animate-fade-in` (0.5s ease-out)
- Card entry: `animate-slide-up` (0.4s ease-out, staggered)
- Interactive: `transition-all duration-200`

## Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout + Navbar
│   ├── page.tsx            # Home: Conviction Dashboard
│   ├── globals.css         # Tailwind + global styles
│   ├── flags/
│   │   └── [id]/
│   │       ├── page.tsx    # Market Situation Detail
│   │       ├── hypothesis/
│   │       │   └── page.tsx # Hypothesis Workbench
│   │       ├── test-runner/
│   │       │   └── page.tsx # Experiment/Test Runner
│   │       └── trade-plan/
│   │           └── page.tsx # Trade Plan & Execution
│   └── settings/
│       └── page.tsx        # Risk & Controls
├── components/             # Shared UI components
│   ├── Navbar.tsx
│   ├── FlagCard.tsx
│   ├── ConvictionBadge.tsx
│   ├── StatusBadge.tsx
│   ├── AssetPill.tsx
│   ├── HypothesisCard.tsx
│   ├── TestResultCard.tsx
│   ├── TradePlanCard.tsx
│   ├── ExpandableSection.tsx
│   ├── SectionHeader.tsx
│   ├── ProgressBar.tsx
│   └── EmptyState.tsx
├── data/                   # Mock/seed data (Phase 1)
│   ├── mock-flags.ts
│   ├── mock-hypotheses.ts
│   ├── mock-tests.ts
│   └── mock-trade-plans.ts
├── services/               # Provider-abstracted services
│   ├── flag-engine.ts      # Core orchestrator
│   ├── market-data.ts      # Market data provider
│   ├── news.ts             # News provider
│   ├── sentiment.ts        # Sentiment provider
│   ├── calendar.ts         # Economic calendar provider
│   └── execution.ts        # Trade execution provider
├── lib/                    # Utilities
│   └── utils.ts
└── types/                  # TypeScript definitions
    └── index.ts
```

## Service Layer Pattern
Every external dependency uses the **Provider pattern**:
```typescript
// Interface defines the contract
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketDataPoint>;
  getHistorical(symbol: string, days: number): Promise<MarketDataPoint[]>;
}

// Mock implementation for Phase 1
class MockMarketDataProvider implements MarketDataProvider { ... }

// Real implementation stubs for Phase 2+
class PolygonMarketDataProvider implements MarketDataProvider { ... }

// Factory selects based on env config
export function getMarketDataProvider(): MarketDataProvider {
  if (process.env.POLYGON_API_KEY) return new PolygonMarketDataProvider();
  return new MockMarketDataProvider();
}
```

## Page Rendering Strategy
- **Server Components** (default): Dashboard, Detail, Hypothesis, Test Runner, Trade Plan
- **Client Components** ("use client"): Settings page, interactive widgets (toggles, sliders, mode selectors)
- Data fetching happens in server components via service calls
- Client interactivity is isolated to leaf components

## Core User Flow
```
Dashboard (flags list)
  → Flag Detail (what's happening, why, affected assets)
    → Hypothesis Workbench (possible scenarios)
      → Test Runner (validate with experiments)
        → Trade Plan (structured action)
          → Execute (paper → live → autonomous)

Settings (risk controls, safety, thresholds) — accessible from nav
```

## Progressive Disclosure Principle
Every screen follows: **Summary → Context → Evidence → Mechanics → Execution**
- Level 0: Title + 1-2 sentence summary (always visible)
- Level 1: Why it matters, affected assets, suggested action (visible on detail)
- Level 2: Timeline, sentiment, price context (expandable sections)
- Level 3: Source evidence, raw data, calculations (deeply nested)

## Mock Data Scenarios (Phase 1)
1. **Oil/Geopolitical**: Conflict escalation → Brent crude upside
2. **Crypto/Sentiment**: Bitcoin sentiment rebound after risk-on rotation
3. **Forex/Macro**: USD strength after central bank repricing
