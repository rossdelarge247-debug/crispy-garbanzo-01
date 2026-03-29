import { getFlags, getHypotheses, getTestsForFlag, getDataSource } from "@/services/flag-engine";
import FlagCard from "@/components/FlagCard";
import type { FlagCardIntel } from "@/components/FlagCard";

// Force dynamic rendering — the flag engine fetches live news data
export const dynamic = "force-dynamic";
export const revalidate = 300; // revalidate every 5 minutes

function computeVerdict(
  convictionScore: number,
  testsPassed: number,
  testsTotal: number
): { verdict: "explore" | "monitor" | "wait"; reason: string } {
  const passRate = testsTotal > 0 ? testsPassed / testsTotal : 0;

  if (convictionScore >= 70 && passRate >= 0.6) {
    return { verdict: "explore", reason: "Strong conviction, tests support the thesis" };
  }
  if (convictionScore >= 50 || passRate >= 0.4) {
    return { verdict: "monitor", reason: "Promising but needs more confirmation" };
  }
  return { verdict: "wait", reason: "Insufficient evidence to act" };
}

const steps = [
  {
    num: "01",
    title: "We scan everything",
    desc: "Market data, news, sentiment, economic events — continuously ingested and analyzed across equities, forex, crypto, and commodities.",
  },
  {
    num: "02",
    title: "We find what matters",
    desc: "Not every headline is a signal. We identify a small number of high-conviction market situations and filter out the noise.",
  },
  {
    num: "03",
    title: "We explain it plainly",
    desc: "Every situation is summarized in plain English. What's happening, why it matters, and what assets are affected — no jargon required.",
  },
  {
    num: "04",
    title: "We test the thesis",
    desc: "Each scenario is validated against historical analogs, backtests, and sensitivity analysis. You see the results, not the math.",
  },
  {
    num: "05",
    title: "You decide what to do",
    desc: "Explore further, monitor, or pass. When you're ready, structured trade plans with built-in risk controls are one click away.",
  },
];

const reasons = [
  {
    title: "Built for humans, not traders",
    desc: "Traditional platforms assume you know what a candlestick chart means. Trade Daddy assumes you don't — and that's perfectly fine.",
  },
  {
    title: "Conviction, not noise",
    desc: "Most platforms show you everything. We show you only what our engine believes matters, backed by data and tested against history.",
  },
  {
    title: "From understanding to action",
    desc: "Summary → hypotheses → tests → trade plan → execution. A guided path from 'what's happening' to 'what should I do' — at your own pace.",
  },
  {
    title: "Safety is not optional",
    desc: "Kill switches, position limits, conviction thresholds, daily loss caps, manual approval — every safeguard a professional desk would have.",
  },
];

