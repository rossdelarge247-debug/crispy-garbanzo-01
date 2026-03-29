import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import { getMarketDataProvider, getChartLabel, isProxySymbol } from "@/services/market-data";
import { buildScorecard, type Grade } from "@/services/scorecard";
import { getNewsProvider } from "@/services/news";
import { getSocialSentiment } from "@/services/social-sentiment";
import ConvictionBadge from "@/components/ConvictionBadge";
import ExpandableSection from "@/components/ExpandableSection";
import PriceChart from "@/components/PriceChart";
import ProgressBar from "@/components/ProgressBar";
import DryRunPanel from "./DryRunPanel";

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
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        (d) => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  const scorecard = buildScorecard(flag, hypotheses, tests, articles, socialSentiment);
  const testsPassed = tests.filter(t => t.result === "pass").length;

  // Top trade ideas (sorted by confidence)
  const topHypotheses = hypotheses
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3);

  return (
    <div className="animate-fade-in max-w-3xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        ← Back
      </Link>

      {/* ================================================================
          1. SITUATION — What's happening (minimal)
          ================================================================ */}
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-text-muted">{flag.category}</span>
          <ConvictionBadge score={flag.convictionScore} size="sm" />
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${gradeColor(scorecard.overallGrade)}`}>
            <span className="text-sm font-bold">{scorecard.overallGrade}</span>
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-tight mb-2">
          {flag.title}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          {flag.summary}
        </p>
      </header>

      {/* ================================================================
          2. TRADE IDEAS — The explicit actions
          ================================================================ */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Trade ideas</h2>
        <div className="space-y-2">
          {topHypotheses.map((h) => {
            const dirIcon = h.direction === "long" ? "↑" : h.direction === "short" ? "↓" : "→";
            const dirColor = h.direction === "long" ? "text-conviction-high" : h.direction === "short" ? "text-conviction-danger" : "text-conviction-medium";
            const confColor = h.confidenceScore >= 65 ? "bg-conviction-high" : h.confidenceScore >= 45 ? "bg-conviction-medium" : "bg-conviction-low";

            return (
              <div key={h.id} className="bg-surface-raised rounded-xl border border-surface-border p-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className={`text-lg font-bold ${dirColor} shrink-0`}>{dirIcon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary">{h.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">{h.summary}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-text-primary shrink-0">{h.confidenceScore}%</span>
                </div>
                <ProgressBar value={h.confidenceScore} color={confColor} size="sm" />
                <ExpandableSection title="Why this could work" defaultOpen={false}>
                  <p className="text-xs text-text-secondary mb-1">{h.rationale}</p>
                  <p className="text-xs text-text-muted">Stops working if: {h.invalidation}</p>
                </ExpandableSection>
              </div>
            );
          })}
        </div>
        {hypotheses.length > 3 && (
          <Link href={`/flags/${id}/hypothesis`} className="text-xs font-medium text-accent hover:text-accent-glow transition-colors mt-2 inline-block">
            See all {hypotheses.length} scenarios →
          </Link>
        )}
      </section>

      {/* ================================================================
          3. CONFIDENCE — Quick validation summary
          ================================================================ */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Confidence check</h2>
        <div className="bg-surface-raised rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-text-primary">{testsPassed}/{tests.length}</div>
              <div className="text-xs text-text-muted">checks passed</div>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-1">
              {scorecard.categories.map((cat) => (
                <div key={cat.label} className="text-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-0.5 ${gradeColor(cat.grade)}`}>
                    <span className="text-xs font-bold">{cat.grade}</span>
                  </div>
                  <span className="text-xs text-text-muted leading-none block" style={{ fontSize: "10px" }}>{cat.label.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-text-secondary">{scorecard.oneLiner}</p>
          <Link
            href={`/flags/${id}/test-runner`}
            className="text-xs font-medium text-accent hover:text-accent-glow transition-colors mt-2 inline-block"
          >
            See full confidence report →
          </Link>
        </div>
      </section>

      {/* ================================================================
          4. DRY RUN — Simulate the trade
          ================================================================ */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Dry run simulator</h2>
        <DryRunPanel
          asset={primaryAsset?.symbol || flag.affectedAssets[0]?.symbol || "UNKNOWN"}
          assetName={primaryAsset?.name || flag.affectedAssets[0]?.name || "Unknown"}
          direction={topHypotheses[0]?.direction || "long"}
          entryPrice={chartData.length > 0 ? chartData[chartData.length - 1].value : 100}
        />
      </section>

      {/* ================================================================
          5. PRICE CHART — Context (collapsed by default for non-advanced)
          ================================================================ */}
      {chartData.length > 0 && primaryAsset && (
        <section className="mb-8">
          <ExpandableSection title={`Price chart — ${getChartLabel(primaryAsset.symbol)} ${flag.timeHorizonDays}d${isProxySymbol(primaryAsset.symbol) ? ` (proxy for ${primaryAsset.symbol})` : ""}`} defaultOpen={false}>
            <div className="rounded-xl border border-surface-border overflow-hidden">
              <PriceChart data={chartData} height={200} color="#7c5bf0" />
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* ================================================================
          6. WHY — Supporting detail (collapsed)
          ================================================================ */}
      <section className="mb-8 space-y-2">
        <ExpandableSection title="Why Daddy flagged this" defaultOpen={false}>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>{flag.whyItMatters}</p>
            {flag.whatChanged && <p>{flag.whatChanged}</p>}
            <div className="flex flex-wrap gap-1 mt-2">
              {flag.drivers.map((d, i) => (
                <span key={i} className="text-xs bg-surface-overlay rounded-md px-2 py-0.5 text-text-muted">{d}</span>
              ))}
            </div>
          </div>
        </ExpandableSection>

        {articles.length > 0 && (
          <ExpandableSection title={`News (${articles.length} articles)`} defaultOpen={false}>
            <div className="space-y-2">
              {articles.slice(0, 5).map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-text-secondary hover:text-text-primary transition-colors">
                  <span className="font-medium text-text-primary">{a.title}</span>
                  <span className="text-text-muted ml-1">· {a.source}</span>
                </a>
              ))}
            </div>
          </ExpandableSection>
        )}

        <ExpandableSection title="How we scored this" defaultOpen={false}>
          <div className="space-y-1">
            {scorecard.categories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{cat.label}</span>
                <span className={`font-mono font-semibold ${gradeColor(cat.grade).split(" ")[0]}`}>{cat.grade} · {cat.score}/100</span>
              </div>
            ))}
          </div>
        </ExpandableSection>
      </section>

      {/* ================================================================
          7. ACTION — What to do
          ================================================================ */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-accent mb-1">Daddy&apos;s recommendation</h3>
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
            Back to briefing
          </Link>
        </div>
      </div>
    </div>
  );
}
