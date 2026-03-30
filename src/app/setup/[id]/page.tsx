"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { InstrumentSummary, Setup } from "@/types/mission-control";
import { addJournalEntry } from "@/lib/journal";
import BacktestPanel from "@/components/BacktestPanel";
import type { FinalisedPlan } from "@/components/BacktestPanelTypes";

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

/* ================================================================
   Smart checklist — auto-qualified by backtest data
   ================================================================ */

type Grade = "green" | "amber" | "red" | "none";

interface CheckItem {
  key: string;
  label: string;
  grade: Grade;
  feedback: string;
  checked: boolean;
}

function gradeSetup(plan: FinalisedPlan | null, setup: Setup | null): CheckItem[] {
  if (!plan || !setup) {
    return [
      { key: "defined", label: "Setup clearly defined with entry, stop, target", grade: "none", feedback: "Finalise the backtest to qualify this item", checked: false },
      { key: "regime", label: "Current regime supports this setup type", grade: "none", feedback: "Finalise the backtest to qualify this item", checked: false },
      { key: "event", label: "Event risk is acceptable", grade: "none", feedback: "Finalise the backtest to qualify this item", checked: false },
      { key: "rr", label: "Risk/reward ratio is acceptable", grade: "none", feedback: "Finalise the backtest to qualify this item", checked: false },
      { key: "invalidation", label: "Invalidation condition is defined", grade: "none", feedback: "Finalise the backtest to qualify this item", checked: false },
    ];
  }

  const rr = plan.stopLoss > 0 ? +(plan.takeProfit / plan.stopLoss).toFixed(1) : 0;
  const regimeOk = setup.regime.favouredStyles.some(s => s.toLowerCase().includes(setup.type.replace("_", " ")));

  return [
    {
      key: "defined",
      label: "Setup clearly defined with entry, stop, target",
      grade: plan.stopLoss > 0 && plan.takeProfit > 0 ? "green" : "amber",
      feedback: plan.stopLoss > 0
        ? `Stop ${plan.stopLoss}%, target ${plan.takeProfit}%, hold ${plan.maxHold}d — parameters locked from backtest`
        : "Stop loss or target not defined",
      checked: plan.stopLoss > 0 && plan.takeProfit > 0,
    },
    {
      key: "regime",
      label: "Current regime supports this setup type",
      grade: regimeOk ? "green" : "amber",
      feedback: regimeOk
        ? `${setup.regime.trendLabel}, ${setup.regime.volatilityLabel} — compatible with ${setup.typeLabel}`
        : `Current regime favours ${setup.regime.favouredStyles.join(", ")} — this ${setup.typeLabel} setup may face headwinds`,
      checked: regimeOk,
    },
    {
      key: "event",
      label: "Event risk is acceptable",
      grade: setup.regime.eventRisk === "none" || setup.regime.eventRisk === "low" ? "green" : setup.regime.eventRisk === "medium" ? "amber" : "red",
      feedback: setup.regime.eventRisk === "high"
        ? `High-impact event imminent — ${setup.regime.upcomingEvents[0]?.title ?? "check calendar"}. Consider waiting.`
        : setup.regime.eventRisk === "medium"
          ? `Event within 24h — be aware of ${setup.regime.upcomingEvents[0]?.title ?? "upcoming event"}`
          : "No imminent event risk",
      checked: setup.regime.eventRisk !== "high",
    },
    {
      key: "rr",
      label: "Risk/reward ratio is acceptable",
      grade: rr >= 2 ? "green" : rr >= 1.5 ? "amber" : "red",
      feedback: rr >= 2
        ? `${rr}:1 R:R — strong. ${plan.winRate}% win rate across ${plan.scenarioCount} scenarios, ${plan.profitFactor}:1 profit factor`
        : rr >= 1.5
          ? `${rr}:1 R:R — acceptable but tight. Consider widening target or tightening stop`
          : `${rr}:1 R:R — poor. You risk more than you stand to gain. Adjust parameters.`,
      checked: rr >= 1.5,
    },
    {
      key: "invalidation",
      label: "Invalidation condition is defined",
      grade: "green",
      feedback: `If price moves ${plan.stopLoss}% against you, the thesis is invalidated. Average losing scenario lasted ${plan.avgDaysHeld}d.`,
      checked: true,
    },
  ];
}

