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
      <header className="mb-8 pb-4 border-b-3 border-black">
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black leading-none mb-2">
          High-Conviction<br />Flags
        </h1>
        <p className="text-sm font-medium text-text-secondary max-w-lg">
          Market situations that deserve your attention right now.
        </p>
      </header>

      {/* Flag Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l-2 border-t-2 border-black mb-12">
        {flags.map((flag, i) => (
          <div
            key={flag.id}
            className="animate-slide-up border-r-2 border-b-2 border-black -ml-[2px] -mt-[2px] first:ml-0 first:mt-0"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards", marginLeft: 0, marginTop: 0 }}
          >
            <FlagCard flag={flag} intel={intelByFlag[flag.id]} />
          </div>
        ))}
      </div>

      {/* How this works */}
      <ExpandableSection title="How Trade Daddy works" defaultOpen={false}>
        <div className="space-y-3 text-sm text-text-secondary max-w-2xl">
          <p>
            Trade Daddy continuously scans live market data, news, sentiment,
            and economic calendar events. It identifies a small number of
            high-conviction situations — not individual tickers, but
            meaningful themes.
          </p>
          <p>
            Each flag shows what&apos;s happening, test results, and a clear
            verdict. Click any flag to drill deeper.
          </p>
        </div>
      </ExpandableSection>
    </div>
  );
}
