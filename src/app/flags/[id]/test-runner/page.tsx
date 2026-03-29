import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTests, getDataSource } from "@/services/flag-engine";
import TestResultCard from "@/components/TestResultCard";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import type { TestScenario } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TestRunnerPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const hypotheses = await getHypotheses(id);
  const dataSource = await getDataSource();

  // Gather tests for all hypotheses
  const testsByHypothesis: Record<string, TestScenario[]> = {};
  let totalTests = 0;
  let totalPassed = 0;
  let totalMixed = 0;
  let totalWeak = 0;
  let totalFail = 0;

  for (const h of hypotheses) {
    const tests = await getTests(h.id);
    testsByHypothesis[h.id] = tests;
    totalTests += tests.length;
    totalPassed += tests.filter((t) => t.result === "pass").length;
    totalMixed += tests.filter((t) => t.result === "mixed").length;
    totalWeak += tests.filter((t) => t.result === "weak").length;
    totalFail += tests.filter((t) => t.result === "fail").length;
  }

  // Calculate overall confidence adjustment
  const totalConfidenceImpact = Object.values(testsByHypothesis)
    .flat()
    .reduce((sum, t) => sum + t.confidenceImpact, 0);

  // Overall verdict
  const passRate = totalTests > 0 ? totalPassed / totalTests : 0;
  const overallVerdict =
    passRate >= 0.6 ? "strong" :
    passRate >= 0.4 ? "moderate" :
    passRate >= 0.2 ? "weak" :
    "insufficient";

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back link */}
      <Link
        href={`/flags/${id}/hypothesis`}
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-black transition-colors mb-6"
      >
        ← Hypothesis Workbench
      </Link>

      {/* Header */}
      <header className="mb-8 pb-4 border-b-3 border-black">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black leading-none">
            Test Runner
          </h1>
          {dataSource === "live" && (
            <span className="px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-conviction-high text-white">
              Live
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          {dataSource === "live"
            ? "Automated experiments generated from live news, social sentiment, and market data."
            : "Experiments from demo data. Connect live providers for real-time analysis."}
        </p>
      </header>

      {totalTests === 0 ? (
        <EmptyState
          title="No experiments to show."
          description="Tests are generated from live data — connect news and social sentiment providers to see automated experiments."
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="border-2 border-black p-4 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-black">{totalTests}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">Tests Run</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-conviction-high">{totalPassed}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-conviction-medium">{totalMixed}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">Mixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-conviction-danger">{totalWeak + totalFail}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">Weak/Fail</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-black ${totalConfidenceImpact >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
                  {totalConfidenceImpact > 0 ? "+" : ""}{totalConfidenceImpact}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">Confidence Δ</div>
              </div>
            </div>
          </div>

          {/* Tests grouped by hypothesis */}
          {hypotheses.map((hypothesis) => {
            const tests = testsByHypothesis[hypothesis.id] || [];
            if (tests.length === 0) return null;

            const directionIcon =
              hypothesis.direction === "long" ? "↑" :
              hypothesis.direction === "short" ? "↓" : "→";

            const hypConfidenceImpact = tests.reduce((s, t) => s + t.confidenceImpact, 0);
            const hypPassed = tests.filter(t => t.result === "pass").length;

            return (
              <section key={hypothesis.id} className="mb-10">
                <SectionHeader
                  title={`${directionIcon} ${hypothesis.title}`}
                  subtitle={`${hypPassed}/${tests.length} passed · Confidence: ${hypothesis.confidenceScore}% (${hypConfidenceImpact >= 0 ? "+" : ""}${hypConfidenceImpact})`}
                />
                <div className="space-y-3">
                  {tests.map((test) => (
                    <TestResultCard key={test.id} test={test} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Overall assessment */}
          <div className={`border-3 p-5 mb-8 ${
            overallVerdict === "strong" ? "border-conviction-high bg-conviction-high/5" :
            overallVerdict === "moderate" ? "border-conviction-medium bg-conviction-medium/5" :
            "border-black bg-surface-raised"
          }`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-2">
              Overall Assessment: {overallVerdict}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              {overallVerdict === "strong"
                ? `${totalPassed} of ${totalTests} tests passed, with a net confidence impact of ${totalConfidenceImpact > 0 ? "+" : ""}${totalConfidenceImpact}%. The evidence supports the primary hypothesis. Consider moving to a trade plan.`
                : overallVerdict === "moderate"
                  ? `${totalPassed} of ${totalTests} tests passed. Some evidence supports the thesis, but signals are not unanimous. Consider waiting for additional confirmation before acting.`
                  : overallVerdict === "weak"
                    ? `Only ${totalPassed} of ${totalTests} tests passed. The evidence is inconclusive — the thesis may be valid but isn't well-supported by current data. Monitor rather than act.`
                    : `Tests show insufficient support for the hypothesis. The current evidence does not justify taking a position. Continue monitoring for changes.`}
            </p>
            <div className="flex gap-3">
              <Link
                href={`/flags/${id}/trade-plan`}
                className={`inline-flex items-center px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors ${
                  overallVerdict === "strong"
                    ? "bg-black text-white hover:bg-accent-glow"
                    : "border-2 border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                {overallVerdict === "strong" ? "Build Trade Plan →" : "View Trade Plan →"}
              </Link>
              <Link
                href={`/flags/${id}`}
                className="inline-flex items-center px-4 py-2 text-sm font-bold text-text-muted hover:text-black transition-colors"
              >
                Back to Flag
              </Link>
            </div>
          </div>

          {/* Methodology note */}
          <p className="text-xs text-text-muted leading-relaxed">
            {dataSource === "live"
              ? "These experiments are generated automatically from live news sentiment, Reddit discussions, StockTwits activity, and the Fear & Greed Index. Each test evaluates a different dimension — no single test should be relied on alone. Results refresh every 5 minutes."
              : "These experiments use demo data. Connect live providers in Settings for real-time automated testing."}
          </p>
        </>
      )}
    </div>
  );
}
