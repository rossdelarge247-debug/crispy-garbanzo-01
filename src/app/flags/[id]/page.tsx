import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getCalendarProvider } from "@/services/calendar";
import { getMarketDataProvider, getChartLabel, isProxySymbol } from "@/services/market-data";
import { getSocialSentiment } from "@/services/social-sentiment";
import ConvictionBadge from "@/components/ConvictionBadge";
import StatusBadge from "@/components/StatusBadge";
import AssetPill from "@/components/AssetPill";
import ExpandableSection from "@/components/ExpandableSection";
import SectionHeader from "@/components/SectionHeader";
import PriceChart from "@/components/PriceChart";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

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

  const marketDataProvider = getMarketDataProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        (d) => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  // Test stats for the CTA
  const testsPassed = tests.filter(t => t.result === "pass").length;

  // Sentiment
  const sentimentPercent = ((flag.sentimentScore + 100) / 200) * 100;
  const sentimentLabel =
    flag.sentimentScore > 50 ? "Strongly bullish" :
    flag.sentimentScore > 20 ? "Bullish" :
    flag.sentimentScore > -20 ? "Neutral" :
    flag.sentimentScore > -50 ? "Bearish" : "Strongly bearish";

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-black transition-colors mb-6"
      >
        ← Dashboard
      </Link>

      {/* ================================================================
          SECTION 1: AGGREGATE EVENT / SITUATION
          The flag itself — what's happening, at a glance
          ================================================================ */}
      <header className="mb-6 pb-4 border-b-3 border-black">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            {flag.category}
          </span>
          <StatusBadge status={flag.status} />
          <ConvictionBadge score={flag.convictionScore} size="md" />
          <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
            {flag.timeHorizon} · {flag.timeHorizonDays}d
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-tight mb-3">
          {flag.title}
        </h1>
        {/* Affected assets inline */}
        <div className="flex flex-wrap gap-1.5">
          {flag.affectedAssets.map((asset) => (
            <AssetPill key={asset.symbol} symbol={asset.symbol} direction={asset.direction} impact={asset.impact} />
          ))}
        </div>
      </header>

      {/* ================================================================
          SECTION 2: AI NARRATIVE PANEL
          Synthesized briefing — the "so what" in plain English
          ================================================================ */}
      <section className="mb-8">
        <div className="border-3 border-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-black text-white">
              Briefing
            </span>
          </div>
          <p className="text-base sm:text-lg text-black leading-relaxed mb-4 font-medium">
            {flag.summary}
          </p>
          <div className="border-t-2 border-black/10 pt-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">
              Why this matters
            </h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              {flag.whyItMatters}
            </p>
          </div>
          {flag.whatChanged && (
            <div className="border-t-2 border-black/10 pt-4 mt-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">
                What changed
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                {flag.whatChanged}
              </p>
            </div>
          )}
          {/* Key drivers inline */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {flag.drivers.map((driver, i) => (
              <span key={i} className="text-xs font-bold text-text-muted border border-black/15 px-2 py-0.5">
                {driver}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 3: STRONG CTA — DRILL INTO ANALYSIS
          The primary action the user should take
          ================================================================ */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-2 border-black">
          <Link
            href={`/flags/${id}/hypothesis`}
            className="p-5 hover:bg-surface-raised transition-colors group border-b sm:border-b-0 sm:border-r-2 border-black"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-conviction-high text-white">
                Explore
              </span>
              <span className="text-xl font-black text-black group-hover:text-accent-glow group-hover:translate-x-1 transition-all">→</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-black mb-1">
              {hypotheses.length} Hypotheses
            </h3>
            <p className="text-xs text-text-secondary">
              AI-generated scenarios for what could happen next. Ranked by confidence.
            </p>
          </Link>
          <Link
            href={`/flags/${id}/test-runner`}
            className="p-5 hover:bg-surface-raised transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-widest text-white ${
                tests.length > 0 ? "bg-conviction-medium" : "bg-conviction-low"
              }`}>
                {tests.length > 0 ? "Results" : "Test"}
              </span>
              <span className="text-xl font-black text-black group-hover:text-accent-glow group-hover:translate-x-1 transition-all">→</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-black mb-1">
              {tests.length > 0
                ? `${testsPassed}/${tests.length} Tests Passed`
                : "Run Experiments"}
            </h3>
            <p className="text-xs text-text-secondary">
              {tests.length > 0
                ? "Automated experiments using live sentiment, news volume, and market mood."
                : "Validate hypotheses with automated experiments before acting."}
            </p>
          </Link>
        </div>
      </section>

      {/* ================================================================
          SECTION 4: HISTORICAL IMPACT / PRICE / TIMELINE
          What's already happened — evidence and context
          ================================================================ */}

      {/* Price chart */}
      {chartData.length > 0 && primaryAsset && (
        <section className="mb-8">
          <SectionHeader title="Price Action" />
          <p className="text-sm text-text-secondary mb-3">{flag.priceContext}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wide text-black">
              {getChartLabel(primaryAsset.symbol)}
            </span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{flag.timeHorizonDays}d</span>
            {isProxySymbol(primaryAsset.symbol) && (
              <span className="text-xs text-text-muted">(proxy for {primaryAsset.symbol})</span>
            )}
          </div>
          <div className="border-2 border-black overflow-hidden">
            <PriceChart data={chartData} height={220} color={flag.convictionScore >= 70 ? "#00a63e" : "#000"} />
          </div>
        </section>
      )}

      {/* Timeline */}
      {flag.timeline.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Event Timeline" />
          <div className="space-y-0">
            {flag.timeline.map((event, i) => (
              <div key={i} className="flex gap-3 border-b border-black/10 py-3">
                <div className="shrink-0 mt-1">
                  <div className={`w-2.5 h-2.5 ${
                    event.impact === "positive" ? "bg-conviction-high" :
                    event.impact === "negative" ? "bg-conviction-danger" : "bg-conviction-low"
                  }`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {event.source && <span className="text-xs text-text-muted">· {event.source}</span>}
                  </div>
                  <h4 className="text-sm font-bold text-black">{event.title}</h4>
                  <p className="text-xs text-text-secondary">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          SECTION 5: SENTIMENT & NEAR-TERM SIGNALS
          Where things are heading — sentiment, social, news, calendar
          ================================================================ */}

      {/* Combined Sentiment */}
      <section className="mb-8">
        <SectionHeader title="Sentiment & Signals" />
        <div className="border-2 border-black p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black text-black uppercase">{sentimentLabel}</span>
            <span className="text-xs font-bold text-text-muted">News score: {flag.sentimentScore}</span>
          </div>
          <div className="relative h-2 bg-surface-overlay overflow-hidden mb-3">
            <div
              className="absolute top-0 left-0 h-full transition-all duration-500"
              style={{
                width: `${sentimentPercent}%`,
                backgroundColor: flag.sentimentScore > 20 ? "#00a63e" : flag.sentimentScore > -20 ? "#ff8800" : "#ff0033",
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-px bg-black/20" />
          </div>
          <div className="flex justify-between text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <p className="text-sm text-text-secondary">{flag.sentimentSummary}</p>
        </div>

        {/* Social sentiment inline */}
        {socialSentiment && socialSentiment.signals.filter(s => s.volume > 0 && s.source !== "composite").length > 0 && (
          <div className="border-2 border-black p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-black text-white">Social</span>
                <span className="text-sm font-black text-black uppercase">{socialSentiment.compositeLabel}</span>
              </div>
              <span className="text-xs font-bold text-text-muted">Agreement: {socialSentiment.agreement}%</span>
            </div>
            <div className="space-y-2">
              {socialSentiment.signals
                .filter(s => s.volume > 0 && s.source !== "composite")
                .map((signal) => (
                  <div key={signal.source} className="flex items-center gap-3 border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-text-muted w-24 shrink-0">
                      {signal.source === "reddit" ? "Reddit" : signal.source === "stocktwits" ? "StockTwits" : "Fear/Greed"}
                    </span>
                    <div className="flex-1 h-1.5 bg-surface-overlay overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.abs(signal.score) / 2 + 50}%`,
                          marginLeft: signal.score < 0 ? `${50 - Math.abs(signal.score) / 2}%` : "50%",
                          backgroundColor: signal.score > 15 ? "#00a63e" : signal.score < -15 ? "#ff0033" : "#ff8800",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-black w-16 text-right shrink-0">{signal.label.split("(")[0].trim()}</span>
                    <span className="text-xs text-text-muted shrink-0">{signal.volume}</span>
                  </div>
                ))}
            </div>
            {/* Sample posts */}
            <ExpandableSection title="Sample posts" defaultOpen={false}>
              <div className="space-y-1.5">
                {socialSentiment.signals
                  .filter(s => s.samplePosts.length > 0 && s.source !== "composite")
                  .flatMap(s => s.samplePosts.map((post, i) => (
                    <p key={`${s.source}-${i}`} className="text-xs text-text-secondary">
                      <span className="font-bold text-text-muted">[{s.source}]</span> {post}
                    </p>
                  )))
                  .slice(0, 6)}
              </div>
            </ExpandableSection>
          </div>
        )}
      </section>

      {/* News articles — accordion */}
      {articles.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title={`Related News — ${articles.length} articles`} defaultOpen={false}>
            <div className="space-y-0">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 border-b border-black/10 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span className="shrink-0 text-xs font-bold text-text-muted uppercase tracking-wide w-14 mt-0.5">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-black leading-tight mb-0.5">{article.title}</h4>
                    {article.summary && (
                      <p className="text-xs text-text-secondary line-clamp-1">{article.summary}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-text-muted uppercase tracking-wide">
                    {article.source}
                  </span>
                </a>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* Economic calendar — accordion */}
      {economicEvents.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title={`Economic Calendar — ${economicEvents.length} events`} defaultOpen={false}>
            <div className="space-y-0">
              {economicEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 border-b border-black/10 py-2">
                  <span className="shrink-0 text-xs font-bold text-text-muted uppercase tracking-wide w-14">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="shrink-0 text-sm">
                    {event.country === "US" ? "🇺🇸" : event.country === "EU" ? "🇪🇺" : "🌍"}
                  </span>
                  <span className="text-sm font-bold text-black flex-1 min-w-0 truncate">{event.title}</span>
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-black uppercase tracking-wide ${
                    event.impact === "high" ? "bg-conviction-danger text-white" :
                    event.impact === "medium" ? "bg-conviction-medium text-white" : "bg-conviction-low text-white"
                  }`}>{event.impact}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* Supporting evidence — accordion */}
      {flag.supportingEvidence.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title="Supporting evidence" defaultOpen={false}>
            <ul className="space-y-1">
              {flag.supportingEvidence.map((evidence, i) => (
                <li key={i} className="text-xs text-text-secondary">→ {evidence}</li>
              ))}
            </ul>
          </ExpandableSection>
        </section>
      )}

      {/* ================================================================
          BOTTOM CTA
          ================================================================ */}
      <div className="border-3 border-black bg-black text-white p-5">
        <h3 className="text-sm font-black uppercase tracking-widest mb-1">What to do next</h3>
        <p className="text-sm text-white/70 mb-4">{flag.suggestedAction}</p>
        <div className="flex gap-3">
          <Link
            href={`/flags/${id}/hypothesis`}
            className="inline-flex items-center px-4 py-2 bg-white text-black text-sm font-black uppercase tracking-wide hover:bg-accent-glow hover:text-white transition-colors"
          >
            Explore Hypotheses
          </Link>
          <Link
            href={`/flags/${id}/trade-plan`}
            className="inline-flex items-center px-4 py-2 border-2 border-white text-white text-sm font-bold uppercase tracking-wide hover:bg-white hover:text-black transition-colors"
          >
            Trade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
