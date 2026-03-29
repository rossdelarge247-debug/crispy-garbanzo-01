import { NextResponse } from "next/server";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import { runAnalysis, ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import { synthesizeHypotheses } from "@/services/hypothesis-synthesizer";
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

  // Fetch context data
  const [existingHypotheses, articles, socialSentiment] = await Promise.all([
    getHypotheses(flagId),
    (async () => {
      const provider = getNewsProvider();
      const primary = flag.affectedAssets.find(a => a.impact === "primary");
      return primary ? provider.getNewsBySymbol(primary.symbol, 10) : [];
    })(),
    (async () => {
      const primary = flag.affectedAssets.find(a => a.impact === "primary");
      return primary ? getSocialSentiment(primary.symbol) : null;
    })(),
  ]);

  // Run all analysis frameworks
  const analysisResults = await Promise.all(
    ANALYSIS_FRAMEWORKS.map(async (framework) => {
      const req: AnalysisRequest = {
        type: framework.type,
        flag,
        hypotheses: existingHypotheses,
        articles,
        socialSentiment,
      };
      try {
        return await runAnalysis(req);
      } catch {
        return {
          type: framework.type,
          title: framework.title,
          content: "",
          source: "rules" as const,
          generatedAt: new Date().toISOString(),
        };
      }
    })
  );

  // Synthesize new hypotheses from analysis output
  const synthesized = await synthesizeHypotheses(
    flag,
    analysisResults,
    socialSentiment,
    existingHypotheses
  );

  return NextResponse.json({
    hypotheses: synthesized,
    analysisResults,
    generatedAt: new Date().toISOString(),
  });
}
