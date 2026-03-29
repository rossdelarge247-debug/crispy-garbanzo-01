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
  const historical = primaryAsset
    ? await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)
    : [];
  const chartData = historical.map(d => ({ time: d.timestamp.split("T")[0], value: d.price }));

  const topHypothesis = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const direction = topHypothesis?.direction ?? "long";
  const entryPrice = historical.length > 0 ? historical[historical.length - 1].price : 0;
  const latestQuote = entryPrice > 0 ? entryPrice : null;

  const rec = validatedIdea?.recommendation;
  const bt = validatedIdea?.backtestSummary;

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors mb-4 inline-block">
        &larr; Back
      </Link>

      {/* ================================================================
          1. HEADER BAR — asset name + live price
          ================================================================ */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[--text-primary]">{humanName}</h1>
          {rec && (
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
              rec.direction === "long" ? "bg-[--green-bg] text-[--green]" : "bg-[--red-bg] text-[--red]"
            }`}>
              {rec.direction === "long" ? "Long" : "Short"}
            </span>
          )}
        </div>
        {latestQuote && (
          <span className="text-lg font-bold tabular-nums text-[--text-primary]">{fp(latestQuote)}</span>
        )}
      </div>

      {/* ================================================================
          2. CONFIDENCE — score + breakdown
          ================================================================ */}
      {rec && (
        <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[--text-muted]">Confidence</span>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold tabular-nums ${
                rec.confidence >= 70 ? "text-[--green]" : rec.confidence >= 50 ? "text-[--amber]" : "text-[--text-muted]"
              }`}>
                {rec.confidence}%
              </span>
              <span className="text-xs text-[--text-muted]">{rec.confidenceLabel}</span>
            </div>
          </div>
          {/* Confidence breakdown */}
          <div className="space-y-1 text-xs text-[--text-secondary]">
            {bt && bt.scenarioCount > 0 && (
              <p>{bt.winRate}% win rate across {bt.scenarioCount} historical scenarios</p>
            )}
            {bt && bt.profitFactor > 0 && (
              <p>Profit factor: {bt.profitFactor}:1 (winners {bt.profitFactor > 1 ? "outweigh" : "underperform"} losers)</p>
            )}
            {rec.reasons.length > 0 && (
              <p className="text-[--text-muted]">{rec.reasons[0]}</p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          3. RATIONALE — why this trade
          ================================================================ */}
      <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
        <p className="text-xs font-semibold text-[--text-muted] mb-2">Rationale</p>
        <p className="text-sm text-[--text-secondary] leading-relaxed mb-2">{flag.summary}</p>
        {topHypothesis && (
          <div className="pl-3 border-l-2 border-[--accent]/30">
            <p className="text-xs font-medium text-[--text-primary]">{topHypothesis.title}</p>
            <p className="text-xs text-[--text-muted] mt-0.5">Invalidation: {topHypothesis.invalidation}</p>
          </div>
        )}
      </div>

      {/* ================================================================
          4. TRADE PLAN — the specific recommendation
          ================================================================ */}
      {rec && (
        <div className={`rounded-lg p-4 mb-4 ${
          rec.action === "enter_now" ? "bg-[--green-bg]" :
          rec.action === "wait" ? "bg-[--amber-bg]" : "bg-[--surface-raised]"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-bold ${
              rec.action === "enter_now" ? "text-[--green]" :
              rec.action === "wait" ? "text-[--amber]" : "text-[--text-muted]"
            }`}>
              {rec.action === "enter_now" ? "Enter now" : rec.action === "wait" ? "Wait for better entry" : "Skip"}
            </span>
          </div>

          {/* Trade spec */}
          {rec.entryPrice > 0 ? (
            <div className="grid grid-cols-4 gap-3 text-xs mb-3">
              <div><p className="text-[--text-muted]">Entry</p><p className="font-bold tabular-nums text-[--text-primary]">{fp(rec.entryPrice)}</p></div>
              <div><p className="text-[--text-muted]">Stop</p><p className="font-bold tabular-nums text-[--red]">{fp(rec.stopLoss)}</p></div>
              <div><p className="text-[--text-muted]">Target</p><p className="font-bold tabular-nums text-[--green]">{fp(rec.takeProfit)}</p></div>
              <div><p className="text-[--text-muted]">Hold</p><p className="font-bold text-[--text-primary]">{rec.holdDays}d</p></div>
            </div>
          ) : rec.entryText ? (
            <div className="text-xs space-y-0.5 mb-3">
              <p>Entry: <span className="font-medium text-[--text-primary]">{rec.entryText}</span></p>
              {rec.stopText && <p>Stop: <span className="font-medium text-[--red]">{rec.stopText}</span></p>}
              {rec.targetText && <p>Target: <span className="font-medium text-[--green]">{rec.targetText}</span></p>}
              {rec.holdText && <p>Hold: <span className="font-medium text-[--text-primary]">{rec.holdText}</span></p>}
            </div>
          ) : null}

          {rec.catalyst && (
            <p className="text-xs text-[--text-muted] mb-1">Catalyst: <span className="text-[--text-secondary]">{rec.catalyst}</span></p>
          )}
          {rec.timing && (
            <p className="text-xs text-[--text-muted] mb-1">Timing: <span className="text-[--text-secondary]">{rec.timing}</span></p>
          )}
          {rec.whatToWatch && (
            <p className="text-xs text-[--text-muted]">Watch: <span className="text-[--text-secondary]">{rec.whatToWatch}</span></p>
          )}

          {/* CTAs */}
          <div className="flex gap-2 mt-3">
            <button disabled className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--accent] text-white opacity-60 cursor-not-allowed">
              Set up paper trade
            </button>
            <Link
              href={`/flags/${id}/trade-plan`}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-[--surface-overlay] text-[--text-secondary] text-center hover:text-[--text-primary] transition-colors"
            >
              Full trade plan
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================
          5. BACKTEST EVIDENCE
          ================================================================ */}
      {bt && bt.scenarioCount > 0 && (
        <div className="rounded-lg bg-[--surface-raised] p-4 mb-4">
          <p className="text-xs font-semibold text-[--text-muted] mb-2">Historical evidence</p>
          <div className="grid grid-cols-4 gap-3 text-xs text-center mb-2">
            <div><p className="text-lg font-bold tabular-nums text-[--green]">{bt.winRate}%</p><p className="text-[--text-muted]">Win rate</p></div>
            <div><p className="text-lg font-bold tabular-nums text-[--text-primary]">{bt.scenarioCount}</p><p className="text-[--text-muted]">Scenarios</p></div>
            <div><p className="text-lg font-bold tabular-nums text-[--text-primary]">{bt.profitFactor}:1</p><p className="text-[--text-muted]">PF</p></div>
            <div><p className="text-lg font-bold tabular-nums text-[--text-primary]">{bt.avgDaysHeld}d</p><p className="text-[--text-muted]">Avg hold</p></div>
          </div>
          <p className="text-2xs text-[--text-muted]">
            Tested against {bt.scenarioCount} similar historical conditions using real price data.
          </p>
        </div>
      )}

      {/* ================================================================
          6. REASONS + RISKS
          ================================================================ */}
      {rec && (rec.reasons.length > 0 || rec.risks.length > 0) && (
        <div className="rounded-lg bg-[--surface-raised] p-4 mb-4 space-y-2">
          {rec.reasons.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs text-[--text-secondary]"><span className="text-[--text-muted] mr-1">{i + 1}.</span>{r}</p>
          ))}
          {rec.risks.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-[--text-muted]">{r}</p>
          ))}
        </div>
      )}

      {/* ================================================================
          7. LIVE PRICE + CHART
          ================================================================ */}
      <LiveDetailClient
        symbol={assetSymbol}
        assetName={humanName}
        direction={direction}
        historicalEntryPrice={entryPrice}
        chartData={chartData}
        flagId={id}
      />

      {/* ================================================================
          8. SCENARIOS + NEWS (compact)
          ================================================================ */}
      {hypotheses.length > 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[--text-muted] mb-2">Scenarios</p>
          {hypotheses.map(h => (
            <div key={h.id} className="text-xs pb-2 mb-2 last:mb-0 last:pb-0">
              <span className={h.direction === "long" ? "text-[--green]" : h.direction === "short" ? "text-[--red]" : "text-[--text-muted]"}>
                {h.direction === "long" ? "\u2191" : h.direction === "short" ? "\u2193" : "\u2192"}
              </span>
              <span className="font-semibold text-[--text-primary] ml-1">{h.title}</span>
              <span className="text-[--text-muted] ml-2 tabular-nums">{h.confidenceScore}%</span>
              <p className="text-[--text-secondary] mt-0.5">{h.summary}</p>
            </div>
          ))}
        </div>
      )}

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
