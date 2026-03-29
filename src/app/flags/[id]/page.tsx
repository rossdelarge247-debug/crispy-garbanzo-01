import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getValidatedIdeaById, getNewsForFlag } from "@/services/flag-engine";
import { getMarketDataProvider } from "@/services/market-data";
import { getAssetDisplayName } from "@/lib/asset-names";
import LiveDetailClient from "./LiveDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

function fp(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
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

  const marketDataProvider = getMarketDataProvider();
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        d => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  const topHypothesis = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const direction = topHypothesis?.direction ?? "long";
  const entryPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 100;

  const rec = validatedIdea?.recommendation;
  const bt = validatedIdea?.backtestSummary;

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link href="/dashboard" className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors mb-6 inline-block">
        &larr; Back
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-[--text-primary]">{humanName}</h1>
          {rec && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
            }`}>
              {rec.direction === "long" ? "Long" : "Short"}
            </span>
          )}
        </div>
        <p className="text-xs text-[--text-muted]">{flag.category}</p>
      </div>

      {/* Thesis */}
      <div className="mb-6 space-y-3">
        <p className="text-sm text-[--text-secondary] leading-relaxed">{flag.summary}</p>

        {topHypothesis && (
          <div className="border-l-2 border-[--accent]/30 pl-3">
            <p className="text-sm font-medium text-[--text-primary]">{topHypothesis.title}</p>
            <p className="text-xs text-[--text-secondary] mt-1 leading-relaxed">{topHypothesis.rationale}</p>
            <p className="text-xs text-[--text-muted] mt-1">Invalidation: {topHypothesis.invalidation}</p>
          </div>
        )}
      </div>

      {/* Trade plan (if validated) */}
      {rec && bt && (
        <div className="mb-6 rounded-lg bg-[--surface-raised] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold ${
              rec.action === "enter_now" ? "text-[--green]" :
              rec.action === "wait" ? "text-[--amber]" : "text-[--text-muted]"
            }`}>
              {rec.action === "enter_now" ? "Enter now" : rec.action === "wait" ? "Wait" : "Skip"}
            </span>
            <span className="text-sm font-bold tabular-nums text-[--text-primary]">
              {rec.confidence}/100
            </span>
          </div>

          {/* Trade levels — numeric or text */}
          {rec.entryPrice > 0 ? (
            <div className="flex items-center gap-4 text-xs tabular-nums">
              <span>Entry <span className="font-semibold text-[--text-primary]">{fp(rec.entryPrice)}</span></span>
              <span>Stop <span className="font-semibold text-[--red]">{fp(rec.stopLoss)}</span></span>
              <span>Target <span className="font-semibold text-[--green]">{fp(rec.takeProfit)}</span></span>
              <span>Hold <span className="font-semibold text-[--text-primary]">{rec.holdDays}d</span></span>
            </div>
          ) : rec.entryText ? (
            <div className="text-xs space-y-0.5">
              <p>Entry: <span className="text-[--text-primary] font-medium">{rec.entryText}</span></p>
              {rec.stopText && <p>Stop: <span className="text-[--red] font-medium">{rec.stopText}</span></p>}
              {rec.targetText && <p>Target: <span className="text-[--green] font-medium">{rec.targetText}</span></p>}
              {rec.holdText && <p>Hold: <span className="text-[--text-primary] font-medium">{rec.holdText}</span></p>}
            </div>
          ) : null}

          {/* Catalyst + timing */}
          {rec.catalyst && (
            <p className="text-xs text-[--text-muted]">Catalyst: <span className="text-[--text-secondary]">{rec.catalyst}</span></p>
          )}
          {rec.timing && (
            <p className="text-xs text-[--text-muted]">Timing: <span className="text-[--text-secondary]">{rec.timing}</span></p>
          )}
          {rec.whatToWatch && (
            <p className="text-xs text-[--text-muted]">Watch: <span className="text-[--text-secondary]">{rec.whatToWatch}</span></p>
          )}

          {/* Evidence — single line */}
          <div className="flex items-center gap-4 text-xs text-[--text-muted]">
            <span>{bt.winRate}% win rate</span>
            <span>{bt.scenarioCount} scenarios</span>
            <span>{bt.profitFactor}:1 PF</span>
            <span>{bt.avgDaysHeld}d avg hold</span>
          </div>

          {/* Reasons */}
          {rec.reasons.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[--border]/50">
              {rec.reasons.map((r, i) => (
                <p key={i} className="text-xs text-[--text-secondary] leading-relaxed">
                  <span className="text-[--text-muted] mr-1">{i + 1}.</span>{r}
                </p>
              ))}
            </div>
          )}

          {/* Risks */}
          {rec.risks.length > 0 && (
            <div className="space-y-1">
              {rec.risks.map((r, i) => (
                <p key={i} className="text-xs text-[--text-muted] leading-relaxed">{r}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live price + chart */}
      <LiveDetailClient
        symbol={assetSymbol}
        assetName={humanName}
        direction={direction}
        historicalEntryPrice={entryPrice}
        chartData={chartData}
        flagId={id}
      />

      {/* Scenarios */}
      {hypotheses.length > 1 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[--text-muted] mb-2">Scenarios ({hypotheses.length})</p>
          <div className="space-y-2">
            {hypotheses.map(h => (
              <div key={h.id} className="text-xs border-b border-[--border]/50 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={h.direction === "long" ? "text-[--green]" : h.direction === "short" ? "text-[--red]" : "text-[--text-muted]"}>
                    {h.direction === "long" ? "\u2191" : h.direction === "short" ? "\u2193" : "\u2192"}
                  </span>
                  <span className="font-semibold text-[--text-primary]">{h.title}</span>
                  <span className="text-[--text-muted] ml-auto tabular-nums">{h.confidenceScore}%</span>
                </div>
                <p className="text-[--text-secondary] mt-0.5 leading-relaxed">{h.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      {articles.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[--text-muted] mb-2">News ({articles.length})</p>
          <div className="space-y-1">
            {articles.slice(0, 5).map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                className="block text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors truncate">
                {a.title} <span className="text-[--text-muted]">&middot; {a.source}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
