import { NextResponse } from "next/server";
import { getFlags, getHypotheses, getTestsForFlag, getDataSource } from "@/services/flag-engine";
import { getCalendarProvider } from "@/services/calendar";
import { getAssetName, getAssetDisplayName, getAssetShortName } from "@/lib/asset-names";
import { getSessionInfo } from "@/lib/session";
import { estimateRegimeFromFlag } from "@/services/intelligence/regime";
import { estimateChangepointFromFlag } from "@/services/intelligence/changepoint";
import { estimateAnomalyFromFlag } from "@/services/intelligence/anomaly";
import { quickConfidence } from "@/services/confidence-engine";
import { filterSuggestion } from "@/services/suggestion-filter";
import { adjustTodayAssessment, translateRegime } from "@/lib/intelligence-copy";
import type { MarketFlag, EconomicEvent, Direction } from "@/types";
import type { RiskStyle } from "@/services/suggestion-filter";

export const dynamic = "force-dynamic";

interface BriefingSuggestion {
  flag: MarketFlag;
  assetDisplayName: string;
  assetShortName: string;
  hypothesisCount: number;
  topHypothesis: string | null;
  topHypothesisDirection: string | null;
  testsPassed: number;
  testsTotal: number;
  verdict: "explore" | "monitor" | "wait";
  verdictReason: string;
  tradeabilityWarning: string | null;
  // Intelligence layer outputs (plain English only)
  regimeBadge: string;
  regimeColor: string;
  regimeExplanation: string;
  confidenceScore: number;
  confidenceGrade: "A" | "B" | "C" | "D" | "F";
  confidenceSummary: string;
  anomalyWarning: string | null;
  isEnhanced: boolean; // flag that intelligence layer ran
}

interface EnrichedEvent extends EconomicEvent {
  tradeRelevance?: string;
}

function sessionQualityScore(sessionState: string): number {
  switch (sessionState) {
    case "market_open": return 1.0;
    case "pre_market": return 0.5;
    case "post_market": return 0.4;
    case "weekend": return 0;
    case "closed": return 0;
    default: return 0.5;
  }
}

function hoursUntilNextEvent(events: EconomicEvent[]): number | null {
  const highImpact = events.filter(e => e.impact === "high");
  if (highImpact.length === 0) return null;
  const soonest = highImpact
    .map(e => ({ e, diff: (new Date(e.date).getTime() - Date.now()) / (1000 * 3600) }))
    .filter(({ diff }) => diff > 0)
    .sort((a, b) => a.diff - b.diff)[0];
  return soonest ? +soonest.diff.toFixed(1) : null;
}

function flagAgeHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 3600);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focusAssetsParam = searchParams.get("focusAssets");
  const focusAssets = focusAssetsParam ? focusAssetsParam.split(",") : [];
  const riskStyle = (searchParams.get("riskStyle") ?? "balanced") as RiskStyle;

  try {
    const [flags, dataSource, economicEvents] = await Promise.all([
      getFlags(),
      getDataSource(),
      getCalendarProvider().getUpcomingEvents(3),
    ]);

    const sessionInfo = getSessionInfo();
    const sqScore = sessionQualityScore(sessionInfo.state);
    const hoursToEvent = hoursUntilNextEvent(economicEvents);

    let filteredFlags = flags;
    if (focusAssets.length > 0) {
      filteredFlags = flags.filter(flag =>
        flag.affectedAssets.some(asset =>
          focusAssets.some(fa =>
            fa === asset.symbol || asset.symbol.includes(fa) || fa.includes(asset.symbol)
          )
        )
      );
      if (filteredFlags.length === 0) filteredFlags = flags;
    }

    const suggestions: BriefingSuggestion[] = await Promise.all(
      filteredFlags.map(async (flag) => {
        const hypotheses = await getHypotheses(flag.id);
        const tests = await getTestsForFlag(flag.id);
        const testsPassed = tests.filter(t => t.result === "pass").length;
        const topHyp = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

        const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
        const symbol = primaryAsset?.symbol || flag.affectedAssets[0]?.symbol || "";
        const direction: Direction = (topHyp?.direction ?? primaryAsset?.direction ?? "long");

        const ageHours = flagAgeHours(flag.createdAt);
        const sentimentScore = (flag as { sentimentScore?: number }).sentimentScore ?? 0;
        const articleCount = (flag.drivers?.length ?? 2) * 5; // proxy

        // Intelligence layer
        const regime = estimateRegimeFromFlag(flag.convictionScore, sentimentScore, ageHours);
        const changepoint = estimateChangepointFromFlag(flag.convictionScore, ageHours);
        const anomaly = estimateAnomalyFromFlag(flag.convictionScore, sentimentScore, articleCount);
        const testPassRate = tests.length > 0 ? testsPassed / tests.length : 0.5;
        const hypothesisAgreement = hypotheses.length > 0
          ? hypotheses.filter(h => h.direction === direction).length / hypotheses.length
          : 0.6;

        const confidence = quickConfidence(
          flag.convictionScore,
          testsPassed,
          tests.length,
          sentimentScore,
          ageHours,
          direction
        );

        const filtered = filterSuggestion(
          flag.convictionScore,
          confidence,
          regime,
          anomaly,
          direction,
          testPassRate,
          sqScore,
          hoursToEvent,
          riskStyle
        );

        // Skip suppressed items (they won't show)
        if (filtered.isSupressed) {
          return null as unknown as BriefingSuggestion;
        }

        const regimeTranslated = translateRegime(regime);

        return {
          flag,
          assetDisplayName: getAssetDisplayName(symbol),
          assetShortName: getAssetShortName(symbol),
          hypothesisCount: hypotheses.length,
          topHypothesis: topHyp?.title ?? null,
          topHypothesisDirection: topHyp?.direction ?? null,
          testsPassed,
          testsTotal: tests.length,
          verdict: filtered.verdict as "explore" | "monitor" | "wait",
          verdictReason: filtered.verdictReason,
          tradeabilityWarning: filtered.tradeabilityWarning,
          regimeBadge: regimeTranslated.badge,
          regimeColor: regimeTranslated.color,
          regimeExplanation: regimeTranslated.explanation,
          confidenceScore: confidence.finalScore,
          confidenceGrade: confidence.grade,
          confidenceSummary: confidence.summaryLine,
          anomalyWarning: anomaly.warning,
          isEnhanced: true,
        };
      })
    );

    const visibleSuggestions = suggestions.filter(Boolean);

    const order = { explore: 0, monitor: 1, wait: 2 };
    visibleSuggestions.sort((a, b) => order[a.verdict] - order[b.verdict]);

    // Compute dominant regime for today assessment
    const dominantRegime = visibleSuggestions.length > 0
      ? estimateRegimeFromFlag(
          visibleSuggestions[0].flag.convictionScore,
          (visibleSuggestions[0].flag as { sentimentScore?: number }).sentimentScore ?? 0,
          flagAgeHours(visibleSuggestions[0].flag.createdAt)
        )
      : estimateRegimeFromFlag(50, 0, 1);

    const dominantAnomaly = estimateAnomalyFromFlag(50, 0, 10);

    // Today assessment
    const explores = visibleSuggestions.filter(s => s.verdict === "explore");
    const monitors = visibleSuggestions.filter(s => s.verdict === "monitor");
    let baseStatus: "yes" | "maybe" | "no" = "no";
    let baseHeadline = "Nothing strong today";
    let baseDetail = "That's fine — Daddy will let you know when something comes up.";

    if (explores.length > 0) {
      const top = explores[0];
      baseStatus = "yes";
      baseHeadline = "There's a setup worth looking at today";
      baseDetail = `${top.assetDisplayName} — ${top.flag.title}`;
    } else if (monitors.length > 0) {
      baseStatus = "maybe";
      baseHeadline = "A few things are developing — worth keeping an eye on";
      baseDetail = `${monitors.length} situation${monitors.length > 1 ? "s" : ""} on the watchlist`;
    }

    const { status: adjustedStatus, regimeNote } = adjustTodayAssessment(
      baseStatus, dominantRegime, dominantAnomaly
    );

    const todayAssessment = {
      status: adjustedStatus,
      headline: baseHeadline,
      detail: baseDetail,
      regimeNote,
      sessionState: sessionInfo.state,
      sessionLabel: sessionInfo.label,
      sessionEmoji: sessionInfo.emoji,
      nextEvent: sessionInfo.nextEvent,
    };

    // Enrich economic events
    const enrichedEvents: EnrichedEvent[] = economicEvents.slice(0, 6).map(event => ({
      ...event,
      tradeRelevance: event.impact === "high"
        ? `Could create a trading opportunity — ${event.forecast ? `forecast is ${event.forecast}, previous was ${event.previous || "unknown"}` : "watch for surprises"}`
        : undefined,
    }));

    return NextResponse.json({
      todayAssessment,
      suggestions: visibleSuggestions,
      events: enrichedEvents,
      dataSource,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/briefing] Error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
