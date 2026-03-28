import { getFlags } from "@/services/flag-engine";
import FlagCard from "@/components/FlagCard";
import ExpandableSection from "@/components/ExpandableSection";

export default async function DashboardPage() {
  const flags = await getFlags();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
          High-Conviction Flags
        </h1>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
          Market situations that deserve your attention right now. Each flag
          represents a meaningful event or theme detected over the past 7–28
          days.
        </p>
      </header>

      {/* Flag Cards */}
      <div className="space-y-4 mb-12">
        {flags.map((flag, i) => (
          <div
            key={flag.id}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
          >
            <FlagCard flag={flag} />
          </div>
        ))}
      </div>

      {/* How this works */}
      <div className="border-t border-surface-border pt-8">
        <ExpandableSection title="How Trade Daddy works" defaultOpen={false}>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed max-w-2xl">
            <p>
              Trade Daddy continuously scans live market data, news, sentiment,
              and economic calendar events. It identifies a small number of
              high-conviction situations — not individual tickers, but
              meaningful themes like geopolitical shocks, sentiment shifts, or
              central bank repricing.
            </p>
            <p>
              Each flag summarizes what is happening, why it matters, and what
              you could do next. You can drill into any flag to explore
              hypotheses, run tests, and build trade plans — but you never
              have to. The goal is to surface what matters and let you decide
              how deep to go.
            </p>
            <p className="text-text-muted">
              Data sources include market prices, news feeds, sentiment
              analysis, and economic calendars. In demo mode, realistic sample
              data is shown. Connect live providers in Settings to use real
              data.
            </p>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