export default async function DashboardPage() {
  const flags = await getFlags();
  const dataSource = await getDataSource();

  const intelByFlag: Record<string, FlagCardIntel> = {};

  await Promise.all(
    flags.map(async (flag) => {
      const hypotheses = await getHypotheses(flag.id);
      const tests = await getTestsForFlag(flag.id);

      const testsPassed = tests.filter((t) => t.result === "pass").length;
      const topHypothesis = hypotheses.length > 0
        ? hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
        : null;

      const { verdict, reason } = computeVerdict(
        flag.convictionScore,
        testsPassed,
        tests.length
      );

      intelByFlag[flag.id] = {
        hypothesisCount: hypotheses.length,
        topHypothesis: topHypothesis?.title ?? null,
        testsPassed,
        testsTotal: tests.length,
        verdict,
        verdictReason: reason,
      };
    })
  );

  return (
    <div className="animate-fade-in">
      {/* ========== HERO ========== */}
      <section className="mb-16 pt-4">
        <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-black leading-[0.9] mb-4">
          Your markets.<br />Decoded.
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mb-6">
          Trade Daddy scans live markets, news, and sentiment — then tells you
          what actually matters, in plain English. No charts to decode. No
          jargon to learn. Just clear opportunities with tested conviction.
        </p>
        <div className="flex gap-3">
          <a
            href="#flags"
            className="inline-flex items-center px-5 py-3 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-accent-glow transition-colors"
          >
            See Live Flags
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center px-5 py-3 border-2 border-black text-black text-sm font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            How It Works
          </a>
        </div>
      </section>

      {/* ========== VALUE PROP STRIP ========== */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black mb-16">
        {[
          { num: String(flags.length), label: "Active Flags" },
          { num: String(Object.values(intelByFlag).reduce((s, i) => s + i.hypothesisCount, 0)), label: "Hypotheses" },
          { num: String(Object.values(intelByFlag).reduce((s, i) => s + i.testsTotal, 0)), label: "Experiments" },
          { num: dataSource === "live" ? "LIVE" : "DEMO", label: dataSource === "live" ? "News Feed" : "Mock Data" },
        ].map((stat, i) => (
          <div
            key={i}
            className={`p-4 text-center ${i < 3 ? "border-r-2 border-black" : ""} ${i < 2 ? "max-md:border-b-2 max-md:border-black" : ""}`}
          >
            <div className="text-3xl sm:text-4xl font-black text-black leading-none mb-1">
              {stat.num}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* ========== LIVE FLAGS ========== */}
      <section id="flags" className="mb-16">
        <div className="mb-6 pb-3 border-b-3 border-black">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none">
              High-Conviction Flags
            </h2>
            {dataSource === "live" && (
              <span className="px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-conviction-high text-white">
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {dataSource === "live"
              ? `Generated from live news — ${flags.length} market situations detected.`
              : "Showing demo data — connect news providers for live flags."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l-2 border-t-2 border-black">
          {flags.map((flag, i) => (
            <div
              key={flag.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
            >
              <FlagCard flag={flag} intel={intelByFlag[flag.id]} />
            </div>
          ))}
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="mb-16">
        <div className="mb-6 pb-3 border-b-3 border-black">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none mb-1">
            How It Works
          </h2>
          <p className="text-sm text-text-secondary">
            From raw data to clear action in five steps.
          </p>
        </div>

        <div className="space-y-0">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-4 border-b border-black/10 py-5">
              <span className="text-3xl font-black text-text-muted leading-none shrink-0 w-12">
                {step.num}
              </span>
              <div>
                <h3 className="text-base font-black text-black uppercase tracking-tight mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== WHO IT'S FOR ========== */}
      <section className="mb-16">
        <div className="border-3 border-black bg-black text-white p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight mb-4">
            You don&apos;t need to be<br />a trader to trade.
          </h2>
          <p className="text-sm text-white/60 max-w-xl mb-6 leading-relaxed">
            Trade Daddy is for the curious — people who know markets matter
            but find most platforms overwhelming, noisy, and full of jargon
            they didn&apos;t sign up to learn. We do the work. You make the
            call.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Curious investors who want opportunities explained",
              "People who find trading platforms intimidating",
              "Anyone who wants AI to do the analysis first",
              "Users who want guidance before taking action",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent-glow font-black shrink-0">→</span>
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHY TRADE DADDY ========== */}
      <section className="mb-16">
        <div className="mb-6 pb-3 border-b-3 border-black">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none mb-1">
            Why Trade Daddy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-black">
          {reasons.map((reason, i) => (
            <div
              key={i}
              className={`p-5 ${i < 2 ? "border-b-2 border-black" : ""} ${i % 2 === 0 ? "md:border-r-2 md:border-black" : ""}`}
            >
              <h3 className="text-sm font-black text-black uppercase tracking-tight mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {reason.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== THE JOURNEY ========== */}
      <section className="mb-16">
        <div className="mb-6 pb-3 border-b-3 border-black">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none mb-1">
            Your Journey
          </h2>
          <p className="text-sm text-text-secondary">
            Start by reading. End by executing — only when you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black">
          {[
            { stage: "Read", desc: "See what matters. Plain English summaries of real market situations.", mode: "Free" },
            { stage: "Explore", desc: "Drill into hypotheses. See what the system thinks might happen next.", mode: "Free" },
            { stage: "Test", desc: "Run experiments. Historical analogs, backtests, scenario analysis.", mode: "Paper" },
            { stage: "Act", desc: "Execute with guardrails. Paper first, live when ready, autonomous later.", mode: "Live" },
          ].map((item, i) => (
            <div key={i} className={`p-4 ${i < 3 ? "border-r-2 border-black" : ""}`}>
              <div className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">
                {item.mode}
              </div>
              <h3 className="text-lg font-black text-black uppercase tracking-tight mb-1">
                {item.stage}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="mb-8">
        <div className="border-3 border-black p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mb-3">
            Stop guessing.<br />Start knowing.
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Trade Daddy is in early access. Explore live flags now or
            sign up to get notified when paper trading and live execution go live.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="#flags"
              className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-accent-glow transition-colors"
            >
              Explore Flags
            </a>
            <button
              disabled
              className="inline-flex items-center px-6 py-3 border-2 border-black text-black text-sm font-black uppercase tracking-widest opacity-50 cursor-not-allowed"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
