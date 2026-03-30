/**
 * Mission Control Types — instrument-centric trading intelligence.
 */

import type { Direction, EconomicEvent } from "@/types";
import type { RegimeState } from "@/services/intelligence/regime";
import type { SignalProfile } from "@/services/signal-profile";

// ---------------------------------------------------------------------------
// Instrument model
// ---------------------------------------------------------------------------

export type InstrumentId = string;

export interface WatchedInstrument {
  symbol: InstrumentId;
  name: string;
  assetClass: "crypto" | "fx" | "equity" | "commodity" | "index";
}

// ---------------------------------------------------------------------------
// Regime (enhanced, per-instrument)
// ---------------------------------------------------------------------------

export type TrendState = "strong_up" | "up" | "flat" | "down" | "strong_down";
export type VolatilityState = "extreme" | "elevated" | "normal" | "compressed";
export type EventRisk = "high" | "medium" | "low" | "none";
export type SessionState = "london" | "ny" | "overlap" | "asia" | "closed" | "crypto_24h";

export interface InstrumentRegime {
  symbol: InstrumentId;
  trend: TrendState;
  trendLabel: string;
  volatility: VolatilityState;
  volatilityLabel: string;
  eventRisk: EventRisk;
  session: SessionState;
  sessionLabel: string;
  regimeSummary: string;        // "Trending up, normal vol, CPI in 2 days"
  favouredStyles: string[];     // ["trend continuation", "pullback"]
  avoidStyles: string[];        // ["mean reversion"]
  upcomingEvents: { title: string; date: string; impact: string }[];
  signalProfile: SignalProfile | null;
  raw: RegimeState;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Setup types
// ---------------------------------------------------------------------------

export type SetupType =
  | "trend_continuation"
  | "pullback"
  | "breakout"
  | "mean_reversion"
  | "event_driven";

export interface Setup {
  id: string;
  symbol: InstrumentId;
  type: SetupType;
  typeLabel: string;
  direction: Direction;
  label: string;                // "BTC pullback to 20-day mean"
  thesis: string;
  confidence: number;
  entryCondition: string;
  stopLoss: string;
  target: string;
  holdPeriod: string;
  catalyst?: string;
  sentiment?: {
    score: number;            // -100 to 100
    label: string;            // "Bullish" / "Bearish" / "Neutral"
    alignment: number;        // 0-100: how aligned sentiment is with trade direction
    alignmentLabel: string;   // "75% aligned with long thesis"
  };
  regime: InstrumentRegime;
  backtestSummary?: {
    winRate: number;
    scenarioCount: number;
    profitFactor: number;
  };
  detectedAt: string;
  tradeDay?: string;        // "Monday" / "Tuesday" etc
  tradeDayLabel?: string;   // "Monday (Today)" / "Wednesday (Tomorrow)" / "Friday"
  tradeDayDate?: string;    // ISO date
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export interface InstrumentSummary {
  symbol: InstrumentId;
  name: string;
  assetClass: string;
  regime: InstrumentRegime;
  setups: Setup[];
  todayFocus: string;           // "Watch for breakout above 68k"
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  priceHistory7d: number[];
}

export interface MissionControlData {
  instruments: InstrumentSummary[];
  aiBrief: {
    headline: string;
    detail: string;
    sections: {
      title: string;
      content: string;
    }[];
  };
  calendarHighlights: { title: string; date: string; impact: string; country: string }[];
  dataSource: string;
  updatedAt: string;
}
