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
        className="inline-flex items-center gap-1 text-sm font-bold text-text-muted hover:text-text-primary transition-colors duration-300 mb-6"
      >
        ← Back
      </Link>

      {/* Header */}
      <header className="mb-8 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary leading-none">
            Confidence check
          </h1>
          {dataSource === "live" && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-conviction-high/10 text-conviction-high">
              Live
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          {dataSource === "live"
            ? "We ran some quick checks to see how strong this setup looks."
            : "We ran some quick checks using demo data. Connect live providers for real-time analysis."}
        </p>
      </header>

      {totalTests === 0 ? (
        <EmptyState
          title="No checks to show yet."
          description="Checks are generated from live data — connect news and social sentiment providers to see them."
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="rounded-xl border border-surface-border bg-surface-raised shadow-soft p-4 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-text-primary">{totalTests}</div>
                <div className="text-xs font-semibold text-text-muted">Checks run</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-conviction-high">{totalPassed}</div>
                <div className="text-xs font-semibold text-text-muted">Looking good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-conviction-medium">{totalMixed}</div>
                <div className="text-xs font-semibold text-text-muted">Mixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-conviction-danger">{totalWeak + totalFail}</div>
                <div className="text-xs font-semibold text-text-muted">Weak</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-mono font-bold ${totalConfidenceImpact >= 0 ? "text-conviction-high" : "text-conviction-danger"}`}>
                  {totalConfidenceImpact > 0 ? "+" : ""}{totalConfidenceImpact}
                </div>
                <div className="text-xs font-semibold text-text-muted">Confidence delta</div>
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
                  subtitle={`confidence: ${hypothesis.confidenceScore}%`}
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
          <div className={`rounded-xl shadow-soft p-5 mb-8 ${
            overallVerdict === "strong" ? "border border-conviction-high/30 bg-conviction-high/5" :
            overallVerdict === "moderate" ? "border border-conviction-medium/30 bg-conviction-medium/5" :
            "border border-surface-border bg-surface-raised"
          }`}>
            <h3 className="text-sm font-bold text-text-primary mb-2">
              Overall assessment: {overallVerdict}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              {overallVerdict === "strong"
                ? "The numbers look good. This setup has legs — consider it seriously."
                : overallVerdict === "moderate"
                  ? "Some things check out, others don't. Worth keeping an eye on."
                  : overallVerdict === "weak"
                    ? "Not enough support yet. Daddy says wait for a better setup."
                    : "The data doesn't back this one up. Sit this one out."}
            </p>
            <div className="flex gap-3">
              <Link
                href={`/flags/${id}/trade-plan`}
                className={`inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                  overallVerdict === "strong"
                    ? "bg-accent text-white hover:shadow-card"
                    : "border border-surface-border text-text-primary hover:shadow-card"
                }`}
              >
                {overallVerdict === "strong" ? "Build trade plan →" : "View trade plan →"}
              </Link>
              <Link
                href={`/flags/${id}`}
                className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-text-muted hover:text-text-primary transition-colors duration-300"
              >
                Back to flag
              </Link>
            </div>
          </div>

          {/* Methodology note */}
          <p className="text-xs text-text-muted leading-relaxed">
            {dataSource === "live"
              ? "These checks are run automatically using live news, social media, and market mood data. No single check tells the whole story."
              : "These checks use demo data. Connect live providers in Settings for real-time checks."}
          </p>
        </>
      )}
    </div>
  );
}
