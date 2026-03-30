"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { InstrumentSummary, Setup } from "@/types/mission-control";
import { addJournalEntry } from "@/lib/journal";

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export default function SetupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [instrument, setInstrument] = useState<InstrumentSummary | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [planned, setPlanned] = useState(false);

  // Pre-trade checklist
  const [checklist, setChecklist] = useState({
    definedSetup: false,
    regimeCompatible: false,
    eventRiskOk: false,
    riskRewardOk: false,
    invalidationDefined: false,
  });

  useEffect(() => {
    fetch("/api/mission-control")
      .then(r => r.json())
      .then(data => {
        for (const inst of data.instruments) {
          const found = inst.setups.find((s: Setup) => s.id === id);
          if (found) { setInstrument(inst); setSetup(found); break; }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handlePlanTrade() {
    if (!setup || !instrument) return;
    addJournalEntry({
      symbol: setup.symbol,
      assetName: instrument.name,
      direction: setup.direction === "short" ? "short" : "long",
      setupType: setup.type,
      thesis: setup.thesis,
      catalyst: setup.catalyst,
      entryPrice: instrument.currentPrice,
      entryTime: new Date().toISOString(),
      preTradeNotes: `Setup: ${setup.label}. ${setup.thesis}`,
      status: "planned",
      tags: [setup.type, setup.symbol.toLowerCase()],
    });
    setPlanned(true);
  }

  const allChecked = Object.values(checklist).every(Boolean);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-4 w-20 bg-[--surface-overlay] rounded animate-pulse" />
        <div className="h-6 w-48 bg-[--surface-overlay] rounded animate-pulse" />
        <div className="h-40 bg-[--surface-raised] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!setup || !instrument) {
    return (
      <div className="max-w-2xl">
        <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text-primary] mb-4 inline-block">&larr; Back</Link>
        <p className="text-sm text-[--text-secondary]">Setup not found or expired.</p>
      </div>
    );
  }

  const regime = setup.regime;
  const dirColor = setup.direction === "long" ? "text-[--green]" : "text-[--red]";
  const dirBg = setup.direction === "long" ? "bg-[--green-bg]" : "bg-[--red-bg]";

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text-primary] inline-block">&larr; Back</Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-bold text-[--text-primary]">{instrument.name}</h1>
          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${dirBg} ${dirColor}`}>
            {setup.direction === "long" ? "Long" : "Short"}
          </span>
          <span className="text-xs font-bold tabular-nums text-[--text-primary] ml-auto">{fp(instrument.currentPrice)}</span>
        </div>
        <p className="text-2xs text-[--text-muted]">{setup.typeLabel} · {setup.confidence}% confidence</p>
      </div>

      {/* Regime context */}
      <div className="rounded-lg bg-[--surface-raised] p-3">
        <p className="text-2xs font-semibold text-[--text-muted] mb-1.5">Market regime</p>
        <div className="flex flex-wrap gap-1.5 text-2xs mb-2">
          <span className={`px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium ${regime.trend.includes("up") ? "text-[--green]" : regime.trend.includes("down") ? "text-[--red]" : "text-[--text-muted]"}`}>{regime.trendLabel}</span>
          <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-muted]">{regime.volatilityLabel}</span>
          <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-muted]">{regime.sessionLabel}</span>
        </div>
        {regime.favouredStyles.length > 0 && (
          <p className="text-2xs text-[--text-muted]">Favoured: <span className="text-[--green]">{regime.favouredStyles.join(", ")}</span></p>
        )}
        {regime.avoidStyles.length > 0 && (
          <p className="text-2xs text-[--text-muted]">Avoid: <span className="text-[--red]">{regime.avoidStyles.join(", ")}</span></p>
        )}
      </div>

      {/* Setup thesis */}
      <div className="rounded-lg bg-[--surface-raised] p-3">
        <p className="text-2xs font-semibold text-[--text-muted] mb-1">Setup</p>
        <p className="text-sm font-semibold text-[--text-primary] mb-1">{setup.label}</p>
        <p className="text-xs text-[--text-secondary] leading-relaxed">{setup.thesis}</p>
        {setup.catalyst && <p className="text-2xs text-[--text-muted] mt-1">Catalyst: {setup.catalyst}</p>}
      </div>

      {/* Trade spec */}
      <div className="rounded-lg bg-[--surface-raised] p-3">
        <p className="text-2xs font-semibold text-[--text-muted] mb-2">Trade plan</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-[--text-muted]">Direction</span><span className={`font-bold ${dirColor}`}>{setup.direction === "long" ? "LONG" : "SHORT"}</span></div>
          <div className="flex justify-between"><span className="text-[--text-muted]">Entry</span><span className="font-medium text-[--text-primary]">{setup.entryCondition}</span></div>
          <div className="flex justify-between"><span className="text-[--text-muted]">Stop loss</span><span className="font-medium text-[--red]">{setup.stopLoss}</span></div>
          <div className="flex justify-between"><span className="text-[--text-muted]">Target</span><span className="font-medium text-[--green]">{setup.target}</span></div>
          <div className="flex justify-between"><span className="text-[--text-muted]">Hold period</span><span className="font-medium text-[--text-primary]">{setup.holdPeriod}</span></div>
        </div>
      </div>

      {/* Pre-trade checklist */}
      <div className="rounded-lg bg-[--surface-raised] p-3">
        <p className="text-2xs font-semibold text-[--text-muted] mb-2">Pre-trade checklist</p>
        <div className="space-y-2">
          {[
            { key: "definedSetup" as const, label: "Setup is clearly defined with entry, stop, and target" },
            { key: "regimeCompatible" as const, label: "Current regime supports this setup type" },
            { key: "eventRiskOk" as const, label: "Event risk is acceptable" },
            { key: "riskRewardOk" as const, label: "Risk/reward ratio is acceptable" },
            { key: "invalidationDefined" as const, label: "I know what invalidates this thesis" },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className="rounded accent-[--accent]"
              />
              <span className={`text-xs ${checklist[item.key] ? "text-[--text-primary]" : "text-[--text-muted]"}`}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!planned ? (
          <button
            onClick={handlePlanTrade}
            disabled={!allChecked}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded transition-opacity ${
              allChecked
                ? "bg-[--accent] text-white hover:opacity-90"
                : "bg-[--surface-overlay] text-[--text-muted] cursor-not-allowed"
            }`}
          >
            {allChecked ? "Log this trade plan" : "Complete checklist first"}
          </button>
        ) : (
          <span className="flex-1 px-3 py-2.5 text-xs font-semibold rounded bg-[--green-bg] text-[--green] text-center">
            Trade planned — logged to journal
          </span>
        )}
        <Link
          href="/journal"
          className="px-3 py-2.5 text-xs font-semibold rounded bg-[--surface-raised] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
        >
          Journal
        </Link>
      </div>

      {/* Upcoming events for this instrument */}
      {regime.upcomingEvents.length > 0 && (
        <div>
          <p className="text-2xs font-semibold text-[--text-muted] mb-1">Upcoming events</p>
          {regime.upcomingEvents.map((e, i) => (
            <p key={i} className="text-2xs text-[--text-secondary]">{e.title} ({e.impact})</p>
          ))}
        </div>
      )}
    </div>
  );
}
