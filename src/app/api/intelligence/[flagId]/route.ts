/**
 * Intelligence API — per-flag confidence breakdown
 *
 * Returns the full 10-dimension confidence breakdown for a flag.
 * Used by the flag detail page to render the ConvictionMeter.
 */

import { NextResponse } from "next/server";
import { getFlagById, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import { getSessionInfo } from "@/lib/session";
import { estimateRegimeFromFlag, detectRegime } from "@/services/intelligence/regime";
import { estimateChangepointFromFlag, detectChangePoints } from "@/services/intelligence/changepoint";
import { estimateAnomalyFromFlag, computeAnomalyScore } from "@/services/intelligence/anomaly";
import { computeConfidence } from "@/services/confidence-engine";
import { filterSuggestion } from "@/services/suggestion-filter";
import { getMarketDataProvider } from "@/services/market-data";
import {
  translateRegime,
  translateConfidence,
  translateAnomaly,
  translateChangepoint,
} from "@/lib/intelligence-copy";
import type { Direction } from "@/types";
import type { RiskStyle } from "@/services/suggestion-filter";

export const dynamic = "force-dynamic";

function sessionQualityScore(state: string): number {
  switch (state) {
    case "market_open": return 1.0;
    case "pre_market": return 0.5;
    case "post_market": return 0.4;
    default: return 0;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const { flagId } = await params;
  const { searchParams } = new URL(request.url);
  const riskStyle = (searchParams.get("riskStyle") ?? "balanced") as RiskStyle;

  try {
    const flag = await getFlagById(flagId);
    if (!flag) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    const [hypotheses, tests, economicEvents] = await Promise.all([
      getHypotheses(flagId),
      getTestsForFlag(flagId),
      getCalendarProvider().getUpcomingEvents(2),
    ]);

    const sessionInfo = getSessionInfo();
    const sqScore = sessionQualityScore(sessionInfo.state);

    const testsPassed = tests.filter(t => t.result === "pass").length;
    const topHyp = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

    const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
    const direction: Direction = (topHyp?.direction ?? primaryAsset?.direction ?? "long") as Direction;

    const ageHours = (Date.now() - new Date(flag.createdAt).getTime()) / (1000 * 3600);
    const sentimentScore = (flag as { sentimentScore?: number }).sentimentScore ?? 0;
    const articleCount = (flag.drivers?.length ?? 2) * 5;
    const symbol = primaryAsset?.symbol ?? flag.affectedAssets[0]?.symbol ?? "";

    // Attempt to fetch real price history for the primary asset
    // If successful, use real data for regime/changepoint/anomaly — much more accurate
    let regime;
    let changepoint;
    let anomaly;

    try {
      const marketData = getMarketDataProvider();
      const history = await marketData.getHistorical(symbol, Math.min(flag.timeHorizonDays + 30, 90));
      const prices = history.map(d => d.price);
      const volumes = history.map(d => d.volume ?? 0);

      if (prices.length >= 10) {
        regime = detectRegime(prices, 60);
        changepoint = detectChangePoints(prices, 15);
        anomaly = computeAnomalyScore(prices, volumes);
      } else {
        regime = estimateRegimeFromFlag(flag.convictionScore, sentimentScore, ageHours);
        changepoint = estimateChangepointFromFlag(flag.convictionScore, ageHours);
        anomaly = estimateAnomalyFromFlag(flag.convictionScore, sentimentScore, articleCount);
      }
    } catch {
      regime = estimateRegimeFromFlag(flag.convictionScore, sentimentScore, ageHours);
      changepoint = estimateChangepointFromFlag(flag.convictionScore, ageHours);
      anomaly = estimateAnomalyFromFlag(flag.convictionScore, sentimentScore, articleCount);
    }

    const hypothesisAgreement = hypotheses.length > 0
      ? hypotheses.filter(h => h.direction === direction).length / hypotheses.length
      : 0.6;

    const highImpactEvents = economicEvents.filter(e => e.impact === "high");
    const soonest = highImpactEvents
      .map(e => (new Date(e.date).getTime() - Date.now()) / (1000 * 3600))
      .filter(h => h > 0)
      .sort((a, b) => a - b)[0] ?? null;

    const confidence = computeConfidence({
      direction,
      convictionScore: flag.convictionScore,
      regime,
      changepoint,
      anomaly,
      hypothesisCount: hypotheses.length,
      hypothesisDirectionAgreement: hypothesisAgreement,
      testsPassed,
      testsTotal: tests.length,
      sentimentScore,
      articleCountLast24h: articleCount,
      articleCountPrev24h: Math.max(1, articleCount - 3),
      hoursToNextEvent: soonest,
      sessionQuality: sqScore,
      flagAgeHours: ageHours,
    });

    const testPassRate = tests.length > 0 ? testsPassed / tests.length : 0.5;
    const filtered = filterSuggestion(
      flag.convictionScore,
      confidence,
      regime,
      anomaly,
      direction,
      testPassRate,
      sqScore,
      soonest,
      riskStyle
    );

    // Translate all model outputs to plain English
    const regimeTranslated = translateRegime(regime);
    const confidenceTranslated = translateConfidence(confidence);
    const anomalyTranslated = translateAnomaly(anomaly);
    const changepointTranslated = translateChangepoint(changepoint);

    return NextResponse.json({
      flagId,
      direction,
      confidence: {
        finalScore: confidence.finalScore,
        grade: confidence.grade,
        summaryLine: confidence.summaryLine,
        topPositive: confidence.topPositive,
        topNegative: confidence.topNegative,
        dimensions: confidence.dimensions,
        // Translated labels for UI
        ...confidenceTranslated,
      },
      regime: {
        ...regime,
        ...regimeTranslated,
      },
      changepoint: {
        hasRecentBreak: changepoint.hasRecentBreak,
        summary: changepoint.summary,
        ...changepointTranslated,
      },
      anomaly: {
        score: anomaly.score,
        level: anomaly.level,
        ...anomalyTranslated,
      },
      filter: {
        verdict: filtered.verdict,
        verdictReason: filtered.verdictReason,
        tradeabilityWarning: filtered.tradeabilityWarning,
        isSupressed: filtered.isSupressed,
      },
      session: {
        state: sessionInfo.state,
        label: sessionInfo.label,
        isActionable: sessionInfo.isActionable,
      },
    });
  } catch (error) {
    console.error("[api/intelligence] Error:", error);
    return NextResponse.json({ error: "Intelligence analysis failed" }, { status: 500 });
  }
}
