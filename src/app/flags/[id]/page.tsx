import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import { getMarketDataProvider, getChartLabel, isProxySymbol } from "@/services/market-data";
import { buildScorecard, type Grade } from "@/services/scorecard";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import { getAssetDisplayName } from "@/lib/asset-names";
import ConvictionBadge from "@/components/ConvictionBadge";
import ExpandableSection from "@/components/ExpandableSection";
import PriceChart from "@/components/PriceChart";
import DryRunPanel from "./DryRunPanel";
import IntelligencePanel from "./IntelligencePanel";

interface Props {
  params: Promise<{ id: string }>;
}

function gradeColor(grade: Grade) {
  switch (grade) {
    case "A": return "text-conviction-high bg-conviction-high/10";
    case "B": return "text-conviction-high bg-conviction-high/5";
    case "C": return "text-conviction-medium bg-conviction-medium/10";
    case "D": return "text-conviction-caution bg-conviction-caution/10";
    case "F": return "text-conviction-danger bg-conviction-danger/10";
  }
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const [hypotheses, tests, articles, socialSentiment] = await Promise.all([
    getHypotheses(id),
    getTestsForFlag(id),
    (async () => {
      const p = getNewsProvider();
      return flag.affectedAssets.length > 0 ? p.getNewsBySymbol(flag.affectedAssets[0].symbol) : [];
    })(),
    (async () => {
      const primary = flag.affectedAssets.find(a => a.impact === "primary");
      return primary ? getSocialSentiment(primary.symbol) : null;
    })(),
  ]);

  const marketDataProvider = getMarketDataProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary") ?? flag.affectedAssets[0];
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        (d) => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  const scorecard = buildScorecard(flag, hypotheses, tests, articles, socialSentiment);
  const testsPassed = tests.filter(t => t.result === "pass").length;

  // Top hypothesis for direction
  const topHypotheses = hypotheses
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
  const topHypothesis = topHypotheses[0];
  const direction = topHypothesis?.direction ?? "long";
  const entryPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 100;
  const assetSymbol = primaryAsset?.symbol ?? flag.affectedAssets[0]?.symbol ?? "UNKNOWN";
  const humanName = getAssetDisplayName(assetSymbol);

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* ================================================================
          A. BACK LINK + HEADER
          ================================================================ */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        &larr; Dashboard
      </Link>

      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-tight mb-3">
          {humanName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-muted px-2 py-0.5 bg-surface-overlay rounded-full">
            {flag.category}
          </span>
          <ConvictionBadge score={flag.convictionScore} size="sm" />
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              direction === "long"
                ? "bg-conviction-high/15 text-conviction-high"
                : direction === "short"
                  ? "bg-conviction-danger/15 text-conviction-danger"
                  : "bg-surface-overlay text-text-muted"
            }`}
          >
            {direction === "long" ? "Going long" : direction === "short" ? "Going short" : "Neutral"}
          </span>
        </div>
      </header>

      {/* ================================================================
          B. EXPERT SUMMARY
          ================================================================ */}
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
              Why this asset is in play
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {flag.whyItMatters}
            </p>
          </div>

          {topHypothesis && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                What usually happens in similar conditions
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {topHypothesis.summary}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              What Daddy thinks
            </h3>
            <p className="text-sm text-text-primary font-medium leading-relaxed">
              {scorecard.oneLiner}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          C. SIMULATION PANEL — THE MAIN CTA
          ================================================================ */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Test this trade</h2>
        <DryRunPanel
          asset={assetSymbol}
          assetName={humanName}
          direction={direction}
          entryPrice={entryPrice}
        />
      </section>

      {/* ================================================================
          D. CONVICTION METER — intelligence layer
          ================================================================ */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Conviction analysis</h2>
        <IntelligencePanel flagId={id} />
        <Link
          href={`/flags/${id}/test-runner`}
          className="text-xs font-medium text-accent hover:text-accent-glow transition-colors mt-3 inline-block"
        >
          See full test results &rarr;
        </Link>
      </section>

      {/* ================================================================
          E. PRICE CHART
          ================================================================ */}
      {chartData.length > 0 && primaryAsset && (
        <section className="mb-8">
          <ExpandableSection
            title={`Price chart — ${getAssetDisplayName(primaryAsset.symbol)} ${flag.timeHorizonDays}d${isProxySymbol(primaryAsset.symbol) ? ` (proxy for ${primaryAsset.symbol})` : ""}`}
            defaultOpen={false}
          >
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <PriceChart data={chartData} height={200} color="#7c5bf0" />
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* ================================================================
          F. SUPPORTING DATA (collapsed)
          ================================================================ */}
      <section className="mb-8 space-y-2">
        {articles.length > 0 && (
          <ExpandableSection title={`News (${articles.length} articles)`} defaultOpen={false}>
            <div className="space-y-2">
              {articles.slice(0, 5).map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-text-secondary hover:text-text-primary transition-colors">
                  <span className="font-medium text-text-primary">{a.title}</span>
                  <span className="text-text-muted ml-1">&middot; {a.source}</span>
                </a>
              ))}
            </div>
          </ExpandableSection>
        )}

        {topHypotheses.length > 0 && (
          <ExpandableSection title={`All scenarios (${topHypotheses.length})`} defaultOpen={false}>
            <div className="space-y-3">
              {topHypotheses.map((h) => (
                <div key={h.id} className="border-b border-surface-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      h.direction === "long" ? "text-conviction-high" : h.direction === "short" ? "text-conviction-danger" : "text-conviction-medium"
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
          </ExpandableSection>
        )}

        <ExpandableSection title="Score breakdown" defaultOpen={false}>
          <div className="space-y-1">
            {scorecard.categories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{cat.label}</span>
                <span className={`font-mono font-semibold ${gradeColor(cat.grade).split(" ")[0]}`}>{cat.grade} &middot; {cat.score}/100</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      </section>

      {/* ================================================================
          G. TRADE PLAN CTA
          ================================================================ */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-accent mb-1">Ready to trade?</h3>
        <p className="text-sm text-text-secondary mb-4">{scorecard.recommendationText}</p>
        <div className="flex gap-3">
          <Link
            href={`/flags/${id}/trade-plan`}
            className="inline-flex items-center px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:shadow-card transition-all"
          >
            {scorecard.recommendation === "strong_opportunity" ? "Set up trade" : "View trade plan"}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-surface-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface-overlay transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
