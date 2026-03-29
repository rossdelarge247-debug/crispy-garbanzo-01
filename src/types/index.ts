// === Validated Idea (the final output — only quality-cleared ideas) ===

export interface ValidatedIdea {
  flag: MarketFlagDetail;
  hypothesis: Hypothesis;
  backtestSummary: {
    winRate: number;
    scenarioCount: number;
    profitFactor: number;
    avgReturn: number;
    avgDaysHeld: number;
  };
  recommendation: {
    action: "enter_now" | "wait" | "skip";
    confidence: number;
    confidenceLabel: string;
    direction: Direction;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    holdDays: number;
    suggestedAmount: number;
    suggestedLeverage: number;
    reasons: string[];
    risks: string[];
    summary: string;
    // Text descriptions (for AI-generated ideas where levels are described, not numeric)
    entryText?: string;
    stopText?: string;
    targetText?: string;
    holdText?: string;
    catalyst?: string;
    timing?: string;
    whatToWatch?: string;
  };
  qualityScore: number;
  newsHeadlines: string[];
  priceHistory7d: number[];     // last 7 daily closes for sparkline
  dataSource: "live" | "mock";
}

// === Core Entities ===

export type FlagStatus = "emerging" | "active" | "maturing" | "volatile" | "invalidated";
export type AssetClass = "equity" | "forex" | "crypto" | "commodity" | "bond" | "index";
export type Direction = "long" | "short" | "neutral";
export type ConvictionLevel = "high" | "medium" | "low";
export type TimeHorizon = "days" | "weeks" | "months";
export type ExecutionMode = "watch" | "paper" | "live" | "autonomous";

export type HypothesisStatus = "active" | "confirmed" | "weakening" | "invalidated";
export type TradePlanStatus = "draft" | "pending_approval" | "approved" | "active" | "closed" | "cancelled";
export type TestResult = "pass" | "mixed" | "weak" | "fail";

export interface AffectedAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  direction: Direction;
  impact: "primary" | "secondary";
}

export interface MarketFlag {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  convictionScore: number; // 0-100
  convictionLevel: ConvictionLevel;
  status: FlagStatus;
  timeHorizon: TimeHorizon;
  timeHorizonDays: number;
  affectedAssets: AffectedAsset[];
  drivers: string[];
  category: string;
  suggestedAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  source?: string;
}

export interface MarketFlagDetail extends MarketFlag {
  whatChanged: string;
  timeline: TimelineEvent[];
  sentimentSummary: string;
  sentimentScore: number; // -100 to 100
  priceContext: string;
  supportingEvidence: string[];
  relatedFlags?: string[];
}

export interface Hypothesis {
  id: string;
  flagId: string;
  title: string;
  direction: Direction;
  summary: string;
  rationale: string;
  confidenceScore: number; // 0-100
  invalidation: string;
  timeHorizon: TimeHorizon;
  timeHorizonDays: number;
  status: HypothesisStatus;
  suggestedAction: string;
  createdAt: string;
}

export interface TestScenario {
  id: string;
  hypothesisId: string;
  flagId: string;
  name: string;
  type: "analog" | "scenario" | "sensitivity" | "backtest" | "simulation";
  description: string;
  result: TestResult;
  confidenceImpact: number; // how much this shifts confidence (-20 to +20)
  details: string;
  metrics?: Record<string, string | number>;
  runAt: string;
}

export interface TradePlan {
  id: string;
  flagId: string;
  hypothesisId: string;
  asset: string;
  assetClass: AssetClass;
  direction: Direction;
  entryType: "market" | "limit" | "stop";
  entryPrice: number;
  entryRangeHigh?: number;
  stopLoss: number;
  takeProfitTargets: number[];
  maxHoldingPeriod: string;
  suggestedSize: number;
  riskPercent: number;
  status: TradePlanStatus;
  executionMode: ExecutionMode;
  createdAt: string;
}

export interface RiskSettings {
  minConvictionThreshold: number;
  minTestPassThreshold: number;
  perTradeRiskPercent: number;
  maxDailyLossPercent: number;
  maxWeeklyLossPercent: number;
  maxConcurrentPositions: number;
  autonomousModeEnabled: boolean;
  manualApprovalRequired: boolean;
  eventBlackoutEnabled: boolean;
  killSwitchActive: boolean;
  staleDataProtectionMinutes: number;
  alertsEnabled: boolean;
}

// === Provider Interfaces ===

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: number; // -1 to 1
  relevance: number; // 0 to 1
  symbols: string[];
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "high" | "medium" | "low";
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface SentimentData {
  symbol: string;
  score: number; // -100 to 100
  label: "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish";
  sources: number;
  timestamp: string;
}
