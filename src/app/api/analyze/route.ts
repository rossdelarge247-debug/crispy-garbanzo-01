import { NextResponse } from "next/server";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import { runAnalysis, ANALYSIS_FRAMEWORKS } from "@/services/ai-analysis";
import type { AnalysisRequest } from "@/services/ai-analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { flagId, analysisType, customPrompt } = body as {
      flagId: string;
      analysisType: string;
      customPrompt?: string;
    };

    if (!flagId || !analysisType) {
      return NextResponse.json({ error: "Missing flagId or analysisType" }, { status: 400 });
    }

    // Validate analysis type
    const validTypes = [...ANALYSIS_FRAMEWORKS.map(f => f.type), "custom"];
    if (!validTypes.includes(analysisType)) {
      return NextResponse.json({ error: "Invalid analysisType" }, { status: 400 });
    }

    // Fetch all context data
    const flag = await getFlagById(flagId);
    if (!flag) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    const hypotheses = await getHypotheses(flagId);

    const newsProvider = getNewsProvider();
    const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
    const articles = primaryAsset
      ? await newsProvider.getNewsBySymbol(primaryAsset.symbol, 10)
      : [];

    const socialSentiment = primaryAsset
      ? await getSocialSentiment(primaryAsset.symbol)
      : null;

    const analysisRequest: AnalysisRequest = {
      type: analysisType as AnalysisRequest["type"],
      flag,
      hypotheses,
      articles,
      socialSentiment,
      customPrompt,
    };

    const result = await runAnalysis(analysisRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/analyze] Error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
