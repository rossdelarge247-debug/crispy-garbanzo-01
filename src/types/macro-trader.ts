/**
 * Macro Trader Types — event-driven trading intelligence.
 *
 * The economic calendar is the product. Every trade idea
 * is anchored to a specific event.
 */

import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Calendar event (enriched)
// ---------------------------------------------------------------------------

export interface MacroEvent {
  id: string;
  title: string;
  country: string;
  date: string;              // ISO
  impact: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
  actual?: string;

  // Enrichment
  category: EventCategory;
  affectedAssets: { symbol: string; name: string; direction: Direction; reasoning: string }[];
  conviction: number;        // 0-100: how tradeable is this event
  topTrade?: MacroTrade;
  aiAnalysis?: EventAnalysis;
  historicalWinRate?: number;
  historicalInstances?: number;
  dayLabel: string;          // "Wednesday (Today)"
  timeLabel: string;         // "13:30 GMT"
  hoursUntil: number;
}

export type EventCategory =
  | "central_bank"
  | "inflation"
  | "employment"
  | "growth"
  | "trade"
  | "sentiment"
  | "energy"
  | "other";

// ---------------------------------------------------------------------------
// AI event analysis
// ---------------------------------------------------------------------------

export interface EventScenario {
  title: string;
  probability: number;
  outcome: string;           // "CPI beats at 3.4%"
  marketReaction: string;    // "Dollar strengthens, gold drops"
  tradeDirection: Direction;
  priceImpact: string;       // "EUR/USD drops 50-80 pips"
}

export interface EventAnalysis {
  summary: string;
  whatMarketExpects: string;
  whatCouldSurprise: string;
  scenarios: EventScenario[];
  keyQuestion: string;
  source: "ai" | "rules";
}

// ---------------------------------------------------------------------------
// Trade plan for an event
// ---------------------------------------------------------------------------

export interface MacroTrade {
  asset: string;
  assetName: string;
  direction: Direction;
  thesis: string;            // one sentence
  entry: string;             // "Before CPI release" or "On reaction dip"
  stopLossPercent: number;   // tighter side (1-2%)
  takeProfitPercent: number; // wider side (2-4%) — always ≥2:1 R:R
  holdPeriod: string;
  leverage: number;
  tradeAmount: number;       // £1,000 default
  exposure: number;
  maxLoss: number;
  expectedReturn: number;    // (winRate × target) - (lossRate × stop)
  riskReward: number;        // always ≥ 2.0
}

// ---------------------------------------------------------------------------
// Historical precedent for an event type
// ---------------------------------------------------------------------------

export interface EventPrecedent {
  date: string;
  actual?: string;
  forecast?: string;
  surprise: "beat" | "miss" | "inline";
  assetMove: number;         // % move in the target asset
  assetSymbol: string;
  daysTracked: number;
  won: boolean;              // did the recommended direction work?
  headlines: string[];       // news from that date
  narrativeMatch?: number;   // how similar the news was
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export interface MacroCalendarData {
  events: MacroEvent[];
  aiBrief: {
    headline: string;
    detail: string;
  };
  weekRange: { from: string; to: string };
  dataSource: string;
  updatedAt: string;
}
