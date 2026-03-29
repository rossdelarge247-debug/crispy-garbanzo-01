/**
 * Scorecard Engine
 *
 * Aggregates all data sources into a single balanced scorecard
 * with clear grades, a synthesized recommendation, and categorized
 * trading opportunities by time horizon.
 *
 * Inputs: flag data, news articles, social sentiment, test results, hypotheses
 * Output: a single Scorecard object the UI renders directly
 */

import type {
  MarketFlagDetail,
  Hypothesis,
  TestScenario,
  NewsArticle,
} from "@/types";
import type { CompositeSocialSentiment } from "@/services/social-sentiment";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Grade = "A" | "B" | "C" | "D" | "F";
export type Recommendation = "strong_opportunity" | "worth_watching" | "wait" | "avoid";
export type TradeHorizon = "day_trade" | "swing_trade" | "position_trade";

export interface ScoreCategory {
  label: string;
  grade: Grade;
  score: number;       // 0-100
  summary: string;     // one sentence
  details: string;     // supporting explanation
}

export interface CategorizedHypothesis extends Hypothesis {
  horizon: TradeHorizon;
  horizonLabel: string;
  actionability: string;  // plain English what to do
}

export interface Scorecard {
  // Overall
  overallGrade: Grade;
  overallScore: number;
  recommendation: Recommendation;
  recommendationText: string;
  oneLiner: string;          // "Oil is hot. Tests confirm. Social agrees. Move with caution."

  // Category scores
  categories: ScoreCategory[];

  // Opportunities by time horizon
  dayTrades: CategorizedHypothesis[];
  swingTrades: CategorizedHypothesis[];
  positionTrades: CategorizedHypothesis[];

