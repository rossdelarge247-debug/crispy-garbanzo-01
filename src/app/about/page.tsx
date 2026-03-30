import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link href="/dashboard" className="caption inline-block mb-8" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>

      <h1 className="page-title mb-2">Trade Wizard</h1>
      <p className="caption mb-12" style={{ color: "var(--text-muted)" }}>AI trading intelligence platform</p>

      <div className="space-y-10">
        <div>
          <p className="text-lg font-light leading-relaxed" style={{ color: "var(--text)" }}>
            Trade Wizard turns market noise into clear, actionable trading insight — personalised to the instruments and styles you care about.
          </p>
        </div>

        <div>
          <p className="section-label mb-3">What it does</p>
          <div className="space-y-4">
            <p className="body-text">Continuously analyses price data, news, economic calendar events, and social sentiment across your chosen markets. Identifies the current regime — whether conditions favour trend following, breakouts, mean reversion, or standing aside.</p>
            <p className="body-text">Surfaces specific trade setups only when the evidence is strong enough. Shows you exactly what was tested, why, and how similar conditions played out historically.</p>
          </div>
        </div>

        <div>
          <p className="section-label mb-3">What it is not</p>
          <div className="space-y-4">
            <p className="body-text">Not a magic auto-profit bot. Not a noisy indicator dashboard. Not a black box that hides its reasoning.</p>
            <p className="body-text">It is a decision-support tool that helps you focus, understand context, plan trades with discipline, and review your outcomes.</p>
          </div>
        </div>

        <div>
          <p className="section-label mb-3">How it works</p>
          <div className="space-y-3">
            {[
              { title: "Choose your markets", detail: "FX, crypto, equities, commodities — you decide what matters." },
              { title: "Regime detection", detail: "The system classifies market conditions across multiple timeframes: trending, ranging, volatile, compressed." },
              { title: "Setup detection", detail: "Five setup types are monitored: trend continuation, pullback, breakout, mean reversion, and event-driven." },
              { title: "Confidence scoring", detail: "Every setup is scored on regime fit, signal alignment, historical precedent, and sentiment. No fake certainty." },
              { title: "Trade planning", detail: "Structured pre-trade checklist. Entry, stop, target, thesis, invalidation — all defined before you commit." },
              { title: "Journaling", detail: "Log trades, review outcomes, track performance by setup type. Build discipline over time." },
            ].map((item, i) => (
              <div key={i} className="card">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.title}</p>
                <p className="caption mt-1">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="section-label mb-3">Data sources</p>
          <p className="body-text">
            Prices from Polygon, Yahoo Finance, and CoinGecko. News from GDELT and RSS feeds (CNBC, MarketWatch, BBC). Social sentiment from Reddit and StockTwits. Economic calendar from Forex Factory. AI analysis powered by Claude.
          </p>
        </div>

        <div>
          <p className="section-label mb-3">Built for</p>
          <div className="space-y-2">
            {[
              "Discretionary traders who want better filtering and discipline",
              "Semi-systematic traders interested in quant-informed overlays",
              "Anyone who finds trading platforms overwhelming and wants clarity",
            ].map((line, i) => (
              <p key={i} className="body-text flex items-start gap-2">
                <span style={{ color: "var(--accent)" }} className="mt-0.5 shrink-0">—</span>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="pt-4 pb-8" style={{ borderTop: "1px solid var(--surface)" }}>
          <p className="caption">
            Trade Wizard does not provide financial advice. All analysis is for informational purposes. Trading involves risk of loss. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
