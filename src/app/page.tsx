import { getFlags, getHypotheses, getTestsForFlag } from "@/services/flag-engine";
import FlagCard from "@/components/FlagCard";
import type { FlagCardIntel } from "@/components/FlagCard";
import ExpandableSection from "@/components/ExpandableSection";

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

export default async function DashboardPage() {
  const flags = await getFlags();

  // Build intel for each flag — hypotheses, test pass rates, verdict
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
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
          High-Conviction Flags
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          Market situations that deserve your attention right now.
        </p>
      </header>

      {/* Flag Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {flags.map((flag, i) => (
          <div
            key={flag.id}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <FlagCard flag={flag} intel={intelByFlag[flag.id]} />
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
              Each flag shows what&apos;s happening, test results, and a clear
              verdict on whether to explore further, monitor, or wait. Click
              any flag to drill into the full detail, hypotheses, and trade
              plans.
            </p>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
