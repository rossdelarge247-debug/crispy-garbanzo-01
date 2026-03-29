import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getCalendarProvider } from "@/services/calendar";
import { getMarketDataProvider, getChartLabel, isProxySymbol } from "@/services/market-data";
import { getSocialSentiment } from "@/services/social-sentiment";
import { buildScorecard, type Scorecard, type Grade, type CategorizedHypothesis } from "@/services/scorecard";
import StatusBadge from "@/components/StatusBadge";
import AssetPill from "@/components/AssetPill";
import ExpandableSection from "@/components/ExpandableSection";
import SectionHeader from "@/components/SectionHeader";
import PriceChart from "@/components/PriceChart";
import ProgressBar from "@/components/ProgressBar";
import DeepAnalysisPanel from "@/components/DeepAnalysisPanel";

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

function recommendationColor(rec: Scorecard["recommendation"]) {
  switch (rec) {
    case "strong_opportunity": return "bg-conviction-high text-white";
    case "worth_watching": return "bg-conviction-medium text-white";
    case "wait": return "bg-conviction-low text-white";
    case "avoid": return "bg-conviction-danger text-white";
  }
}

function recommendationLabel(rec: Scorecard["recommendation"]) {
  switch (rec) {
    case "strong_opportunity": return "Strong Opportunity";
    case "worth_watching": return "Worth Watching";
    case "wait": return "Wait & Monitor";
    case "avoid": return "Not Actionable";
  }
}

