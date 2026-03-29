import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlagById, getValidatedIdeaById } from "@/services/flag-engine";
import { getAssetDisplayName } from "@/lib/asset-names";

interface Props {
  params: Promise<{ id: string }>;
}

function fp(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default async function TradePlanPage({ params }: Props) {
  const { id } = await params;
  const flag = await getFlagById(id);
  if (!flag) notFound();

  const idea = await getValidatedIdeaById(id);
  const rec = idea?.recommendation;
  const bt = idea?.backtestSummary;
  const primaryAsset = flag.affectedAssets.find(a => a.impact === "primary") ?? flag.affectedAssets[0];
  const humanName = getAssetDisplayName(primaryAsset?.symbol ?? "");

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link href={`/flags/${id}`} className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors mb-4 inline-block">
        &larr; Back to {humanName}
      </Link>

      <h1 className="text-xl font-bold text-[--text-primary] mb-1">Trade Plan</h1>
      <p className="text-xs text-[--text-muted] mb-6">{humanName} · {flag.category}</p>

      {rec ? (
        <div className="space-y-4">
          {/* Action */}
          <div className={`rounded-lg p-4 ${
            rec.action === "enter_now" ? "bg-[--green-bg]" : rec.action === "wait" ? "bg-[--amber-bg]" : "bg-[--surface-raised]"
          }`}>
            <span className={`text-lg font-bold ${
              rec.action === "enter_now" ? "text-[--green]" : rec.action === "wait" ? "text-[--amber]" : "text-[--text-muted]"
            }`}>
              {rec.action === "enter_now" ? "Enter now" : rec.action === "wait" ? "Wait for better entry" : "Skip this setup"}
            </span>
            <p className="text-sm text-[--text-secondary] mt-1">{rec.summary}</p>
          </div>

          {/* The exact trade */}
          <div className="rounded-lg bg-[--surface-raised] p-4">
            <p className="text-xs font-semibold text-[--text-muted] mb-3">Exact trade specification</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Direction</span>
                <span className={`font-bold ${rec.direction === "long" ? "text-[--green]" : "text-[--red]"}`}>
                  {rec.direction === "long" ? "LONG (buy)" : "SHORT (sell)"}
                </span>
              </div>

              {rec.entryPrice > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[--text-muted]">Entry price</span>
                    <span className="font-bold tabular-nums text-[--text-primary]">{fp(rec.entryPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[--text-muted]">Stop loss</span>
                    <span className="font-bold tabular-nums text-[--red]">{fp(rec.stopLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[--text-muted]">Take profit</span>
                    <span className="font-bold tabular-nums text-[--green]">{fp(rec.takeProfit)}</span>
                  </div>
                </>
              ) : (
                <>
                  {rec.entryText && <div className="flex justify-between"><span className="text-[--text-muted]">Entry</span><span className="font-medium text-[--text-primary]">{rec.entryText}</span></div>}
                  {rec.stopText && <div className="flex justify-between"><span className="text-[--text-muted]">Stop loss</span><span className="font-medium text-[--red]">{rec.stopText}</span></div>}
                  {rec.targetText && <div className="flex justify-between"><span className="text-[--text-muted]">Take profit</span><span className="font-medium text-[--green]">{rec.targetText}</span></div>}
                </>
              )}

              <div className="flex justify-between">
                <span className="text-[--text-muted]">Hold period</span>
                <span className="font-medium text-[--text-primary]">{rec.holdText ?? `Up to ${rec.holdDays} days`}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[--text-muted]">Position size</span>
                <span className="font-medium text-[--text-primary]">&pound;{rec.suggestedAmount.toLocaleString()} at {rec.suggestedLeverage}x</span>
              </div>

              {rec.entryPrice > 0 && rec.stopLoss > 0 && (
                <div className="flex justify-between">
                  <span className="text-[--text-muted]">Max risk</span>
                  <span className="font-bold tabular-nums text-[--red]">
                    &pound;{(rec.suggestedAmount * rec.suggestedLeverage * Math.abs(rec.entryPrice - rec.stopLoss) / rec.entryPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Catalyst + timing */}
          {(rec.catalyst || rec.timing) && (
            <div className="rounded-lg bg-[--surface-raised] p-4">
              <p className="text-xs font-semibold text-[--text-muted] mb-2">Timing</p>
              {rec.catalyst && <p className="text-sm text-[--text-secondary] mb-1">Catalyst: {rec.catalyst}</p>}
              {rec.timing && <p className="text-sm text-[--text-secondary] mb-1">When to enter: {rec.timing}</p>}
              {rec.whatToWatch && <p className="text-sm text-[--text-secondary]">Watch: {rec.whatToWatch}</p>}
            </div>
          )}

          {/* Confidence */}
          <div className="rounded-lg bg-[--surface-raised] p-4">
            <p className="text-xs font-semibold text-[--text-muted] mb-2">Confidence: {rec.confidence}% ({rec.confidenceLabel})</p>
            {bt && bt.scenarioCount > 0 && (
              <div className="grid grid-cols-4 gap-3 text-xs text-center mb-2">
                <div><p className="text-base font-bold tabular-nums text-[--green]">{bt.winRate}%</p><p className="text-[--text-muted]">Win rate</p></div>
                <div><p className="text-base font-bold tabular-nums text-[--text-primary]">{bt.scenarioCount}</p><p className="text-[--text-muted]">Scenarios</p></div>
                <div><p className="text-base font-bold tabular-nums text-[--text-primary]">{bt.profitFactor}:1</p><p className="text-[--text-muted]">PF</p></div>
                <div><p className="text-base font-bold tabular-nums text-[--text-primary]">{bt.avgDaysHeld}d</p><p className="text-[--text-muted]">Avg hold</p></div>
              </div>
            )}
          </div>

          {/* Reasons + risks */}
          <div className="rounded-lg bg-[--surface-raised] p-4 space-y-2">
            <p className="text-xs font-semibold text-[--text-muted] mb-1">Why this trade</p>
            {rec.reasons.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs text-[--text-secondary]"><span className="text-[--text-muted] mr-1">{i + 1}.</span>{r}</p>
            ))}
            {rec.risks.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[--text-muted] mt-2 mb-1">Risks</p>
                {rec.risks.slice(0, 2).map((r, i) => (
                  <p key={i} className="text-xs text-[--text-muted]">{r}</p>
                ))}
              </>
            )}
          </div>

          {/* Paper trade CTA */}
          <div className="rounded-lg bg-[--surface-raised] p-4">
            <p className="text-sm text-[--text-secondary] mb-3">
              Start with a paper trade to test this setup without risk.
            </p>
            <button disabled className="w-full px-4 py-2.5 text-sm font-semibold rounded bg-[--accent] text-white opacity-60 cursor-not-allowed">
              Set up paper trade (coming soon)
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-[--surface-raised] p-5">
          <p className="text-sm text-[--text-secondary]">
            No trade plan available for this idea. The system needs to complete its analysis first.
          </p>
          <Link href={`/flags/${id}`} className="text-sm text-[--accent] mt-2 inline-block">
            Back to analysis
          </Link>
        </div>
      )}
    </div>
  );
}
