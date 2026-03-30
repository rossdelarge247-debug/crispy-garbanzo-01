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
  const [checklist, setChecklist] = useState({
    definedSetup: false, regimeCompatible: false, eventRiskOk: false, riskRewardOk: false, invalidationDefined: false,
  });

  useEffect(() => {
    if (!id) return;

    // Extract symbol from setup ID (format: setup-{type}-{symbol})
    const parts = (id as string).split("-");
    const symbol = parts.slice(2).join("-"); // handles BTC-USD, BZ=F etc

    // Fetch mission control data for just this symbol if possible
    const symbolParam = symbol ? `?symbols=${encodeURIComponent(symbol)}` : "";

    fetch(`/api/mission-control${symbolParam}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.instruments) { setLoading(false); return; }
        for (const inst of data.instruments) {
          // Try exact match first, then fuzzy match by symbol
          const found = inst.setups.find((s: Setup) => s.id === id) ??
                        inst.setups.find((s: Setup) => s.symbol === symbol);
          if (found) { setInstrument(inst); setSetup(found); break; }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handlePlanTrade() {
    if (!setup || !instrument) return;
    addJournalEntry({
      symbol: setup.symbol, assetName: instrument.name,
      direction: setup.direction === "short" ? "short" : "long",
      setupType: setup.type, thesis: setup.thesis, catalyst: setup.catalyst,
      entryPrice: instrument.currentPrice, entryTime: new Date().toISOString(),
      preTradeNotes: `Setup: ${setup.label}. ${setup.thesis}`,
      status: "planned", tags: [setup.type, setup.symbol.toLowerCase()],
    });
    setPlanned(true);
  }

  const allChecked = Object.values(checklist).every(Boolean);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-20 rounded-lg skeleton" />
        <div className="h-8 w-48 rounded-lg skeleton" />
        <div className="card space-y-3">
          <div className="h-5 w-40 rounded-lg skeleton" />
          <div className="h-4 w-full rounded-lg skeleton" />
          <div className="h-4 w-3/4 rounded-lg skeleton" />
        </div>
        <div className="card space-y-3">
          <div className="h-5 w-32 rounded-lg skeleton" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 rounded-lg skeleton" />
            <div className="h-10 flex-1 rounded-lg skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!setup || !instrument) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="caption" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>
        <div className="card mt-4">
          <p className="body-text">Setup not found or expired. Setups refresh every 10 minutes.</p>
          <Link href="/dashboard" className="micro mt-2 inline-block" style={{ color: "var(--accent)" }}>Return to Mission Control</Link>
        </div>
      </div>
    );
  }

  const regime = setup.regime;
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
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="pill" style={{ background: "var(--surface-hover)", color: regime.trend.includes("up") ? "var(--green)" : regime.trend.includes("down") ? "var(--red)" : "var(--text-muted)" }}>{regime.trendLabel}</span>
          <span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>{regime.volatilityLabel}</span>
          <span className="pill" style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}>{regime.sessionLabel}</span>
        </div>
        {regime.favouredStyles.length > 0 && <p className="caption">Favoured: <span style={{ color: "var(--green)" }}>{regime.favouredStyles.join(", ")}</span></p>}
      </div>

      {/* Thesis */}
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

      {/* Trade spec */}
      <div className="card">
        <p className="section-label mb-3">Trade plan</p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="caption">Direction</span><span className="text-sm font-semibold" style={{ color: isLong ? "var(--green)" : "var(--red)" }}>{isLong ? "LONG" : "SHORT"}</span></div>
          <div className="flex justify-between"><span className="caption">Entry</span><span className="text-sm font-medium" style={{ color: "var(--text)" }}>{setup.entryCondition}</span></div>
          <div className="flex justify-between"><span className="caption">Stop loss</span><span className="text-sm font-medium" style={{ color: "var(--red)" }}>{setup.stopLoss}</span></div>
          <div className="flex justify-between"><span className="caption">Target</span><span className="text-sm font-medium" style={{ color: "var(--green)" }}>{setup.target}</span></div>
          <div className="flex justify-between"><span className="caption">Hold</span><span className="text-sm font-medium" style={{ color: "var(--text)" }}>{setup.holdPeriod}</span></div>
        </div>
      </div>

      {/* Pre-trade checklist */}
      <div className="card">
        <p className="section-label mb-3">Pre-trade checklist</p>
        <div className="space-y-3">
          {[
            { key: "definedSetup" as const, label: "Setup is clearly defined with entry, stop, and target" },
            { key: "regimeCompatible" as const, label: "Current regime supports this setup type" },
            { key: "eventRiskOk" as const, label: "Event risk is acceptable" },
            { key: "riskRewardOk" as const, label: "Risk/reward ratio is acceptable" },
            { key: "invalidationDefined" as const, label: "I know what invalidates this thesis" },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={checklist[item.key]}
                onChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className="rounded w-4 h-4" style={{ accentColor: "var(--accent)" }} />
              <span className="text-sm" style={{ color: checklist[item.key] ? "var(--text)" : "var(--text-muted)" }}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!planned ? (
          <button onClick={handlePlanTrade} disabled={!allChecked}
            className="flex-1 py-3 text-sm font-semibold transition-opacity" style={{
              borderRadius: "var(--radius)", opacity: allChecked ? 1 : 0.4,
              background: allChecked ? "var(--accent)" : "var(--surface-hover)",
              color: allChecked ? "white" : "var(--text-muted)", cursor: allChecked ? "pointer" : "not-allowed",
            }}>
            {allChecked ? "Log this trade plan" : "Complete checklist first"}
          </button>
        ) : (
          <span className="flex-1 py-3 text-sm font-semibold text-center" style={{ borderRadius: "var(--radius)", background: "var(--green-soft)", color: "var(--green)" }}>
            Trade planned — logged to journal
          </span>
        )}
        <Link href="/journal" className="py-3 px-5 text-sm font-semibold text-center" style={{ borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--text-secondary)" }}>
          Journal
        </Link>
      </div>
    </div>
  );
}
