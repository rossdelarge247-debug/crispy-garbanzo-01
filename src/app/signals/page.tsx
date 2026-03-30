"use client";

/**
 * Signals — transparent view of what the system sees.
 *
 * No black box. Shows the component signals, factor scores, and
 * regime classification for each watched instrument.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MissionControlData, InstrumentSummary } from "@/types/mission-control";
import type { SignalProfile } from "@/services/signal-profile";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(Math.abs(value) / max * 100, 100);
  const isNeg = value < 0;
  return (
    <div className="flex items-center gap-2 h-3">
      <div className="flex-1 bg-[--surface-overlay] rounded-full h-1.5 relative overflow-hidden">
        {isNeg ? (
          <div className={`absolute right-1/2 h-full rounded-full ${color}`} style={{ width: `${pct / 2}%` }} />
        ) : (
          <div className={`absolute left-1/2 h-full rounded-full ${color}`} style={{ width: `${pct / 2}%` }} />
        )}
      </div>
    </div>
  );
}

function SignalRow({ label, value, unit, max, color }: { label: string; value: number; unit: string; max: number; color?: string }) {
  const c = color ?? (value > 0 ? "bg-[--green]" : value < 0 ? "bg-[--red]" : "bg-[--text-muted]");
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-2xs text-[--text-muted] w-28 shrink-0">{label}</span>
      <div className="flex-1"><Bar value={value} max={max} color={c} /></div>
      <span className={`text-2xs font-bold tabular-nums w-16 text-right ${value > 0 ? "text-[--green]" : value < 0 ? "text-[--red]" : "text-[--text-muted]"}`}>
        {value > 0 ? "+" : ""}{value.toFixed(unit === "%" ? 1 : 2)}{unit}
      </span>
    </div>
  );
}

function InstrumentSignals({ inst }: { inst: InstrumentSummary }) {
  const p = inst.regime.signalProfile;
  if (!p) return <p className="text-2xs text-[--text-muted]">Insufficient data for signal computation</p>;

  return (
    <div className="space-y-1">
      {/* Momentum */}
      <p className="text-2xs font-semibold text-[--text-muted] pt-1">Momentum</p>
      <SignalRow label="7-day return" value={p.return7d} unit="%" max={15} />
      <SignalRow label="14-day return" value={p.return14d} unit="%" max={20} />
      <SignalRow label="30-day return" value={p.return30d} unit="%" max={30} />

      {/* Trend */}
      <p className="text-2xs font-semibold text-[--text-muted] pt-2">Trend</p>
      <SignalRow label="Trend alignment" value={p.trendAlignment} unit="" max={1} color="bg-[--accent]" />

      {/* Volatility */}
      <p className="text-2xs font-semibold text-[--text-muted] pt-2">Volatility</p>
      <SignalRow label="Vol ratio (vs baseline)" value={p.volatilityRatio - 1} unit="x" max={2} color={p.volatilityRatio > 1.5 ? "bg-[--red]" : "bg-[--text-muted]"} />
      <SignalRow label="Realised vol (ann.)" value={p.realisedVol} unit="%" max={100} color="bg-[--text-muted]" />

      {/* Position */}
      <p className="text-2xs font-semibold text-[--text-muted] pt-2">Position</p>
      <SignalRow label="From 30d high" value={p.distFromHigh30d} unit="%" max={20} />
      <SignalRow label="From 30d low" value={p.distFromLow30d} unit="%" max={30} />

      {/* Volume */}
      <p className="text-2xs font-semibold text-[--text-muted] pt-2">Volume</p>
      <SignalRow label="Volume ratio" value={p.volumeRatio - 1} unit="x" max={2} color={p.volumeRatio > 1.3 ? "bg-[--green]" : "bg-[--text-muted]"} />
    </div>
  );
}

export default function SignalsPage() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mission-control")
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[--text-primary]">Signals</h1>
        <Link href="/dashboard" className="text-xs text-[--text-muted]">&larr; Dashboard</Link>
      </div>
      <p className="text-xs text-[--text-secondary]">What the system sees. No black box — every component signal that drives regime classification and setup detection.</p>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[--surface-raised] rounded-lg animate-pulse" />)}
        </div>
      )}

      {!loading && data && data.instruments.map(inst => (
        <div key={inst.symbol} className="rounded-lg bg-[--surface-raised] p-3">
          <button
            onClick={() => setExpanded(expanded === inst.symbol ? null : inst.symbol)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <span className="text-sm font-bold text-[--text-primary]">{inst.name}</span>
              <span className="text-2xs text-[--text-muted] ml-2">{inst.regime.regimeSummary}</span>
            </div>
            <span className="text-xs text-[--text-muted]">{expanded === inst.symbol ? "▴" : "▾"}</span>
          </button>

          {expanded === inst.symbol && (
            <div className="mt-3">
              {/* Regime classification */}
              <div className="flex flex-wrap gap-1.5 text-2xs mb-3">
                <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-secondary]">Trend: {inst.regime.trendLabel}</span>
                <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-secondary]">Vol: {inst.regime.volatilityLabel}</span>
                <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-secondary]">Session: {inst.regime.sessionLabel}</span>
                <span className="px-1.5 py-0.5 rounded bg-[--surface-overlay] font-medium text-[--text-secondary]">Event risk: {inst.regime.eventRisk}</span>
              </div>

              {/* Raw signals */}
              <InstrumentSignals inst={inst} />

              {/* Raw regime numbers */}
              <div className="mt-3 pt-2 text-2xs text-[--text-muted] space-y-0.5">
                <p>Trend slope: {inst.regime.raw.trendSlope}</p>
                <p>Vol ratio: {inst.regime.raw.volatilityRatio}</p>
                <p>Momentum score: {inst.regime.raw.momentumScore}</p>
                <p>Confidence: {inst.regime.raw.confidence}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
