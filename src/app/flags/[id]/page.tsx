import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getValidatedIdeaById, getNewsForFlag } from "@/services/flag-engine";
import { getMarketDataProvider } from "@/services/market-data";
import { getAssetDisplayName } from "@/lib/asset-names";
import LiveDetailClient from "./LiveDetailClient";
import ExploreClient from "./ExploreClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const [hypotheses, validatedIdea, articles] = await Promise.all([
    getHypotheses(id),
    getValidatedIdeaById(id),
    getNewsForFlag(id),
  ]);

  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary") ?? flag.affectedAssets[0];
  const assetSymbol = primaryAsset?.symbol ?? "UNKNOWN";
  const humanName = getAssetDisplayName(assetSymbol);

  const historical = primaryAsset
    ? await getMarketDataProvider().getHistorical(primaryAsset.symbol, flag.timeHorizonDays)
    : [];
  const chartData = historical.map(d => ({ time: d.timestamp.split("T")[0], value: d.price }));
  const entryPrice = historical.length > 0 ? historical[historical.length - 1].price : 0;
  const direction = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]?.direction ?? "long";

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors mb-4 inline-block">
        &larr; Back
      </Link>

      <ExploreClient
        flag={flag}
        hypotheses={hypotheses}
        idea={validatedIdea}
        articles={articles}
        assetSymbol={assetSymbol}
        humanName={humanName}
        entryPrice={entryPrice}
      />

      <LiveDetailClient
        symbol={assetSymbol}
        assetName={humanName}
        direction={direction}
        historicalEntryPrice={entryPrice}
        chartData={chartData}
        flagId={id}
      />

      {/* News */}
      {articles.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[--text-muted] mb-1.5">News ({articles.length})</p>
          {articles.slice(0, 4).map(a => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
              className="block text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors truncate mb-0.5">
              {a.title} <span className="text-[--text-muted]">&middot; {a.source}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
