"use client";

import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Tell Daddy what you care about",
    desc: "Pick your markets — forex, crypto, stocks, whatever. Daddy only watches what matters to you.",
  },
  {
    num: "02",
    title: "Daddy does the homework",
    desc: "We scan news, sentiment, social media, and market data 24/7. You don\u2019t have to.",
  },
  {
    num: "03",
    title: "Get clear trade ideas",
    desc: "Not charts and jargon. Plain English suggestions with confidence scores and dry-run results.",
  },
  {
    num: "04",
    title: "Trade when you\u2019re ready",
    desc: "Paper trade first. Go live when Daddy says the numbers look good. Full control, always.",
  },
];

const features = [
  {
    title: "Daily briefing",
    desc: "Wake up to your personalized task list. What to trade, what to watch, what to skip.",
  },
  {
    title: "Confidence checks",
    desc: "Every idea is tested against history and sentiment before it reaches you.",
  },
  {
    title: "Dry run simulator",
    desc: "Practice trades without risk. Daddy tracks win rates and tells you when a setup is ready.",
  },
  {
    title: "Plain English",
    desc: "No candlesticks. No RSI. No MACD. Just \u2018this looks good, here\u2019s why.\u2019",
  },
  {
    title: "Paper trading first",
    desc: "Start with fake money. Graduate to real when you\u2019re confident.",
  },
  {
    title: "AI-powered analysis",
    desc: "6 analysis frameworks run automatically. Deep narrative, opportunity scanning, risk assessment, and more.",
  },
];

const builtFor = [
  "find trading platforms intimidating",
  "want AI to do the analysis",
  "prefer plain English over chart patterns",
  "want to learn by doing, safely",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-DEFAULT text-text-primary">
      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-4">
          Trade Daddy <span className="text-accent">2.0</span>
        </h1>
        <p className="text-lg sm:text-xl font-medium text-text-primary/80 mb-3">
          Do what Daddy tells you.
        </p>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-primary/60 leading-relaxed mb-10">
          Your AI day-trading assistant. Trade Daddy watches the markets, runs
          the analysis, tests the setups, and tells you exactly what to do — in
          plain English.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/85 transition-colors"
          >
            Get started
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg border border-surface-border text-text-primary/70 hover:text-text-primary hover:border-text-primary/25 transition-colors"
          >
            See how it works
          </a>
        </div>

        <p className="text-xs text-text-primary/30">
          Trusted by people who&apos;d rather not stare at charts all day
        </p>
      </section>

      {/* ================================================================
          HOW IT WORKS
          ================================================================ */}
      <section
        id="how-it-works"
        className="px-6 py-20 sm:py-28 max-w-5xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-14">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-surface-raised rounded-xl border border-surface-border p-6"
            >
              <span className="text-xs font-bold text-accent tracking-widest">
                {s.num}
              </span>
              <h3 className="text-base font-semibold mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          FEATURES
          ================================================================ */}
      <section className="px-6 py-20 sm:py-28 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-14">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-surface-raised rounded-xl border border-surface-border p-6"
            >
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          SOCIAL PROOF / TRUST
          ================================================================ */}
      <section className="px-6 py-20 sm:py-28 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
          Built for people who...
        </h2>
        <ul className="space-y-3 max-w-md mx-auto text-left">
          {builtFor.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 text-text-secondary text-sm"
            >
              <span className="mt-0.5 text-accent">&#10003;</span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* ================================================================
          FINAL CTA
          ================================================================ */}
      <section className="px-6 py-20 sm:py-28 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          Ready to let Daddy handle it?
        </h2>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/85 transition-colors mb-4"
        >
          Get started free
        </Link>
        <p className="text-xs text-text-primary/30 max-w-md mx-auto">
          No credit card. Paper trading is free. Live trading requires a broker
          connection.
        </p>
      </section>
    </div>
  );
}
