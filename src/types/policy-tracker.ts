/**
 * Policy Tracker Types — Trump administration market intelligence.
 */

import type { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Policy announcement
// ---------------------------------------------------------------------------

export type PolicyCategory =
  | "tariffs"
  | "energy"
  | "tech"
  | "fiscal"
  | "defence"
  | "fed"
  | "foreign_policy"
  | "other";

export interface PolicyAnnouncement {
  id: string;
  title: string;
  summary: string;
  fullText?: string;
  source: "truth_social" | "white_house" | "reuters" | "press_briefing" | "executive_order" | "social_media";
  sourceUrl?: string;
  category: PolicyCategory;
  publishedAt: string;
  impact: "high" | "medium" | "low";

  // Market implications
  affectedAssets: PolicyAssetImpact[];
  sentiment: "bullish" | "bearish" | "mixed" | "unknown";
  marketMoving: boolean;

  // AI analysis
  aiAnalysis?: string;
  scenarios?: PolicyScenario[];

  // Timing
  isWeekend: boolean;
  dayLabel: string;
  timeLabel: string;
}

export interface PolicyAssetImpact {
  symbol: string;
  name: string;
  direction: Direction;
  reasoning: string;
  confidence: number;       // 0-100
  sector: string;
}

export interface PolicyScenario {
  title: string;
  probability: number;
  marketReaction: string;
  tradeAction: string;
}

// ---------------------------------------------------------------------------
// Trade recommendation from policy event
// ---------------------------------------------------------------------------

export interface PolicyTrade {
  asset: string;
  assetName: string;
  direction: Direction;
  thesis: string;
  timing: string;           // "Monday open" / "Immediately" / "Wait for confirmation"
  stopLossPercent: number;
  takeProfitPercent: number;
  leverage: number;
  tradeAmount: number;
  exposure: number;
  maxWin: number;
  maxLoss: number;
  riskReward: number;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Pattern
// ---------------------------------------------------------------------------

export interface PolicyPattern {
  name: string;
  description: string;
  frequency: string;        // "Occurs ~40% of Fridays"
  avgImpact: string;        // "+1.2% on affected sector"
  lastOccurrence: string;
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export interface PolicyDashboardData {
  announcements: PolicyAnnouncement[];
  activeTrades: PolicyTrade[];
  sentimentPulse: {
    overall: "bullish" | "bearish" | "mixed";
    score: number;          // -100 to 100
    sources: { name: string; sentiment: string; volume: number }[];
  };
  weekendAlert: boolean;
  patterns: PolicyPattern[];
  brief: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Category labels + colours
// ---------------------------------------------------------------------------

export const CATEGORY_CONFIG: Record<PolicyCategory, { label: string; color: string; emoji: string }> = {
  tariffs: { label: "Trade & Tariffs", color: "var(--red)", emoji: "🏗" },
  energy: { label: "Energy", color: "var(--amber)", emoji: "⛽" },
  tech: { label: "Tech & AI", color: "var(--accent)", emoji: "💻" },
  fiscal: { label: "Fiscal & Tax", color: "var(--green)", emoji: "💰" },
  defence: { label: "Defence", color: "var(--text-muted)", emoji: "🛡" },
  fed: { label: "Fed & Monetary", color: "var(--amber)", emoji: "🏦" },
  foreign_policy: { label: "Foreign Policy", color: "var(--red)", emoji: "🌍" },
  other: { label: "Other", color: "var(--text-muted)", emoji: "📋" },
};
