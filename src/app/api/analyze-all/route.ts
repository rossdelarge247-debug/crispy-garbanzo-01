import { NextResponse } from "next/server";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import { runAnalysis, ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import type { AnalysisRequest } from "@/services/ai-analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flagId = searchParams.get("flagId");

  if (!flagId) {
    return NextResponse.json({ error: "Missing flagId" }, { status: 400 });
  }

  const flag = await getFlagById(flagId);
  if (!flag) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }

  const [hypotheses, articles, socialSentiment] = await Promise.all([
    getHypotheses(flagId),
    (async () => {
      const newsProvider = getNewsProvider();
      const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
      return primaryAsset ? newsProvider.getNewsBySymbol(primaryAsset.symbol, 10) : [];
    })(),
    (async () => {
      const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
      return primaryAsset ? getSocialSentiment(primaryAsset.symbol) : null;
    })(),
  ]);

  // Run all 6 frameworks in parallel
  const results = await Promise.all(
    ANALYSIS_FRAMEWORKS.map(async (framework) => {
      const req: AnalysisRequest = {
        type: framework.type,
        flag,
        hypotheses,
        articles,
        socialSentiment,
      };
      try {
        return await runAnalysis(req);
      } catch (error) {
        return {
          type: framework.type,
          title: framework.title,
          content: "Analysis could not be completed.",
          source: "rules" as const,
          generatedAt: new Date().toISOString(),
        };
      }
    })
  );

  return NextResponse.json({ results, generatedAt: new Date().toISOString() });
}
