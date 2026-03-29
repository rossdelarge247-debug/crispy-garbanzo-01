/**
 * Automated Test Generator
 *
 * Generates and runs experiments for hypotheses using available live data:
 * - News sentiment alignment
 * - Social sentiment cross-source agreement
 * - News volume / coverage intensity
 * - Fear & Greed market mood alignment
 * - Headline momentum (are recent articles trending with or against the hypothesis?)
 *
 * No AI API key required — uses the data already fetched by the flag generator
 * and social sentiment provider to evaluate each hypothesis programmatically.
 */

import type {
  TestScenario,
  TestResult,
  Hypothesis,
  MarketFlagDetail,
  NewsArticle,
} from "@/types";
import { getNewsProvider } from "@/services/news";
import {
  getSocialSentiment,
  type CompositeSocialSentiment,
  type SocialSignal,
} from "@/services/social-sentiment";

// ---------------------------------------------------------------------------
// Test definitions — each test type knows how to evaluate itself
// ---------------------------------------------------------------------------

interface TestInput {
  hypothesis: Hypothesis;
  flag: MarketFlagDetail;
  articles: NewsArticle[];
  socialSentiment: CompositeSocialSentiment | null;
}

type TestGenerator = (input: TestInput) => TestScenario | null;

// ---------------------------------------------------------------------------
// Test 1: News Sentiment Alignment
// Does the sentiment of recent news support this hypothesis direction?
// ---------------------------------------------------------------------------
function newsSentimentAlignmentTest(input: TestInput): TestScenario {
  const { hypothesis, flag, articles } = input;

  const avgSentiment = articles.length > 0
    ? articles.reduce((s, a) => s + a.sentiment, 0) / articles.length
    : 0;
  const sentimentScore = avgSentiment * 100; // -100 to 100

  // Check alignment with hypothesis direction
  const aligned =
    (hypothesis.direction === "long" && sentimentScore > 10) ||
    (hypothesis.direction === "short" && sentimentScore < -10) ||
    (hypothesis.direction === "neutral" && Math.abs(sentimentScore) < 20);

  const stronglyAligned =
    (hypothesis.direction === "long" && sentimentScore > 30) ||
    (hypothesis.direction === "short" && sentimentScore < -30);

  const opposed =
    (hypothesis.direction === "long" && sentimentScore < -15) ||
    (hypothesis.direction === "short" && sentimentScore > 15);

  let result: TestResult;
  let confidenceImpact: number;
  if (stronglyAligned) { result = "pass"; confidenceImpact = 8; }
  else if (aligned) { result = "pass"; confidenceImpact = 5; }
  else if (opposed) { result = "fail"; confidenceImpact = -8; }
  else { result = "mixed"; confidenceImpact = 0; }

  const dirLabel = hypothesis.direction === "long" ? "bullish" : hypothesis.direction === "short" ? "bearish" : "neutral";

  return {
    id: `auto-news-sentiment-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "News Sentiment Alignment",
    type: "scenario",
    description: `Tests whether the sentiment of ${articles.length} recent news articles supports the ${dirLabel} thesis. A ${dirLabel} hypothesis needs ${hypothesis.direction === "long" ? "positive" : hypothesis.direction === "short" ? "negative" : "neutral"} news tone to pass.`,
    result,
    confidenceImpact,
    details: `Aggregate news sentiment score: ${sentimentScore.toFixed(0)} (scale: -100 bearish to +100 bullish). ${
      stronglyAligned ? "News tone strongly supports this direction." :
      aligned ? "News tone moderately supports this direction." :
      opposed ? "News tone contradicts this hypothesis — caution warranted." :
      "News tone is ambiguous — no clear directional signal."
    }`,
    metrics: {
      "Sentiment score": sentimentScore.toFixed(0),
      "Articles analyzed": articles.length,
      "Direction": dirLabel,
      "Alignment": stronglyAligned ? "Strong" : aligned ? "Moderate" : opposed ? "Opposed" : "Neutral",
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test 2: Social Sentiment Cross-Source Agreement
// Do Reddit, StockTwits, and Fear & Greed agree on direction?
// ---------------------------------------------------------------------------
function socialAgreementTest(input: TestInput): TestScenario | null {
  const { hypothesis, flag } = input;
  const social = input.socialSentiment;
  if (!social) return null;

  const activeSignals = social.signals.filter(s => s.volume > 0 && s.source !== "composite");
  if (activeSignals.length < 2) return null;

  // Check if signals agree with hypothesis direction
  const supporting = activeSignals.filter(s =>
    (hypothesis.direction === "long" && s.score > 10) ||
    (hypothesis.direction === "short" && s.score < -10) ||
    (hypothesis.direction === "neutral" && Math.abs(s.score) < 15)
  );

  const opposing = activeSignals.filter(s =>
    (hypothesis.direction === "long" && s.score < -15) ||
    (hypothesis.direction === "short" && s.score > 15)
  );

  const agreementRatio = supporting.length / activeSignals.length;

  let result: TestResult;
  let confidenceImpact: number;
  if (agreementRatio >= 0.75) { result = "pass"; confidenceImpact = 10; }
  else if (agreementRatio >= 0.5) { result = "mixed"; confidenceImpact = 3; }
  else if (opposing.length > supporting.length) { result = "fail"; confidenceImpact = -7; }
  else { result = "weak"; confidenceImpact = -2; }

  const sourceBreakdown = activeSignals
    .map(s => `${s.source === "reddit" ? "Reddit" : s.source === "stocktwits" ? "StockTwits" : "Fear/Greed"}: ${s.score > 10 ? "bullish" : s.score < -10 ? "bearish" : "neutral"} (${s.score})`)
    .join(", ");

  return {
    id: `auto-social-agreement-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "Social Sentiment Cross-Source Agreement",
    type: "sensitivity",
    description: `Checks whether Reddit, StockTwits, and Fear & Greed Index agree on the direction of this hypothesis. Cross-source agreement is a strong signal — when retail traders, dedicated platforms, and market mood indices align, the signal is more reliable.`,
    result,
    confidenceImpact,
    details: `${supporting.length}/${activeSignals.length} social sources support this direction. ${sourceBreakdown}. Overall agreement: ${social.agreement}%. ${
      result === "pass" ? "Strong cross-source consensus — retail and market mood both support this thesis." :
      result === "fail" ? "Sources disagree with this direction — the social crowd leans the other way." :
      "Mixed signals across sources — no clear social consensus."
    }`,
    metrics: {
      "Sources agreeing": `${supporting.length}/${activeSignals.length}`,
      "Sources opposing": opposing.length,
      "Agreement score": `${social.agreement}%`,
      "Composite score": social.compositeScore,
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test 3: Coverage Intensity
// Is there enough news volume to suggest this is a real market event?
// ---------------------------------------------------------------------------
function coverageIntensityTest(input: TestInput): TestScenario {
  const { hypothesis, flag, articles } = input;

  // Recent articles (last 48h)
  const now = Date.now();
  const recentArticles = articles.filter(a =>
    now - new Date(a.publishedAt).getTime() < 48 * 60 * 60 * 1000
  );

  // Multiple sources?
  const uniqueSources = new Set(articles.map(a => a.source));

  const volumeScore = articles.length;
  const recencyScore = recentArticles.length;
  const sourceScore = uniqueSources.size;

  let result: TestResult;
  let confidenceImpact: number;

  if (volumeScore >= 5 && recencyScore >= 3 && sourceScore >= 3) {
    result = "pass"; confidenceImpact = 7;
  } else if (volumeScore >= 3 && recencyScore >= 2) {
    result = "pass"; confidenceImpact = 4;
  } else if (volumeScore >= 2) {
    result = "mixed"; confidenceImpact = 1;
  } else {
    result = "weak"; confidenceImpact = -5;
  }

  return {
    id: `auto-coverage-intensity-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "Coverage Intensity Analysis",
    type: "analog",
    description: `Measures whether the news volume and source diversity around this theme is sufficient to represent a genuine market event rather than isolated noise. Higher coverage from more sources in a short window is a stronger signal.`,
    result,
    confidenceImpact,
    details: `${articles.length} total articles from ${uniqueSources.size} unique sources, with ${recentArticles.length} published in the last 48 hours. ${
      result === "pass" ? "This level of multi-source coverage suggests a genuine market event, not just a single-headline spike." :
      result === "mixed" ? "Moderate coverage — the theme is present but hasn't reached the intensity of a major market event yet." :
      "Low coverage intensity — this may be noise rather than a durable signal. Wait for more confirming articles."
    }`,
    metrics: {
      "Total articles": articles.length,
      "Last 48h": recentArticles.length,
      "Unique sources": uniqueSources.size,
      "Top source": [...uniqueSources][0] || "N/A",
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test 4: Market Mood Alignment (Fear & Greed)
// Does the macro mood support this direction?
// ---------------------------------------------------------------------------
function marketMoodTest(input: TestInput): TestScenario | null {
  const { hypothesis, flag } = input;
  const social = input.socialSentiment;
  if (!social) return null;

  const fng = social.signals.find(s => s.source === "fear_greed");
  if (!fng || fng.volume === 0) return null;

  // Fear/Greed score: -100 (extreme fear) to +100 (extreme greed)
  const mood = fng.score;

  const isRiskOn = hypothesis.direction === "long" &&
    !["short"].includes(hypothesis.direction);

  let aligned: boolean;
  let reasoning: string;

  if (hypothesis.direction === "long") {
    aligned = mood > 0; // greed supports long
    reasoning = mood > 30
      ? "Market mood is greedy — supports bullish positioning but watch for overextension."
      : mood > 0
        ? "Market mood is mildly positive — consistent with a long thesis."
        : mood > -30
          ? "Market mood is cautious — long positions face headwinds from fearful sentiment."
          : "Market mood is fearful — contrarian for longs, but risky without a catalyst.";
  } else if (hypothesis.direction === "short") {
    aligned = mood < 0; // fear supports short
    reasoning = mood < -30
      ? "Market mood is fearful — supports defensive/short positioning."
      : mood < 0
        ? "Market mood is mildly negative — consistent with a cautious thesis."
        : "Market mood is positive — short thesis faces headwinds from market optimism.";
  } else {
    aligned = Math.abs(mood) < 25; // neutral mood supports neutral thesis
    reasoning = Math.abs(mood) < 25
      ? "Market mood is balanced — consistent with a directionless/volatile scenario."
      : "Market mood has a strong directional lean — pure neutral may not hold.";
  }

  const result: TestResult = aligned ? "pass" : Math.abs(mood) < 15 ? "mixed" : "fail";
  const confidenceImpact = aligned ? 5 : Math.abs(mood) < 15 ? 0 : -5;

  return {
    id: `auto-market-mood-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "Market Mood Alignment",
    type: "scenario",
    description: `Evaluates whether the broader market mood (Fear & Greed Index) supports this hypothesis. Market mood captures aggregate investor psychology — when it aligns with a thesis, the probability of follow-through increases.`,
    result,
    confidenceImpact,
    details: `Fear & Greed Index: ${fng.label} (score: ${mood}). ${reasoning}`,
    metrics: {
      "Fear & Greed": fng.label,
      "Score": mood,
      "Aligned": aligned ? "Yes" : "No",
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test 5: Headline Momentum
// Are the most recent articles trending toward or away from the hypothesis?
// ---------------------------------------------------------------------------
function headlineMomentumTest(input: TestInput): TestScenario | null {
  const { hypothesis, flag, articles } = input;
  if (articles.length < 4) return null;

  // Split articles into older half and newer half
  const sorted = [...articles].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  const midpoint = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, midpoint);
  const newer = sorted.slice(midpoint);

  const olderSentiment = older.reduce((s, a) => s + a.sentiment, 0) / older.length;
  const newerSentiment = newer.reduce((s, a) => s + a.sentiment, 0) / newer.length;
  const momentum = newerSentiment - olderSentiment; // positive = sentiment improving

  const directionMatch =
    (hypothesis.direction === "long" && momentum > 0.05) ||
    (hypothesis.direction === "short" && momentum < -0.05);

  const directionOpposed =
    (hypothesis.direction === "long" && momentum < -0.1) ||
    (hypothesis.direction === "short" && momentum > 0.1);

  let result: TestResult;
  let confidenceImpact: number;
  if (directionMatch && Math.abs(momentum) > 0.15) { result = "pass"; confidenceImpact = 8; }
  else if (directionMatch) { result = "pass"; confidenceImpact = 4; }
  else if (directionOpposed) { result = "fail"; confidenceImpact = -6; }
  else { result = "mixed"; confidenceImpact = 0; }

  const trendDirection = momentum > 0.05 ? "improving" : momentum < -0.05 ? "deteriorating" : "stable";

  return {
    id: `auto-headline-momentum-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "Headline Momentum",
    type: "backtest",
    description: `Compares the sentiment of older vs newer articles to detect whether headlines are trending toward or away from this hypothesis. Accelerating sentiment in the hypothesis direction is a strong confirmation signal.`,
    result,
    confidenceImpact,
    details: `Older articles avg sentiment: ${(olderSentiment * 100).toFixed(0)}, newer articles: ${(newerSentiment * 100).toFixed(0)}. Momentum: ${trendDirection} (delta: ${(momentum * 100).toFixed(1)}). ${
      directionMatch ? "Headline sentiment is accelerating in the direction of this hypothesis — a positive signal." :
      directionOpposed ? "Headline sentiment is moving against this hypothesis — the narrative may be shifting." :
      "No clear momentum in either direction — sentiment is flat."
    }`,
    metrics: {
      "Older avg": (olderSentiment * 100).toFixed(0),
      "Newer avg": (newerSentiment * 100).toFixed(0),
      "Momentum": `${momentum > 0 ? "+" : ""}${(momentum * 100).toFixed(1)}`,
      "Trend": trendDirection,
      "Articles compared": `${older.length} vs ${newer.length}`,
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test 6: Reddit Retail Conviction
// Is the retail crowd on Reddit showing strong conviction?
// ---------------------------------------------------------------------------
function redditConvictionTest(input: TestInput): TestScenario | null {
  const { hypothesis, flag } = input;
  const social = input.socialSentiment;
  if (!social) return null;

  const reddit = social.signals.find(s => s.source === "reddit");
  if (!reddit || reddit.volume === 0) return null;

  const aligned =
    (hypothesis.direction === "long" && reddit.score > 15) ||
    (hypothesis.direction === "short" && reddit.score < -15);

  const stronglyAligned =
    (hypothesis.direction === "long" && reddit.score > 35) ||
    (hypothesis.direction === "short" && reddit.score < -35);

  const opposed =
    (hypothesis.direction === "long" && reddit.score < -10) ||
    (hypothesis.direction === "short" && reddit.score > 10);

  let result: TestResult;
  let confidenceImpact: number;
  if (stronglyAligned) { result = "pass"; confidenceImpact = 6; }
  else if (aligned) { result = "pass"; confidenceImpact = 3; }
  else if (opposed) { result = "weak"; confidenceImpact = -4; }
  else { result = "mixed"; confidenceImpact = 0; }

  return {
    id: `auto-reddit-conviction-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    flagId: flag.id,
    name: "Reddit Retail Conviction",
    type: "sensitivity",
    description: `Analyzes sentiment from Reddit trading communities (r/wallstreetbets, r/stocks, r/cryptocurrency) to gauge retail investor conviction. Retail sentiment can be a leading or contrarian indicator depending on context.`,
    result,
    confidenceImpact,
    details: `Reddit sentiment: ${reddit.label} (score: ${reddit.score}, ${reddit.volume} posts analyzed). ${
      stronglyAligned ? "Strong retail conviction aligns with this thesis — the crowd is positioned this way." :
      aligned ? "Moderate retail support for this direction." :
      opposed ? "Retail sentiment leans against this hypothesis — could be a contrarian signal or a genuine warning." :
      "Reddit sentiment is neutral on this theme — no strong retail conviction either way."
    }${reddit.samplePosts.length > 0 ? ` Top post: "${reddit.samplePosts[0].slice(0, 80)}..."` : ""}`,
    metrics: {
      "Reddit score": reddit.score,
      "Posts analyzed": reddit.volume,
      "Sentiment": reddit.label,
    },
    runAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main: generate all tests for a hypothesis
// ---------------------------------------------------------------------------

const TEST_GENERATORS: TestGenerator[] = [
  newsSentimentAlignmentTest,
  socialAgreementTest,
  coverageIntensityTest,
  marketMoodTest,
  headlineMomentumTest,
  redditConvictionTest,
];

export async function generateTestsForHypothesis(
  hypothesis: Hypothesis,
  flag: MarketFlagDetail,
): Promise<TestScenario[]> {
  // Fetch the data we need
  const newsProvider = getNewsProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const searchQuery = primaryAsset?.name.toLowerCase() || flag.category.split("/")[0].trim().toLowerCase();

  const [articles, socialSentiment] = await Promise.all([
    newsProvider.getNews(searchQuery, 15),
    primaryAsset ? getSocialSentiment(primaryAsset.symbol, searchQuery) : Promise.resolve(null),
  ]);

  const input: TestInput = { hypothesis, flag, articles, socialSentiment };

  // Run all test generators, filter out nulls
  const tests = TEST_GENERATORS
    .map(gen => gen(input))
    .filter((t): t is TestScenario => t !== null);

  return tests;
}

// ---------------------------------------------------------------------------
// Batch: generate tests for all hypotheses of a flag
// ---------------------------------------------------------------------------

export async function generateTestsForFlag(
  hypotheses: Hypothesis[],
  flag: MarketFlagDetail,
): Promise<TestScenario[]> {
  // Share the data fetch across all hypotheses (avoid duplicate API calls)
  const newsProvider = getNewsProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const searchQuery = primaryAsset?.name.toLowerCase() || flag.category.split("/")[0].trim().toLowerCase();

  const [articles, socialSentiment] = await Promise.all([
    newsProvider.getNews(searchQuery, 15),
    primaryAsset ? getSocialSentiment(primaryAsset.symbol, searchQuery) : Promise.resolve(null),
  ]);

  const allTests: TestScenario[] = [];

  for (const hypothesis of hypotheses) {
    const input: TestInput = { hypothesis, flag, articles, socialSentiment };
    const tests = TEST_GENERATORS
      .map(gen => gen(input))
      .filter((t): t is TestScenario => t !== null);
    allTests.push(...tests);
  }

  return allTests;
}
