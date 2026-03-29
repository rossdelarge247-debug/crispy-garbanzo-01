import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getValidatedIdeaById, getNewsForFlag } from "@/services/flag-engine";
import { getMarketDataProvider, getChartLabel } from "@/services/market-data";
import { getAssetDisplayName } from "@/lib/asset-names";
import LiveDetailClient from "./LiveDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

function formatPrice(price: number): string {
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

  const marketDataProvider = getMarketDataProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary") ?? flag.affectedAssets[0];
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        d => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  const topHypothesis = hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const direction = topHypothesis?.direction ?? "long";
  const entryPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 100;
  const assetSymbol = primaryAsset?.symbol ?? "UNKNOWN";
  const humanName = getAssetDisplayName(assetSymbol);

  // Pre-computed recommendation from the validated idea (if it passed quality bar)
  const rec = validatedIdea?.recommendation;
  const bt = validatedIdea?.backtestSummary;

  return (
    <div className="animate-fade-in max-w-3xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        &larr; Dashboard
      </Link>

      {/* ==================================================================
          HEADER
          ================================================================== */}
      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-tight mb-3">
          {humanName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-muted px-2 py-0.5 bg-surface-overlay rounded-full">
            {flag.category}
          </span>
          {rec && (
            <>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                rec.direction === "long"
                  ? "bg-conviction-high/15 text-conviction-high"
                  : "bg-conviction-danger/15 text-conviction-danger"
              }`}>
                {rec.direction === "long" ? "Go long" : "Go short"}
              </span>
              <span className={`text-xs font-bold tabular-nums ${
                rec.confidence >= 70 ? "text-conviction-high" :
                rec.confidence >= 55 ? "text-conviction-medium" : "text-text-muted"
              }`}>
                {rec.confidence}/100 confidence
              </span>
            </>
          )}
        </div>
      </header>

      {/* ==================================================================
          THE THESIS — what's happening and why it matters
          ================================================================== */}
      <section className="mb-8">
        <div className="bg-surface-raised rounded-xl border border-surface-border p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              What&apos;s happening
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {flag.summary}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              Why this matters
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {flag.whyItMatters}
            </p>
          </div>

          {topHypothesis && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                The trade thesis
              </h3>
              <p className="text-sm text-text-primary font-medium leading-relaxed">
                {topHypothesis.title}
              </p>
              <p className="text-sm text-text-secondary leading-relaxed mt-1">
                {topHypothesis.rationale}
              </p>
              <p className="text-xs text-text-muted mt-2">
                Stops working if: {topHypothesis.invalidation}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================
          PRE-COMPUTED TRADE PLAN (if validated)
          ================================================================== */}
      {rec && bt && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Trade plan</h2>
          <div className={`rounded-xl border-2 p-5 space-y-4 ${
            rec.action === "enter_now" ? "border-conviction-high/30 bg-conviction-high/5" :
            rec.action === "wait" ? "border-conviction-medium/30 bg-conviction-medium/5" :
            "border-surface-border bg-surface-raised"
          }`}>
            {/* Action + confidence */}
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${
                rec.action === "enter_now" ? "text-conviction-high" :
                rec.action === "wait" ? "text-conviction-medium" : "text-text-muted"
              }`}>
                {rec.action === "enter_now" ? "Enter now" :
                 rec.action === "wait" ? "Wait for better entry" : "Skip"}
              </span>
              <div className="text-right">
                <span className={`text-2xl font-bold tabular-nums ${
                  rec.confidence >= 70 ? "text-conviction-high" :
                  rec.confidence >= 55 ? "text-conviction-medium" : "text-text-muted"
                }`}>
                  {rec.confidence}
                </span>
                <span className="text-xs text-text-muted">/100</span>
              </div>
            </div>

            {/* Trade spec */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-overlay/50 rounded-lg p-3">
              <div>
                <p className="text-2xs text-text-muted">Entry</p>
                <p className="text-sm font-bold tabular-nums text-text-primary">{formatPrice(rec.entryPrice)}</p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Stop loss</p>
                <p className="text-sm font-bold tabular-nums text-conviction-danger">{formatPrice(rec.stopLoss)}</p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Target</p>
                <p className="text-sm font-bold tabular-nums text-conviction-high">{formatPrice(rec.takeProfit)}</p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Hold</p>
                <p className="text-sm font-bold tabular-nums text-text-primary">Up to {rec.holdDays}d</p>
              </div>
            </div>

            {/* Backtest evidence */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-conviction-high">{bt.winRate}%</div>
                <div className="text-2xs text-text-muted">Win rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">{bt.scenarioCount}</div>
                <div className="text-2xs text-text-muted">Tested</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">{bt.profitFactor}:1</div>
                <div className="text-2xs text-text-muted">Profit factor</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-text-primary">{bt.avgDaysHeld}d</div>
                <div className="text-2xs text-text-muted">Avg hold</div>
              </div>
            </div>

            {/* Reasons */}
            {rec.reasons.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Why</h4>
                <div className="space-y-1.5">
                  {rec.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-conviction-high text-xs font-bold mt-0.5 shrink-0">{i + 1}</span>
                      <p className="text-xs text-text-secondary leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {rec.risks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Risks</h4>
                <div className="space-y-1">
                  {rec.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-conviction-danger text-xs mt-0.5 shrink-0">&#9888;</span>
                      <p className="text-xs text-text-secondary leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <p className="text-sm text-text-primary leading-relaxed font-medium">
              {rec.summary}
            </p>
          </div>
        </section>
      )}

      {/* ==================================================================
          LIVE PRICE + CHART
          ================================================================== */}
      <LiveDetailClient
        symbol={assetSymbol}
        assetName={humanName}
        direction={direction}
        historicalEntryPrice={entryPrice}
        chartData={chartData}
        flagId={id}
      />

      {/* ==================================================================
          ALL SCENARIOS (collapsed)
          ================================================================== */}
      {hypotheses.length > 1 && (
        <section className="mb-8">
          <details className="group">
            <summary className="text-sm font-semibold text-text-primary cursor-pointer hover:text-accent transition-colors mb-3">
              All scenarios ({hypotheses.length})
            </summary>
            <div className="space-y-3 mt-3">
              {hypotheses.map(h => (
                <div key={h.id} className="border-b border-surface-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      h.direction === "long" ? "text-conviction-high" :
                      h.direction === "short" ? "text-conviction-danger" : "text-conviction-medium"
                    }`}>
                      {h.direction === "long" ? "\u2191" : h.direction === "short" ? "\u2193" : "\u2192"}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">{h.title}</span>
                    <span className="text-xs font-mono text-text-muted ml-auto">{h.confidenceScore}%</span>
                  </div>
                  <p className="text-xs text-text-secondary">{h.summary}</p>
                  <p className="text-xs text-text-muted mt-1">Stops working if: {h.invalidation}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* ==================================================================
          NEWS
          ================================================================== */}
      {articles.length > 0 && (
        <section className="mb-8">
          <details>
            <summary className="text-sm font-semibold text-text-primary cursor-pointer hover:text-accent transition-colors mb-3">
              News ({articles.length} articles)
            </summary>
            <div className="space-y-2 mt-3">
              {articles.slice(0, 8).map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-text-secondary hover:text-text-primary transition-colors">
                  <span className="font-medium text-text-primary">{a.title}</span>
                  <span className="text-text-muted ml-1">&middot; {a.source}</span>
                </a>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* ==================================================================
          BACK
          ================================================================== */}
      <div className="pb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-surface-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-overlay transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
