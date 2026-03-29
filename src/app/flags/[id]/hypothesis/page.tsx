import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getHypotheses } from "@/services/flag-engine";
import HypothesisCard from "@/components/HypothesisCard";
import SectionHeader from "@/components/SectionHeader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HypothesisPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const hypotheses = await getHypotheses(id);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href={`/flags/${id}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        ← Back
      </Link>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
          What could happen next
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          The wizard has studied the signs and generated these scenarios based on current conditions.
        </p>
      </header>

      {/* Context card */}
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4 mb-8">
        <p className="text-xs text-text-muted mb-1">
          Analyzing
        </p>
        <p className="text-sm font-medium text-text-primary">{flag.title}</p>
      </div>

      {/* Hypotheses */}
      <section className="mb-8">
        <SectionHeader
          title="Possible scenarios"
          subtitle={`${hypotheses.length} scenarios generated`}
        />
        <div className="space-y-4">
          {hypotheses.map((hypothesis) => (
            <HypothesisCard
              key={hypothesis.id}
              hypothesis={hypothesis}
              flagId={id}
            />
          ))}
        </div>
      </section>

      {/* Test runner link */}
      <div className="rounded-xl border border-surface-border bg-surface-raised p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Check these scenarios
            </h3>
            <p className="text-xs text-text-secondary">
              See which scenarios have the most support behind them.
            </p>
          </div>
          <Link
            href={`/flags/${id}/test-runner`}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:shadow-card transition-all duration-300 shrink-0"
          >
            Check confidence →
          </Link>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
        These are possible outcomes, not predictions. Use the confidence checker to see which ones have the most support.
      </p>
    </div>
  );
}