function HypothesisRow({ h }: { h: CategorizedHypothesis }) {
  const dirIcon = h.direction === "long" ? "↑" : h.direction === "short" ? "↓" : "→";
  const dirColor = h.direction === "long" ? "text-conviction-high" : h.direction === "short" ? "text-conviction-danger" : "text-conviction-low";
  const confColor = h.confidenceScore >= 70 ? "bg-conviction-high" : h.confidenceScore >= 50 ? "bg-conviction-medium" : "bg-conviction-low";

  return (
    <div className="bg-surface-raised rounded-xl border border-surface-border shadow-soft p-4">
      <div className="flex items-start gap-3 mb-2">
        <span className={`text-lg font-bold ${dirColor} shrink-0`}>{dirIcon}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-text-primary leading-tight">{h.title}</h4>
          <p className="text-xs text-text-muted mt-0.5">{h.summary}</p>
        </div>
        <span className="text-xs font-bold text-text-primary shrink-0">{h.confidenceScore}%</span>
      </div>
      <ProgressBar value={h.confidenceScore} color={confColor} size="sm" />
      <p className="text-xs text-text-secondary mt-2">→ {h.actionability}</p>
      <ExpandableSection title="Invalidation" defaultOpen={false}>
        <p className="text-xs text-text-muted">{h.invalidation}</p>
      </ExpandableSection>
    </div>
  );
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  // Fetch everything in parallel
  const [hypotheses, tests, articles, economicEvents, socialSentiment] = await Promise.all([
    getHypotheses(id),
    getTestsForFlag(id),
    (async () => {
      const newsProvider = getNewsProvider();
      return flag.affectedAssets.length > 0
        ? newsProvider.getNewsBySymbol(flag.affectedAssets[0].symbol)
        : [];
    })(),
    getCalendarProvider().getUpcomingEvents(14),
    (async () => {
      const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
      return primaryAsset ? getSocialSentiment(primaryAsset.symbol) : null;
    })(),
  ]);

  // Chart data
  const marketDataProvider = getMarketDataProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        (d) => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  // Build the scorecard
  const scorecard = buildScorecard(flag, hypotheses, tests, articles, socialSentiment);

  const hasOpportunities = scorecard.dayTrades.length + scorecard.swingTrades.length + scorecard.positionTrades.length > 0;

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-bold text-text-muted hover:text-text-primary transition-colors duration-300 mb-6"
      >
        ← Dashboard
      </Link>

      {/* ================================================================
          HERO — Situation + Grade at a glance
          ================================================================ */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold text-text-muted">{flag.category}</span>
          <StatusBadge status={flag.status} />
          <span className="text-xs font-bold text-text-muted">{flag.timeHorizon} · {flag.timeHorizonDays}d</span>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight leading-tight mb-2">
              {flag.title}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {flag.affectedAssets.map((asset) => (
                <AssetPill key={asset.symbol} symbol={asset.symbol} direction={asset.direction} impact={asset.impact} />
              ))}
            </div>
          </div>
          {/* Big grade circle */}
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${gradeColor(scorecard.overallGrade)}`}>
            <span className="text-2xl font-bold">{scorecard.overallGrade}</span>
          </div>
        </div>
      </header>

      {/* ================================================================
          SCORECARD — The whole story at a glance
          ================================================================ */}
      <section className="mb-8">
        {/* Recommendation banner */}
        <div className={`rounded-t-xl px-5 py-3 ${recommendationColor(scorecard.recommendation)}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{recommendationLabel(scorecard.recommendation)}</span>
            <span className="text-xs font-semibold text-white opacity-75">{scorecard.overallScore}/100</span>
          </div>
        </div>

        <div className="bg-surface-raised rounded-b-xl border border-t-0 border-surface-border shadow-soft p-5">
          {/* One-liner */}
          <p className="text-base font-bold text-text-primary mb-4">{scorecard.oneLiner}</p>
          <p className="text-sm text-text-secondary mb-5">{scorecard.recommendationText}</p>

          {/* Category grades */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {scorecard.categories.map((cat) => (
              <div key={cat.label} className="text-center p-3 rounded-xl bg-surface-DEFAULT">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-1.5 ${gradeColor(cat.grade)}`}>
                  <span className="text-lg font-bold">{cat.grade}</span>
                </div>
                <div className="text-xs font-bold text-text-primary">{cat.label}</div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{cat.summary}</p>
              </div>
            ))}
          </div>

          {/* Data sources */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-border">
            <span className="text-xs text-text-muted">Sources:</span>
            {scorecard.dataSourcesUsed.map((src) => (
              <span key={src} className="text-xs font-semibold text-text-muted bg-surface-overlay rounded-lg px-2 py-0.5">{src}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          NARRATIVE — What you need to know
          ================================================================ */}
      <section className="mb-8">
        <SectionHeader title="What you need to know" />
        <div className="bg-surface-raised rounded-xl border border-surface-border shadow-soft p-5">
          <p className="text-sm text-text-primary leading-relaxed mb-3">{flag.summary}</p>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">{flag.whyItMatters}</p>
          {flag.whatChanged && (
            <ExpandableSection title="What changed recently" defaultOpen={false}>
              <p className="text-sm text-text-secondary">{flag.whatChanged}</p>
            </ExpandableSection>
          )}
        </div>
      </section>

      {/* ================================================================
          OPPORTUNITIES — Categorized by time horizon
          ================================================================ */}
      {hasOpportunities && (
        <section className="mb-8">
          <SectionHeader title="Opportunities by time horizon" />

          {scorecard.dayTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-conviction-danger bg-conviction-danger/10 rounded-lg px-2.5 py-0.5">
                  Day trades
                </span>
                <span className="text-xs text-text-muted">Hours to 1 day</span>
              </div>
              <div className="space-y-2">
                {scorecard.dayTrades.map(h => <HypothesisRow key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {scorecard.swingTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold bg-conviction-medium/10 text-conviction-medium rounded-lg px-2.5 py-0.5">
                  Swing trades
                </span>
                <span className="text-xs text-text-muted">2-7 days</span>
              </div>
              <div className="space-y-2">
                {scorecard.swingTrades.map(h => <HypothesisRow key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {scorecard.positionTrades.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold bg-conviction-high/10 text-conviction-high rounded-lg px-2.5 py-0.5">
                  Position trades
                </span>
                <span className="text-xs text-text-muted">1-4 weeks</span>
              </div>
              <div className="space-y-2">
                {scorecard.positionTrades.map(h => <HypothesisRow key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {/* CTA to test runner */}
          <Link
            href={`/flags/${id}/test-runner`}
            className="flex items-center justify-between bg-surface-raised rounded-xl border border-surface-border shadow-soft p-4 hover:shadow-card transition-all duration-300 group"
          >
            <div>
              <span className="text-sm font-bold text-text-primary">Validate with experiments</span>
              <p className="text-xs text-text-muted">
                {tests.length > 0
                  ? `${tests.filter(t => t.result === "pass").length}/${tests.length} tests passed`
                  : "Run automated experiments to test these hypotheses"}
              </p>
            </div>
            <span className="text-lg text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300">→</span>
          </Link>
        </section>
      )}

      {/* ================================================================
          CATEGORY DETAILS — Expandable deep dive into each score
          ================================================================ */}
      <section className="mb-8">
        <SectionHeader title="Score breakdown" subtitle="Tap any category for details" />
        <div className="space-y-2">
          {scorecard.categories.map((cat) => (
            <ExpandableSection key={cat.label} title={`${cat.grade} — ${cat.label}: ${cat.summary}`} defaultOpen={false}>
              <p className="text-sm text-text-secondary">{cat.details}</p>
            </ExpandableSection>
          ))}
        </div>
      </section>

      {/* ================================================================
          PRICE CHART
          ================================================================ */}
      {chartData.length > 0 && primaryAsset && (
        <section className="mb-8">
          <SectionHeader title="Price action" />
          <div className="bg-surface-raised rounded-xl border border-surface-border shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3">
              <span className="text-xs font-bold text-text-primary">{getChartLabel(primaryAsset.symbol)}</span>
              <span className="text-xs text-text-muted">{flag.timeHorizonDays}d</span>
              {isProxySymbol(primaryAsset.symbol) && (
                <span className="text-xs text-text-muted">(proxy for {primaryAsset.symbol})</span>
              )}
            </div>
            <PriceChart data={chartData} height={200} color={scorecard.overallScore >= 65 ? "#34c759" : "#7c5bf0"} />
          </div>
        </section>
      )}

      {/* ================================================================
          DEEP ANALYSIS — AI-powered drill-down
          ================================================================ */}
      <section className="mb-8">
        <SectionHeader title="Deep analysis" subtitle="Run AI-powered frameworks for deeper insight" />
        <DeepAnalysisPanel flagId={id} />
      </section>

      {/* ================================================================
          SUPPORTING DATA — Collapsed
          ================================================================ */}
      {articles.length > 0 && (
        <section className="mb-4">
          <ExpandableSection title={`News articles (${articles.length})`} defaultOpen={false}>
            <div className="space-y-0">
              {articles.map((article) => (
                <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 border-b border-surface-border py-3 hover:bg-surface-overlay rounded-lg transition-colors"
                >
                  <span className="shrink-0 text-xs font-bold text-text-muted w-14 mt-0.5">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text-primary leading-tight">{article.title}</h4>
                    {article.summary && <p className="text-xs text-text-muted line-clamp-1">{article.summary}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-text-muted">{article.source}</span>
                </a>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {economicEvents.length > 0 && (
        <section className="mb-4">
          <ExpandableSection title={`Economic calendar (${economicEvents.length})`} defaultOpen={false}>
            <div className="space-y-0">
              {economicEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 border-b border-surface-border py-2">
                  <span className="shrink-0 text-xs font-bold text-text-muted w-14">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-sm font-bold text-text-primary flex-1 min-w-0 truncate">{event.title}</span>
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded-lg ${
                    event.impact === "high" ? "bg-conviction-danger/10 text-conviction-danger" :
                    event.impact === "medium" ? "bg-conviction-medium/10 text-conviction-medium" :
                    "bg-conviction-low/10 text-conviction-low"
                  }`}>{event.impact}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {flag.supportingEvidence.length > 0 && (
        <section className="mb-4">
          <ExpandableSection title="Supporting evidence" defaultOpen={false}>
            <ul className="space-y-1">
              {flag.supportingEvidence.map((e, i) => <li key={i} className="text-xs text-text-muted">→ {e}</li>)}
            </ul>
          </ExpandableSection>
        </section>
      )}

      {/* ================================================================
          BOTTOM CTA
          ================================================================ */}
      <div className="bg-accent rounded-xl p-5 mt-8">
        <h3 className="text-sm font-semibold text-white mb-1">Next step</h3>
        <p className="text-sm text-white/70 mb-4">{flag.suggestedAction}</p>
        <div className="flex gap-3">
          <Link
            href={`/flags/${id}/hypothesis`}
            className="inline-flex items-center px-5 py-2.5 bg-white text-text-primary text-sm font-semibold rounded-lg hover:shadow-card transition-all duration-300"
          >
            All hypotheses
          </Link>
          <Link
            href={`/flags/${id}/trade-plan`}
            className="inline-flex items-center px-5 py-2.5 border border-white/30 text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-all duration-300"
          >
            Trade plan
          </Link>
        </div>
      </div>
    </div>
  );
}
