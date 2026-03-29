"use client";

import Link from "next/link";
import WizardLogo from "@/components/WizardLogo";

const steps = [
  {
    num: "01",
    title: "Tell the wizard what you seek",
    desc: "Pick your markets \u2014 forex, crypto, stocks, whatever. The wizard only watches what matters to you.",
  },
  {
    num: "02",
    title: "The wizard does the homework",
    desc: "News, sentiment, social signals, and market data \u2014 scanned 24/7. You don\u2019t have to.",
  },
  {
    num: "03",
    title: "Receive clear counsel",
    desc: "Not charts and jargon. Plain English guidance with conviction scores and real historical backtests.",
  },
  {
    num: "04",
    title: "Act when the time is right",
    desc: "A wizard is never early, nor late. Paper trade first. Go live when the numbers are clear. Full control, always.",
  },
];

const features = [
  {
    title: "Daily briefing",
    desc: "Wake up to a clear view of what matters. What to explore, what to watch, what to leave alone.",
  },
  {
    title: "Conviction engine",
    desc: "Every idea is tested against 10 dimensions of evidence before it reaches you. No gut feelings.",
  },
  {
    title: "Scenario testing",
    desc: "Real historical backtests. Every scenario shown actually happened. No random simulations.",
  },
  {
    title: "Plain English",
    desc: "No candlesticks. No RSI. No MACD. Just \u2018this looks good, here\u2019s why\u2019 \u2014 in language anyone can follow.",
  },
  {
    title: "Paper trading first",
    desc: "Practice without risk. The wizard tracks your outcomes and tells you when a setup has earned your trust.",
  },
  {
    title: "AI-powered analysis",
    desc: "Regime detection, anomaly scoring, change-point analysis. Deep intelligence, translated into simple advice.",
  },
];

const builtFor = [
  "find trading platforms intimidating",
  "want AI to do the heavy analysis",
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
        <div className="flex justify-center mb-6">
          <WizardLogo size={80} />
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-4">
          Trade Daddy
        </h1>
        <p className="text-lg sm:text-xl font-medium text-text-primary/80 mb-3">
          A wizard is never late, nor is he early.
        </p>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-primary/60 leading-relaxed mb-10">
          Your wise AI trading advisor. Trade Daddy watches the markets, reads the
          patterns, tests the setups, and speaks only when the time is right \u2014
          in plain English you can trust.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/85 transition-colors"
          >
            Begin the journey
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg border border-surface-border text-text-primary/70 hover:text-text-primary hover:border-text-primary/25 transition-colors"
          >
            See how it works
          </a>
        </div>

        <p className="text-xs text-text-primary/30">
          For those who&apos;d rather have wisdom than stare at charts all day
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
          Ready for some wisdom?
        </h2>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/85 transition-colors mb-4"
        >
          Begin the journey
        </Link>
        <p className="text-xs text-text-primary/30 max-w-md mx-auto">
          No credit card. Paper trading is free. Live trading requires a broker
          connection.
        </p>
      </section>
    </div>
  );
}
