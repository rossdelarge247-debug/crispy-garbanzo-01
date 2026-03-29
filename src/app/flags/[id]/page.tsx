import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getCalendarProvider } from "@/services/calendar";
import { getMarketDataProvider } from "@/services/market-data";
import { getSocialSentiment } from "@/services/social-sentiment";
import ConvictionBadge from "@/components/ConvictionBadge";
import StatusBadge from "@/components/StatusBadge";
import AssetPill from "@/components/AssetPill";
import ExpandableSection from "@/components/ExpandableSection";
import SectionHeader from "@/components/SectionHeader";
import PriceChart from "@/components/PriceChart";
import NewsImageGrid from "@/components/NewsImageGrid";
import { getNewsImageTiles } from "@/data/mock-news-images";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const hypotheses = await getHypotheses(id);

  const newsProvider = getNewsProvider();
  const articles = flag.affectedAssets.length > 0
    ? await newsProvider.getNewsBySymbol(flag.affectedAssets[0].symbol)
    : [];

  const calendarProvider = getCalendarProvider();
  const economicEvents = await calendarProvider.getUpcomingEvents(14);

  const marketDataProvider = getMarketDataProvider();
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary");
  const chartData = primaryAsset
    ? (await marketDataProvider.getHistorical(primaryAsset.symbol, flag.timeHorizonDays)).map(
        (d) => ({ time: d.timestamp.split("T")[0], value: d.price })
      )
    : [];

  const newsTiles = getNewsImageTiles(articles);

  // Fetch social sentiment for primary asset (primaryAsset already defined above)
  const socialSentiment = primaryAsset
    ? await getSocialSentiment(primaryAsset.symbol)
    : null;

  const sentimentPercent = ((flag.sentimentScore + 100) / 200) * 100;
  const sentimentLabel =
    flag.sentimentScore > 50
      ? "Strongly bullish"
      : flag.sentimentScore > 20
        ? "Bullish"
        : flag.sentimentScore > -20
          ? "Neutral"
          : flag.sentimentScore > -50
            ? "Bearish"
            : "Strongly bearish";

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-black transition-colors mb-6"
      >
        ← Dashboard
      </Link>

      {/* Hero */}
      <header className="mb-8 pb-4 border-b-3 border-black">
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
        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-tight">
          {flag.title}
        </h1>
      </header>

      {/* What's happening */}
      <section className="mb-8">
        <SectionHeader title="What&apos;s happening" />
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {flag.summary}
        </p>
        <div className="border-2 border-black p-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">
            Why it matters
          </h4>
          <p className="text-sm text-black leading-relaxed">
            {flag.whyItMatters}
          </p>
        </div>
      </section>

      {/* What changed */}
      <section className="mb-8">
        <SectionHeader title="What changed recently" />
        <p className="text-sm text-text-secondary leading-relaxed">
          {flag.whatChanged}
        </p>
      </section>

      {/* Affected assets */}
      <section className="mb-8">
        <SectionHeader title="Affected assets" />
        <div className="flex flex-wrap gap-2">
          {flag.affectedAssets.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-2 border-2 border-black px-3 py-2">
              <AssetPill symbol={asset.symbol} direction={asset.direction} impact={asset.impact} />
              <span className="text-xs font-bold text-text-muted uppercase">{asset.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Key drivers */}
      <section className="mb-8">
        <SectionHeader title="Key drivers" />
        <ul className="space-y-1">
          {flag.drivers.map((driver, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-black font-black mt-0.5 shrink-0">→</span>
              {driver}
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      <section className="mb-8">
        <SectionHeader title="Timeline" />
        <div className="space-y-0">
          {flag.timeline.map((event, i) => (
            <div key={i} className="flex gap-3 border-b border-black/10 py-3">
              <div className="shrink-0 mt-1">
                <div
                  className={`w-2.5 h-2.5 ${
                    event.impact === "positive"
                      ? "bg-conviction-high"
                      : event.impact === "negative"
                        ? "bg-conviction-danger"
                        : "bg-conviction-low"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {event.source && (
                    <span className="text-xs text-text-muted">· {event.source}</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-black">{event.title}</h4>
                <p className="text-xs text-text-secondary">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sentiment */}
      <section className="mb-8">
        <SectionHeader title="Sentiment" />
        <div className="border-2 border-black p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black text-black uppercase">{sentimentLabel}</span>
            <span className="text-xs font-bold text-text-muted">{flag.sentimentScore}</span>
          </div>
          <div className="relative h-2 bg-surface-overlay overflow-hidden mb-3">
            <div
              className="absolute top-0 left-0 h-full transition-all duration-500"
              style={{
                width: `${sentimentPercent}%`,
                backgroundColor:
                  flag.sentimentScore > 20 ? "#00a63e" : flag.sentimentScore > -20 ? "#ff8800" : "#ff0033",
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-px bg-black/20" />
          </div>
          <div className="flex justify-between text-xs font-bold text-text-muted uppercase tracking-wide">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <p className="text-sm text-text-secondary mt-3">{flag.sentimentSummary}</p>
        </div>
      </section>

      {/* Social Sentiment */}
      {socialSentiment && socialSentiment.signals.filter(s => s.volume > 0 && s.source !== "composite").length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Social Sentiment" subtitle="Aggregated from Reddit, StockTwits, and Fear & Greed Index" />
          <div className="border-2 border-black p-4">
            {/* Composite score */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-black uppercase">
                {socialSentiment.compositeLabel}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-muted">
                  Agreement: {socialSentiment.agreement}%
                </span>
                <span className="text-xs font-bold text-text-muted">
                  Score: {socialSentiment.compositeScore}
                </span>
              </div>
            </div>

            {/* Source breakdown */}
            <div className="space-y-2">
              {socialSentiment.signals
                .filter(s => s.volume > 0 && s.source !== "composite")
                .map((signal) => (
                  <div key={signal.source} className="flex items-center gap-3 border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-text-muted w-24 shrink-0">
                      {signal.source === "reddit" ? "Reddit" : signal.source === "stocktwits" ? "StockTwits" : "Fear/Greed"}
                    </span>
                    {/* Mini bar */}
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
                    <span className="text-xs text-text-muted shrink-0">{signal.volume} posts</span>
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
        </section>
      )}

      {/* Price chart */}
      <section className="mb-8">
        <SectionHeader title="Price" />
        <p className="text-sm text-text-secondary mb-4">{flag.priceContext}</p>
        {chartData.length > 0 && primaryAsset && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-wide text-black">{primaryAsset.symbol}</span>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{flag.timeHorizonDays}d</span>
            </div>
            <div className="border-2 border-black overflow-hidden">
              <PriceChart data={chartData} height={220} color={flag.convictionScore >= 70 ? "#00a63e" : "#000"} />
            </div>
          </div>
        )}
      </section>

      {/* News grid */}
      {newsTiles.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="News" subtitle={`${newsTiles.length} articles`} />
          <NewsImageGrid tiles={newsTiles} />
        </section>
      )}

      {/* Economic events */}
      {economicEvents.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title="Economic Calendar" defaultOpen={false}>
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
                  <span
                    className={`shrink-0 px-2 py-0.5 text-xs font-black uppercase tracking-wide ${
                      event.impact === "high"
                        ? "bg-conviction-danger text-white"
                        : event.impact === "medium"
                          ? "bg-conviction-medium text-white"
                          : "bg-conviction-low text-white"
                    }`}
                  >
                    {event.impact}
                  </span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* Hypotheses link */}
      <section className="mb-8">
        <Link
          href={`/flags/${id}/hypothesis`}
          className="block border-2 border-black p-5 hover:bg-surface-raised transition-colors duration-100 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-black mb-1">
                What could happen next
              </h3>
              <p className="text-xs text-text-secondary">
                {hypotheses.length} scenario{hypotheses.length !== 1 ? "s" : ""} — explore, test, and plan.
              </p>
            </div>
            <span className="text-2xl font-black text-black group-hover:text-accent-glow group-hover:translate-x-1 transition-all">→</span>
          </div>
        </Link>
      </section>

      {/* Evidence */}
      <section className="mb-8">
        <ExpandableSection title="Supporting evidence" defaultOpen={false}>
          <ul className="space-y-1">
            {flag.supportingEvidence.map((evidence, i) => (
              <li key={i} className="text-xs text-text-secondary">→ {evidence}</li>
            ))}
          </ul>
        </ExpandableSection>
      </section>

      {/* Next step */}
      <div className="border-3 border-black bg-black text-white p-5">
        <h3 className="text-sm font-black uppercase tracking-widest mb-1">Suggested Next Step</h3>
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
