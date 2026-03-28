import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses, getTests } from "@/services/flag-engine";
import TestResultCard from "@/components/TestResultCard";
import SectionHeader from "@/components/SectionHeader";
import type { TestScenario } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TestRunnerPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const hypotheses = await getHypotheses(id);

  // Gather tests for all hypotheses
  const testsByHypothesis: Record<string, TestScenario[]> = {};
  let totalTests = 0;
  let totalPassed = 0;
  let totalMixed = 0;

  for (const h of hypotheses) {
    const tests = await getTests(h.id);
    testsByHypothesis[h.id] = tests;
    totalTests += tests.length;
    totalPassed += tests.filter((t) => t.result === "pass").length;
    totalMixed += tests.filter((t) => t.result === "mixed").length;
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href={`/flags/${id}/hypothesis`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        ← Back to Hypothesis Workbench
      </Link>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
          Experiment / Test Runner
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          Validate hypotheses with analog comparisons, backtests, and scenario
          analysis before committing capital.
        </p>
      </header>

      {/* Summary bar */}
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4 mb-8">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-text-muted">Tests run</span>{" "}
            <span className="font-semibold text-text-primary">{totalTests}</span>
          </div>
          <div>
            <span className="text-text-muted">Passed</span>{" "}
            <span className="font-semibold text-conviction-high">{totalPassed}</span>
          </div>
          <div>
            <span className="text-text-muted">Mixed</span>{" "}
            <span className="font-semibold text-conviction-medium">{totalMixed}</span>
          </div>
          <div>
            <span className="text-text-muted">Weak/Failed</span>{" "}
            <span className="font-semibold text-conviction-danger">
              {totalTests - totalPassed - totalMixed}
            </span>
          </div>
        </div>
      </div>

      {/* Tests grouped by hypothesis */}
      {hypotheses.map((hypothesis) => {
        const tests = testsByHypothesis[hypothesis.id] || [];
        if (tests.length === 0) return null;

        const directionIcon =
          hypothesis.direction === "long"
            ? "↑"
            : hypothesis.direction === "short"
              ? "↓"
              : "→";

        return (
          <section key={hypothesis.id} className="mb-10">
            <SectionHeader
              title={`${directionIcon} ${hypothesis.title}`}
              subtitle={`Confidence: ${hypothesis.confidenceScore}% · ${tests.length} test${tests.length !== 1 ? "s" : ""}`}
            />
            <div className="space-y-3">
              {tests.map((test) => (
                <TestResultCard key={test.id} test={test} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Run new test button */}
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised/50 p-6 text-center mb-8">
        <p className="text-sm text-text-muted mb-3">
          Want to test a different scenario or adjust assumptions?
        </p>
        <button
          disabled
          className="inline-flex items-center px-4 py-2 rounded-lg bg-surface-overlay text-text-muted text-sm font-medium cursor-not-allowed border border-surface-border"
          title="Connect a simulation engine to run custom tests"
        >
          Run New Test — Coming Soon
        </button>
        <p className="text-xs text-text-muted mt-2">
          Connect a simulation engine (vectorbt, Backtrader) to run custom
          experiments
        </p>
      </div>

      {/* Overall assessment */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <h3 className="text-sm font-semibold text-accent mb-2">
          Overall Confidence Assessment
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          {totalPassed > totalTests / 2
            ? "The majority of tests support the primary hypothesis. Historical analogs and backtests suggest the current market conditions have precedent for continuation. Consider moving to the trade plan stage."
            : totalMixed > totalPassed
              ? "Test results are mixed. Some historical patterns support the thesis, but others suggest caution. Consider running additional tests or waiting for more confirming data before acting."
              : "Test results are inconclusive or weak. The current evidence does not strongly support any single hypothesis. Consider monitoring the situation further before committing capital."}
        </p>
        <Link
          href={`/flags/${id}/trade-plan`}
          className="inline-flex items-center mt-3 text-sm font-medium text-accent hover:text-accent-glow transition-colors"
        >
          View Trade Plan →
        </Link>
      </div>
    </div>
  );
}