  // Meta
  dataSourcesUsed: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Grading helpers
// ---------------------------------------------------------------------------

function toGrade(score: number): Grade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function toRecommendation(score: number): Recommendation {
  if (score >= 75) return "strong_opportunity";
  if (score >= 55) return "worth_watching";
  if (score >= 35) return "wait";
  return "avoid";
}

function recommendationToText(rec: Recommendation, flagTitle: string): string {
  switch (rec) {
    case "strong_opportunity":
      return `Multiple data sources converge on this situation. The evidence is strong enough to explore trading opportunities around ${flagTitle.split(":")[0]}.`;
    case "worth_watching":
      return `There are promising signals here, but not all sources agree. Keep this on your radar and watch for more confirmation before committing.`;
    case "wait":
      return `The data is mixed or inconclusive. This situation is real, but the evidence doesn't clearly point to a tradeable opportunity yet.`;
    case "avoid":
      return `The signals are weak or conflicting. This may be noise rather than a genuine opportunity. Check back later.`;
  }
}

// ---------------------------------------------------------------------------
// Score each category
// ---------------------------------------------------------------------------

function scoreNewsSentiment(
  articles: NewsArticle[],
  flag: MarketFlagDetail
): ScoreCategory {
  if (articles.length === 0) {
    return {
      label: "News Sentiment",
      grade: "F",
      score: 0,
      summary: "No news data available.",
      details: "Connect a news provider to enable news sentiment scoring.",
    };
  }

  const avgSentiment = articles.reduce((s, a) => s + a.sentiment, 0) / articles.length;
  const absSentiment = Math.abs(avgSentiment);
  const hasDirection = absSentiment > 0.1;
  const uniqueSources = new Set(articles.map(a => a.source)).size;

  // Score: sentiment strength (0-40) + article volume (0-30) + source diversity (0-30)
  const sentimentScore = Math.min(absSentiment * 200, 40);
  const volumeScore = Math.min(articles.length * 5, 30);
  const diversityScore = Math.min(uniqueSources * 10, 30);
  const score = Math.round(sentimentScore + volumeScore + diversityScore);

  const direction = avgSentiment > 0.1 ? "bullish" : avgSentiment < -0.1 ? "bearish" : "neutral";

  return {
    label: "News Sentiment",
    grade: toGrade(score),
    score,
    summary: `${articles.length} articles from ${uniqueSources} sources. Tone is ${direction}.`,
    details: `Average sentiment: ${(avgSentiment * 100).toFixed(0)} (scale: -100 to +100). ${
      hasDirection
        ? `Clear ${direction} lean across coverage.`
        : "No strong directional bias in headlines."
    } ${articles.length >= 5 ? "Good article volume — this is getting real coverage." : "Limited coverage — early signal."}`,
  };
}

function scoreSocialSentiment(
  social: CompositeSocialSentiment | null
): ScoreCategory {
  if (!social) {
    return {
      label: "Social Sentiment",
      grade: "F",
      score: 0,
      summary: "No social data available.",
      details: "Social sentiment providers (Reddit, StockTwits) are not returning data.",
    };
  }

  const activeSources = social.signals.filter(s => s.volume > 0 && s.source !== "composite");

  // Score: signal strength (0-40) + source count (0-30) + agreement (0-30)
  const strengthScore = Math.min(Math.abs(social.compositeScore) * 1.2, 40);
  const sourceCountScore = Math.min(activeSources.length * 15, 30);
  const agreementScore = Math.round(social.agreement * 0.3);
  const score = Math.round(strengthScore + sourceCountScore + agreementScore);

  return {
    label: "Social Sentiment",
    grade: toGrade(score),
    score,
    summary: `${social.compositeLabel}. ${activeSources.length} sources, ${social.agreement}% agreement.`,
    details: `${activeSources.map(s => {
      const name = s.source === "reddit" ? "Reddit" : s.source === "stocktwits" ? "StockTwits" : "Fear & Greed";
      return `${name}: ${s.label.split("(")[0].trim()}`;
    }).join(" · ")}. ${
      social.agreement > 70
        ? "Sources broadly agree — strong cross-platform signal."
        : social.agreement > 40
          ? "Mixed agreement — some sources diverge."
          : "Sources disagree — conflicting signals."
    }`,
  };
}

function scoreCoverageIntensity(
  articles: NewsArticle[]
): ScoreCategory {
  const now = Date.now();
  const recent = articles.filter(a => now - new Date(a.publishedAt).getTime() < 48 * 60 * 60 * 1000);
  const uniqueSources = new Set(articles.map(a => a.source)).size;

  const volumeScore = Math.min(articles.length * 6, 40);
  const recencyScore = Math.min(recent.length * 10, 30);
  const diversityScore = Math.min(uniqueSources * 10, 30);
  const score = Math.round(volumeScore + recencyScore + diversityScore);

  return {
    label: "Coverage Intensity",
    grade: toGrade(score),
    score,
    summary: `${articles.length} articles, ${recent.length} in last 48h, ${uniqueSources} sources.`,
    details: `${
      score >= 70
        ? "High-intensity coverage from multiple outlets — this is a genuine market event."
        : score >= 45
          ? "Moderate coverage — the story is developing but hasn't reached peak intensity."
          : "Low coverage — this may be noise or a very early signal."
    }`,
  };
}

function scoreTestResults(
  tests: TestScenario[]
): ScoreCategory {
  if (tests.length === 0) {
    return {
      label: "Test Results",
      grade: "C",
      score: 50,
      summary: "No experiments run yet.",
      details: "Visit the test runner to validate hypotheses with automated experiments.",
    };
  }

  const passed = tests.filter(t => t.result === "pass").length;
  const mixed = tests.filter(t => t.result === "mixed").length;
  const passRate = passed / tests.length;
  const score = Math.round(passRate * 70 + (mixed / tests.length) * 20 + 10);

  return {
    label: "Test Results",
    grade: toGrade(score),
    score,
    summary: `${passed}/${tests.length} experiments passed. ${mixed} mixed.`,
    details: `Pass rate: ${Math.round(passRate * 100)}%. Net confidence impact: ${
      tests.reduce((s, t) => s + t.confidenceImpact, 0) > 0 ? "positive" : "negative or flat"
    }. ${
      passRate >= 0.6
        ? "Tests broadly validate the thesis."
        : passRate >= 0.3
          ? "Mixed results — some validation but also some red flags."
          : "Weak test performance — thesis may not hold."
    }`,
  };
}

function scoreConviction(flag: MarketFlagDetail): ScoreCategory {
  return {
    label: "Overall Conviction",
    grade: toGrade(flag.convictionScore),
    score: flag.convictionScore,
    summary: `${flag.convictionScore}% conviction. Status: ${flag.status}.`,
    details: `Based on the combination of news flow, sentiment signals, and market activity. ${
      flag.convictionScore >= 70
        ? "High conviction — the data strongly supports this being a real market event."
        : flag.convictionScore >= 50
          ? "Moderate conviction — real signals but some uncertainty remains."
          : "Low conviction — early stage or weak signals."
    }`,
  };
}

// ---------------------------------------------------------------------------
// Categorize hypotheses by time horizon
// ---------------------------------------------------------------------------

function categorizeHypotheses(
  hypotheses: Hypothesis[],
  flag: MarketFlagDetail
): { dayTrades: CategorizedHypothesis[]; swingTrades: CategorizedHypothesis[]; positionTrades: CategorizedHypothesis[] } {
  const categorized = hypotheses.map((h): CategorizedHypothesis => {
    // Determine horizon based on hypothesis traits
    let horizon: TradeHorizon;
    let horizonLabel: string;
    let actionability: string;

    if (h.direction === "neutral" || h.title.toLowerCase().includes("volatil")) {
      // Volatility plays tend to be short-term
      horizon = "day_trade";
      horizonLabel = "Day Trade";
      actionability = `Watch for sharp intraday moves in ${flag.affectedAssets[0]?.symbol || "the primary asset"}. Set tight stops.`;
    } else if (h.confidenceScore >= 65 && flag.timeHorizonDays <= 7) {
      horizon = "day_trade";
      horizonLabel = "Day Trade";
      actionability = `High confidence, short window. Look for entry on pullbacks within the day.`;
    } else if (h.confidenceScore >= 50 && flag.timeHorizonDays <= 14) {
      horizon = "swing_trade";
      horizonLabel = "Swing Trade (2-7 days)";
      actionability = `Hold for several days. Set stop loss at invalidation level and let the thesis play out.`;
    } else if (flag.timeHorizonDays > 14 || h.timeHorizonDays > 14) {
      horizon = "position_trade";
      horizonLabel = "Position Trade (1-4 weeks)";
      actionability = `Longer-term play. Build position gradually and give it room to breathe.`;
    } else {
      horizon = "swing_trade";
      horizonLabel = "Swing Trade (2-7 days)";
      actionability = `Medium-term opportunity. Monitor daily for confirmation or invalidation signals.`;
    }

    return {
      ...h,
      horizon,
      horizonLabel,
      actionability,
    };
  });

  return {
    dayTrades: categorized.filter(h => h.horizon === "day_trade").sort((a, b) => b.confidenceScore - a.confidenceScore),
    swingTrades: categorized.filter(h => h.horizon === "swing_trade").sort((a, b) => b.confidenceScore - a.confidenceScore),
    positionTrades: categorized.filter(h => h.horizon === "position_trade").sort((a, b) => b.confidenceScore - a.confidenceScore),
  };
}

// ---------------------------------------------------------------------------
// Generate one-liner
// ---------------------------------------------------------------------------

function generateOneLiner(
  categories: ScoreCategory[],
  overallScore: number
): string {
  const newsGrade = categories.find(c => c.label === "News Sentiment")?.grade || "F";
  const socialGrade = categories.find(c => c.label === "Social Sentiment")?.grade || "F";
  const testGrade = categories.find(c => c.label === "Test Results")?.grade || "C";

  if (overallScore >= 75) {
    return `Strong signals across the board. News (${newsGrade}), social (${socialGrade}), and tests (${testGrade}) all lean in the same direction.`;
  }
  if (overallScore >= 55) {
    return `Interesting setup. Some sources confirm, others are mixed. Worth watching closely for the next confirmation signal.`;
  }
  if (overallScore >= 35) {
    return `Data is inconclusive. The situation is real but the evidence doesn't point clearly to a trade yet.`;
  }
  return `Weak signals. Most sources either disagree or show no clear direction. Not actionable right now.`;
}

// ---------------------------------------------------------------------------
// Main: build the scorecard
// ---------------------------------------------------------------------------

export function buildScorecard(
  flag: MarketFlagDetail,
  hypotheses: Hypothesis[],
  tests: TestScenario[],
  articles: NewsArticle[],
  socialSentiment: CompositeSocialSentiment | null,
): Scorecard {
  const categories: ScoreCategory[] = [
    scoreConviction(flag),
    scoreNewsSentiment(articles, flag),
    scoreSocialSentiment(socialSentiment),
    scoreCoverageIntensity(articles),
    scoreTestResults(tests),
  ];

  // Overall score: weighted average
  const weights = [0.25, 0.25, 0.20, 0.15, 0.15];
  const overallScore = Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0)
  );

  const overallGrade = toGrade(overallScore);
  const recommendation = toRecommendation(overallScore);

  const { dayTrades, swingTrades, positionTrades } = categorizeHypotheses(hypotheses, flag);

  const dataSources: string[] = [];
  if (articles.length > 0) dataSources.push("News");
  if (socialSentiment && socialSentiment.signals.some(s => s.volume > 0)) dataSources.push("Social");
  if (tests.length > 0) dataSources.push("Tests");
  dataSources.push("Flag Engine");

  return {
    overallGrade,
    overallScore,
    recommendation,
    recommendationText: recommendationToText(recommendation, flag.title),
    oneLiner: generateOneLiner(categories, overallScore),
    categories,
    dayTrades,
    swingTrades,
    positionTrades,
    dataSourcesUsed: dataSources,
    generatedAt: new Date().toISOString(),
  };
}
