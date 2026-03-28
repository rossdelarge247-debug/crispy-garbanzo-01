import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import { getNewsProvider } from "@/services/news";
import { getCalendarProvider } from "@/services/calendar";
import ConvictionBadge from "@/components/ConvictionBadge";
import StatusBadge from "@/components/StatusBadge";
import AssetPill from "@/components/AssetPill";
import ExpandableSection from "@/components/ExpandableSection";
import SectionHeader from "@/components/SectionHeader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const hypotheses = await getHypotheses(id);

  // Fetch news for the first affected asset
  const newsProvider = getNewsProvider();
  const articles = flag.affectedAssets.length > 0
    ? await newsProvider.getNewsBySymbol(flag.affectedAssets[0].symbol)
    : [];

  // Fetch upcoming economic events
  const calendarProvider = getCalendarProvider();
  const economicEvents = await calendarProvider.getUpcomingEvents(14);

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
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Hero */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-medium text-text-muted bg-surface-raised rounded-full px-2.5 py-0.5 border border-surface-border">
            {flag.category}
          </span>
          <StatusBadge status={flag.status} />
          <ConvictionBadge score={flag.convictionScore} size="md" />
          <span className="text-xs text-text-muted capitalize">
            {flag.timeHorizon} · {flag.timeHorizonDays} days
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-snug">
          {flag.title}
        </h1>
      </header>

      {/* What's happening */}
      <section className="mb-8">
        <SectionHeader title="What's happening" />
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {flag.summary}
        </p>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
            Why it matters
          </h4>
          <p className="text-sm text-text-primary leading-relaxed">
            {flag.whyItMatters}
          </p>
        </div>
      </section>

      {/* What changed recently */}
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
            <div
              key={asset.symbol}
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
            >
              <AssetPill
                symbol={asset.symbol}
                direction={asset.direction}
                impact={asset.impact}
              />
              <span className="text-xs text-text-muted">{asset.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Key drivers */}
      <section className="mb-8">
        <SectionHeader title="Key drivers" />
        <ul className="space-y-1.5">
          {flag.drivers.map((driver, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-accent mt-0.5 shrink-0">·</span>
              {driver}
            </li>
          ))}
        </ul>
      </section>

      {/* Recent timeline */}
      <section className="mb-8">
        <SectionHeader title="Recent timeline" />
        <div className="space-y-3">
          {flag.timeline.map((event, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-xl border border-surface-border bg-surface-raised p-4"
            >
              <div className="shrink-0 mt-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.impact === "positive"
                      ? "bg-conviction-high"
                      : event.impact === "negative"
                        ? "bg-conviction-danger"
                        : "bg-conviction-low"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-text-muted">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {event.source && (
                    <span className="text-xs text-text-muted">· {event.source}</span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-text-primary mb-0.5">
                  {event.title}
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Market sentiment */}
      <section className="mb-8">
        <SectionHeader title="Market sentiment" />
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-primary font-medium">{sentimentLabel}</span>
            <span className="text-xs text-text-muted">Score: {flag.sentimentScore}</span>
          </div>
          {/* Sentiment bar */}
          <div className="relative h-2 bg-surface-border rounded-full overflow-hidden mb-3">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${sentimentPercent}%`,
                background:
                  flag.sentimentScore > 20
                    ? "#22c55e"
                    : flag.sentimentScore > -20
                      ? "#eab308"
                      : "#ef4444",
              }}
            />
            {/* Center marker */}
            <div className="absolute top-0 left-1/2 h-full w-px bg-text-muted/30" />
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mt-3">
            {flag.sentimentSummary}
          </p>
        </div>
      </section>

      {/* Price context */}
      <section className="mb-8">
        <SectionHeader title="Price context" />
        <p className="text-sm text-text-secondary leading-relaxed">
          {flag.priceContext}
        </p>
      </section>

      {/* Related News */}
      {articles.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title="Related News" defaultOpen={true}>
            <div className="space-y-3">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-surface-border bg-surface-raised p-4 hover:border-accent/30 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-accent">{article.source}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(article.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-text-primary mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-1">
                    {article.summary}
                  </p>
                </a>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* Upcoming Economic Events */}
      {economicEvents.length > 0 && (
        <section className="mb-8">
          <ExpandableSection title="Upcoming Economic Events" defaultOpen={false}>
            <div className="space-y-2">
              {economicEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                >
                  <span className="shrink-0 text-xs text-text-muted w-16">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="shrink-0 text-base">
                    {event.country === "US"
                      ? "🇺🇸"
                      : event.country === "EU"
                        ? "🇪🇺"
                        : "🌍"}
                  </span>
                  <span className="text-sm text-text-primary font-medium flex-1 min-w-0 truncate">
                    {event.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium rounded-full px-2 py-0.5 ${
                      event.impact === "high"
                        ? "bg-conviction-danger/10 text-conviction-danger"
                        : event.impact === "medium"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-text-muted/10 text-text-muted"
                    }`}
                  >
                    {event.impact}
                  </span>
                  {(event.forecast || event.previous) && (
                    <span className="shrink-0 text-xs text-text-muted">
                      {event.forecast && <>F: {event.forecast}</>}
                      {event.forecast && event.previous && " / "}
                      {event.previous && <>P: {event.previous}</>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {/* What could happen next */}
      <section className="mb-8">
        <Link
          href={`/flags/${id}/hypothesis`}
          className="block rounded-xl border border-surface-border bg-surface-raised p-5 hover:border-accent/30 hover:bg-surface-overlay transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                What could happen next
              </h3>
              <p className="text-xs text-text-secondary">
                {hypotheses.length} possible scenario{hypotheses.length !== 1 ? "s" : ""} generated
                — explore hypotheses, run tests, and build trade plans.
              </p>
            </div>
            <span className="text-accent group-hover:translate-x-0.5 transition-transform duration-200">
              →
            </span>
          </div>
        </Link>
      </section>

      {/* Supporting evidence */}
      <section className="mb-8">
        <ExpandableSection title="Supporting evidence" defaultOpen={false}>
          <ul className="space-y-2">
            {flag.supportingEvidence.map((evidence, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <span className="text-text-muted mt-0.5 shrink-0">•</span>
                {evidence}
              </li>
            ))}
          </ul>
        </ExpandableSection>
      </section>

      {/* Suggested next step */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <h3 className="text-sm font-semibold text-accent mb-1">Suggested next step</h3>
        <p className="text-sm text-text-secondary">{flag.suggestedAction}</p>
        <div className="flex gap-3 mt-4">
          <Link
            href={`/flags/${id}/hypothesis`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dim transition-colors duration-200"
          >
            Explore Hypotheses
          </Link>
          <Link
            href={`/flags/${id}/trade-plan`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:bg-surface-overlay transition-colors duration-200"
          >
            View Trade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