const GRADE_COLORS: Record<Grade, string> = {
  green: "var(--green)", amber: "var(--amber)", red: "var(--red)", none: "var(--text-muted)",
};

const GRADE_BG: Record<Grade, string> = {
  green: "var(--green-soft)", amber: "var(--amber-soft)", red: "var(--red-soft)", none: "var(--surface-hover)",
};

/* ================================================================
   Page component
   ================================================================ */

export default function SetupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [instrument, setInstrument] = useState<InstrumentSummary | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [planned, setPlanned] = useState(false);
  const [finalisedPlan, setFinalisedPlan] = useState<FinalisedPlan | null>(null);
  const [checkOverrides, setCheckOverrides] = useState<Record<string, boolean>>({});
  const [tradeNotes, setTradeNotes] = useState("");
  const [implemented, setImplemented] = useState(false);

  useEffect(() => {
    if (!id) return;
    const parts = (id as string).split("-");
    const symbol = parts.slice(2).join("-");
    const symbolParam = symbol ? `?symbols=${encodeURIComponent(symbol)}` : "";

    fetch(`/api/mission-control${symbolParam}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.instruments) { setLoading(false); return; }
        for (const inst of data.instruments) {
          const found = inst.setups.find((s: Setup) => s.id === id) ?? inst.setups.find((s: Setup) => s.symbol === symbol);
          if (found) { setInstrument(inst); setSetup(found); break; }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handlePlanTrade() {
    if (!setup || !instrument || !finalisedPlan) return;
    addJournalEntry({
      symbol: setup.symbol, assetName: instrument.name,
      direction: setup.direction === "short" ? "short" : "long",
      setupType: setup.type, thesis: setup.thesis, catalyst: setup.catalyst,
      entryPrice: instrument.currentPrice, entryTime: new Date().toISOString(),
      preTradeNotes: `Setup: ${setup.label}. Stop ${finalisedPlan.stopLoss}%, Target ${finalisedPlan.takeProfit}%, Hold ${finalisedPlan.maxHold}d. Win rate: ${finalisedPlan.winRate}% across ${finalisedPlan.scenarioCount} scenarios.${tradeNotes ? " Notes: " + tradeNotes : ""}`,
      status: implemented ? "open" : "planned",
      tags: [setup.type, setup.symbol.toLowerCase(), ...(implemented ? ["implemented"] : [])],
    });
    setPlanned(true);
  }

  const checkItems = gradeSetup(finalisedPlan, setup);
  const allChecked = checkItems.every(item => {
    const override = checkOverrides[item.key];
    return override !== undefined ? override : item.checked;
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-20 rounded-lg skeleton" />
        <div className="h-8 w-48 rounded-lg skeleton" />
        <div className="card space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-5 rounded-lg skeleton" />)}</div>
      </div>
    );
  }

  if (!setup || !instrument) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="caption" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>
        <div className="card mt-4">
          <p className="body-text">Setup not found or expired.</p>
          <Link href="/dashboard" className="micro mt-2 inline-block" style={{ color: "var(--accent)" }}>Return to dashboard</Link>
        </div>
      </div>
    );
  }

  const isLong = setup.direction === "long";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard" className="caption inline-block" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title">{instrument.name}</h1>
            <span className="pill" style={{ background: isLong ? "var(--green-soft)" : "var(--red-soft)", color: isLong ? "var(--green)" : "var(--red)" }}>
              {isLong ? "Long" : "Short"}
            </span>
          </div>
          <p className="caption">{setup.typeLabel} · {setup.confidence}% confidence</p>
        </div>
        <p className="stat-large">{fp(instrument.currentPrice)}</p>
      </div>

      {/* Regime */}
      <div className="card">
        <p className="section-label mb-3">Market regime</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="pill" style={{ background: "var(--surface-hover)", color: setup.regime.trend.includes("up") ? "var(--green)" : setup.regime.trend.includes("down") ? "var(--red)" : "var(--text-muted)" }}>{setup.regime.trendLabel}</span>
          <span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>{setup.regime.volatilityLabel}</span>
          <span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>{setup.regime.sessionLabel}</span>
        </div>
        {setup.regime.favouredStyles.length > 0 && <p className="caption">Favoured: <span style={{ color: "var(--green)" }}>{setup.regime.favouredStyles.join(", ")}</span></p>}
      </div>

      {/* Setup thesis */}
      <div className="card">
        <p className="section-label mb-2">Setup</p>
        <p className="text-base font-medium mb-2" style={{ color: "var(--text)" }}>{setup.label}</p>
        <p className="body-text">{setup.thesis}</p>
        {setup.catalyst && <p className="caption mt-2">Catalyst: {setup.catalyst}</p>}
        {setup.sentiment && (
          <div className="flex items-center gap-2 mt-3">
            <span className="pill" style={{
              background: setup.sentiment.score > 15 ? "var(--green-soft)" : setup.sentiment.score < -15 ? "var(--red-soft)" : "var(--surface-hover)",
              color: setup.sentiment.score > 15 ? "var(--green)" : setup.sentiment.score < -15 ? "var(--red)" : "var(--text-muted)",
            }}>{setup.sentiment.label}</span>
            <span className="micro">{setup.sentiment.alignmentLabel}</span>
          </div>
        )}
      </div>

      {/* Trade plan spec */}
      <div className="card">
        <p className="section-label mb-3">Trade plan</p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="caption">Direction</span><span className="text-sm font-semibold" style={{ color: isLong ? "var(--green)" : "var(--red)" }}>{isLong ? "LONG" : "SHORT"}</span></div>
          <div className="flex justify-between"><span className="caption">Entry</span><span className="text-sm font-medium" style={{ color: "var(--text)" }}>{setup.entryCondition}</span></div>
          <div className="flex justify-between"><span className="caption">Stop loss</span><span className="text-sm font-medium" style={{ color: "var(--red)" }}>{finalisedPlan ? `${finalisedPlan.stopLoss}%` : setup.stopLoss}</span></div>
          <div className="flex justify-between"><span className="caption">Target</span><span className="text-sm font-medium" style={{ color: "var(--green)" }}>{finalisedPlan ? `${finalisedPlan.takeProfit}%` : setup.target}</span></div>
          <div className="flex justify-between"><span className="caption">Hold</span><span className="text-sm font-medium" style={{ color: "var(--text)" }}>{finalisedPlan ? `${finalisedPlan.maxHold} days` : setup.holdPeriod}</span></div>
        </div>
      </div>

      {/* Backtest */}
      <BacktestPanel symbol={setup.symbol} direction={isLong ? "long" : "short"} setupType={setup.type} onFinalise={setFinalisedPlan} />

      {/* Finalised trade plan detail */}
      {finalisedPlan && (
        <div className="card" style={{ background: "var(--accent-soft)" }}>
          <p className="section-label mb-3" style={{ color: "var(--accent)" }}>Finalised trade plan</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="caption">Stop loss</span><p className="font-semibold" style={{ color: "var(--red)" }}>{finalisedPlan.stopLoss}%</p></div>
            <div><span className="caption">Target</span><p className="font-semibold" style={{ color: "var(--green)" }}>{finalisedPlan.takeProfit}%</p></div>
            <div><span className="caption">Max hold</span><p className="font-semibold" style={{ color: "var(--text)" }}>{finalisedPlan.maxHold} days</p></div>
            <div><span className="caption">Win rate</span><p className="font-semibold" style={{ color: "var(--green)" }}>{finalisedPlan.winRate}%</p></div>
            <div><span className="caption">Scenarios tested</span><p className="font-semibold" style={{ color: "var(--text)" }}>{finalisedPlan.scenarioCount}</p></div>
            <div><span className="caption">Profit factor</span><p className="font-semibold" style={{ color: "var(--text)" }}>{finalisedPlan.profitFactor}:1</p></div>
            <div><span className="caption">Avg return</span><p className="font-semibold" style={{ color: finalisedPlan.avgReturn >= 0 ? "var(--green)" : "var(--red)" }}>{finalisedPlan.avgReturn > 0 ? "+" : ""}{finalisedPlan.avgReturn}%</p></div>
            <div><span className="caption">Avg hold</span><p className="font-semibold" style={{ color: "var(--text)" }}>{finalisedPlan.avgDaysHeld}d</p></div>
          </div>
        </div>
      )}

      {/* Smart pre-trade checklist */}
      <div className="card">
        <p className="section-label mb-3">Pre-trade checklist</p>
        {!finalisedPlan && (
          <p className="caption mb-3" style={{ color: "var(--amber)" }}>Finalise the backtest above to auto-qualify each item</p>
        )}
        <div className="space-y-3">
          {checkItems.map(item => {
            const isChecked = checkOverrides[item.key] !== undefined ? checkOverrides[item.key] : item.checked;
            return (
              <div key={item.key}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={isChecked}
                    onChange={() => setCheckOverrides(prev => ({ ...prev, [item.key]: !isChecked }))}
                    className="rounded w-4 h-4 mt-0.5 shrink-0" style={{ accentColor: "var(--accent)" }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: isChecked ? "var(--text)" : "var(--text-muted)" }}>{item.label}</span>
                      {finalisedPlan && (
                        <span className="pill" style={{ background: GRADE_BG[item.grade], color: GRADE_COLORS[item.grade], fontSize: 9, padding: "1px 6px" }}>
                          {item.grade}
                        </span>
                      )}
                    </div>
                    {finalisedPlan && (
                      <p className="micro mt-0.5" style={{ color: GRADE_COLORS[item.grade] }}>{item.feedback}</p>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add to journal */}
      {!planned ? (
        <div className="card space-y-3">
          <p className="section-label">Add to journal</p>
          {!finalisedPlan && <p className="caption" style={{ color: "var(--amber)" }}>Finalise the backtest and complete the checklist first</p>}

          <textarea
            placeholder="Trade notes (optional) — rationale, context, anything you want to remember..."
            value={tradeNotes} onChange={e => setTradeNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ background: "var(--surface-hover)", color: "var(--text)" }}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={implemented} onChange={() => setImplemented(!implemented)}
              className="rounded" style={{ accentColor: "var(--accent)" }} />
            <span className="caption" style={{ color: "var(--text-secondary)" }}>I have placed this trade (mark as implemented)</span>
          </label>

          <div className="flex gap-3">
            <button onClick={handlePlanTrade} disabled={!allChecked || !finalisedPlan}
              className="flex-1 py-3 text-sm font-semibold transition-opacity" style={{
                borderRadius: "var(--radius)", opacity: allChecked && finalisedPlan ? 1 : 0.4,
                background: allChecked && finalisedPlan ? "var(--accent)" : "var(--surface-hover)",
                color: allChecked && finalisedPlan ? "white" : "var(--text-muted)",
                cursor: allChecked && finalisedPlan ? "pointer" : "not-allowed",
              }}>
              {!finalisedPlan ? "Finalise backtest first" : !allChecked ? "Complete checklist" : implemented ? "Log implemented trade" : "Log trade plan"}
            </button>
            <button disabled className="py-3 px-4 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-muted)", opacity: 0.5, cursor: "not-allowed" }}
              title="Broker integration coming soon">
              Execute via broker
            </button>
          </div>
        </div>
      ) : (
        <div className="card text-center space-y-2">
          <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
            {implemented ? "Trade logged as implemented" : "Trade plan logged to journal"}
          </p>
          <p className="micro">Stop {finalisedPlan?.stopLoss}% · Target {finalisedPlan?.takeProfit}% · Hold {finalisedPlan?.maxHold}d · {finalisedPlan?.winRate}% win rate</p>
          <Link href="/journal" className="micro inline-block mt-1" style={{ color: "var(--accent)" }}>View in journal →</Link>
        </div>
      )}
    </div>
  );
}
