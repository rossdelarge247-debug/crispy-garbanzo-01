import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getTradePlan } from "@/services/flag-engine";
import TradePlanCard from "@/components/TradePlanCard";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import ExecutionModeSelector from "./ExecutionModeSelector";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TradePlanPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const plan = await getTradePlan(id);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href={`/flags/${id}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        ← Back to {flag.title}
      </Link>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
          Trade Plan
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          A structured plan generated from the strongest hypothesis. Review the
          parameters, choose an execution mode, and decide whether to proceed.
        </p>
      </header>

      {plan ? (
        <>
          {/* Trade Plan Card */}
          <section className="mb-8">
            <SectionHeader title="Plan Details" />
            <TradePlanCard plan={plan} />
          </section>

          {/* Execution Mode */}
          <section className="mb-8">
            <SectionHeader
              title="Execution Mode"
              subtitle="Choose how you want to engage with this trade"
            />
            <ExecutionModeSelector currentMode={plan.executionMode} />
          </section>

          {/* Risk Summary */}
          <section className="mb-8">
            <SectionHeader title="Risk Summary" />
            <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="block text-xs text-text-muted mb-0.5">Risk per trade</span>
                  <span className="text-sm font-semibold text-text-primary">{plan.riskPercent}%</span>
                </div>
                <div>
                  <span className="block text-xs text-text-muted mb-0.5">Max hold</span>
                  <span className="text-sm font-semibold text-text-primary">{plan.maxHoldingPeriod}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-muted mb-0.5">Position size</span>
                  <span className="text-sm font-semibold text-text-primary">{plan.suggestedSize} units</span>
                </div>
                <div>
                  <span className="block text-xs text-text-muted mb-0.5">Entry type</span>
                  <span className="text-sm font-semibold text-text-primary capitalize">{plan.entryType}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Execute */}
          <div className="rounded-xl border border-surface-border bg-surface-raised p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">
                  Ready to proceed?
                </h3>
                <p className="text-xs text-text-secondary">
                  Paper trading is recommended before going live.
                </p>
              </div>
              <button
                disabled
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-accent/20 text-accent/50 text-sm font-bold cursor-not-allowed border border-accent/10"
                title="Connect a broker to enable execution (demo mode)"
              >
                Approve &amp; Execute
              </button>
            </div>
          </div>

          {/* Safety notice */}
          <div className="rounded-xl border border-conviction-caution/20 bg-conviction-caution/5 p-4">
            <p className="text-xs text-conviction-caution font-medium mb-1">
              Paper trading recommended
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Before risking real capital, test this plan in paper mode. Connect
              an Alpaca paper trading account in Settings to simulate execution
              with real market data. Live trading requires additional safety
              checks and approval in the Risk &amp; Controls settings.
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          title="No trade plan yet"
          description="Explore hypotheses and run tests first. A trade plan will be generated once a hypothesis has sufficient supporting evidence."
        />
      )}
    </div>
  );
}
