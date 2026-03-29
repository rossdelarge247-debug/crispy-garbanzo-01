# Build Plan — Phase 3: Close the Loop

## Current state

The core user journey currently has a dead end:

```
Dashboard → Flag detail → Simulate → [dead end]
                                       ↑
                        Trade Plan page has a disabled "Start paper trade" button.
                        getTradePlan returns null for live flags.
                        Settings don't persist.
                        No watchlist — focus assets picked in onboarding but never surfaced.
```

The intelligence layer, live prices, and simulation are all working well.
What's missing is the monitoring layer (watchlist) and the execution layer (paper trading).

---

## What we're building

### 1. Watchlist (`/watchlist`)
A persistent monitoring page for the user's focus assets.
- Reads `focusAssets` from localStorage (already saved in onboarding)
- Shows each asset as a card: live price, change %, regime badge, mini sparkline
- Active flags per asset — linked to flag detail
- New `/api/sparkline/[symbol]` endpoint returns 30-day price series (lightweight, cached 5min)
- Navbar gains a "Watchlist" link
- Empty state prompts user to add assets in preferences

**Files:**
- `src/app/watchlist/page.tsx` (client)
- `src/components/WatchlistCard.tsx` (live price + sparkline per asset)
- `src/app/api/sparkline/[symbol]/route.ts`
- Update `src/components/Navbar.tsx` (add Watchlist link)

---

### 2. Paper Trading — close the loop

**2a. Generate real trade plans for live flags**

`flag-engine.ts > getTradePlan` currently returns null for live flags. Fix this:
- Fetch live price for primary asset via `getMarketDataProvider().getQuote(symbol)`
- Pull top hypothesis + confidence grade from confidence engine
- Derive stop/take from `getDefaultStopLoss` / `getDefaultTakeProfit` in `dry-run.ts`
- Return a fully populated `TradePlan` object

**2b. Enable "Start paper trade" on trade plan page**

`ExecutionModeSelector.tsx` and the trade plan page "Start paper trade" button:
- When clicked, create a `PaperPosition` record and save to localStorage
- Navigate to `/journal` (or show inline confirmation)

New type `PaperPosition`:
```ts
interface PaperPosition {
  id: string;
  flagId: string;
  asset: string;
  assetName: string;
  direction: Direction;
  entryPrice: number;
  stopLoss: number;       // price level
  takeProfit: number;     // price level
  tradeAmount: number;
  leverage: number;
  openedAt: string;
  status: 'open' | 'closed';
  closePrice?: number;
  closedAt?: string;
  pnl?: number;
  closeReason?: 'target' | 'stop' | 'manual';
}
```

Storage key: `trade-daddy-paper-positions`

**2c. Dashboard "Open positions" section**

Replace the current static "Recent simulations" section with two sub-sections:
1. **Open positions** — live cards showing current P&L vs entry, with "Close" button
   - Each card uses `LivePriceTicker` to get current price and compute P&L live
   - Auto-closes visually when stop/target hit (marks status, shows outcome)
2. **Recent simulations** — the existing dry-run history (kept but demoted)

**Files:**
- `src/services/flag-engine.ts` — fix `getTradePlan` for live flags
- `src/app/flags/[id]/trade-plan/page.tsx` — enable the button
- `src/app/flags/[id]/trade-plan/ExecutionModeSelector.tsx` — wire up paper trade creation
- `src/lib/paper-positions.ts` — CRUD helpers for localStorage paper positions
- `src/components/OpenPositionCard.tsx` — live P&L card for dashboard
- `src/app/dashboard/page.tsx` — add Open Positions section

---

### 3. Trade Journal (`/journal`)

A chronological ledger of all paper trades (open and closed).

- Tabs: **Open** | **Closed** | **All**
- Each entry: asset, direction, entry/exit prices, P&L, duration, outcome badge
- Summary row at top: total trades, win rate, total P&L, best/worst trade
- Open positions show live P&L (reuses `OpenPositionCard`)
- Closed positions show final outcome

**Files:**
- `src/app/journal/page.tsx` (client)
- Add "Journal" to Navbar

---

### 4. Settings persistence

The Settings page currently saves nothing. Wire it to localStorage:
- Save `RiskSettings` to `trade-daddy-risk-settings`
- Load on mount with defaults
- `minConvictionThreshold` passed to briefing API as `?minConviction=N` query param
  - Briefing API respects it when filtering flags

**Files:**
- `src/app/settings/page.tsx` — load/save to localStorage
- `src/app/api/briefing/route.ts` — accept `?minConviction=` param
- `src/lib/preferences.ts` — merge preferences + settings cleanup

---

## Implementation order

1. **Watchlist** — highest visibility, uses existing primitives (LivePriceTicker, MiniSparkline)
2. **Paper positions lib + trade plan generation** — foundation for 3 and 4
3. **Open positions on dashboard** — closes the core loop, highest user value
4. **Trade plan page enable** — connects flag detail → live trade plan → paper execution
5. **Journal page** — history and performance view
6. **Settings persistence** — polish; lower risk

---

## Not in scope

- Alpaca live execution (requires broker credentials)
- Push notifications
- Server-side persistence (Vercel KV) — localStorage is sufficient for Phase 3
- Multi-account / portfolio tracking
