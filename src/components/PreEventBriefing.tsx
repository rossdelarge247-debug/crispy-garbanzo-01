"use client";

/**
 * Pre-Event Briefing — AI-generated scenario analysis with positioning context.
 * The feature that makes this worth paying for.
 */

import { useState, useEffect } from "react";

interface Scenario { title: string; probability: number; condition: string; tradeAction: string; entry: string; risk: string; }
interface Positioning { asset: string; assetName: string; preEventDrift: number; driftDirection: string; percentile: number; crowded: boolean; implication: string; }
interface Briefing { context: string; scenarios: Scenario[]; keyRisk: string; source: "ai" | "rules"; }
interface IntelData { positioning: Positioning | null; briefing: Briefing; playbookStats: { beats: number; misses: number; total: number; beatWinRate: number } | null; socialSummary: string | null; }

export default function PreEventBriefing({ eventId }: { eventId: string }) {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/event-intel?id=${eventId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="card space-y-3">
        <p className="section-label">Pre-event intelligence</p>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }} /><span className="caption">Generating intelligence briefing...</span></div>
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg skeleton" />)}
      </div>
    );
  }

  if (!data?.briefing) return null;

  const { positioning: pos, briefing, playbookStats: stats } = data;

  return (
    <div className="space-y-4">
      {/* Positioning detector */}
      {pos && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Positioning</p>
            {pos.crowded && <span className="pill" style={{ background: "var(--amber-soft)", color: "var(--amber)", fontSize: 9 }}>Crowded</span>}
          </div>
          <div className="flex gap-4 mb-2">
            <div>
              <p className="micro">5-day drift</p>
              <p className="stat-medium" style={{ color: pos.preEventDrift > 0 ? "var(--green)" : pos.preEventDrift < 0 ? "var(--red)" : "var(--text-muted)" }}>
                {pos.preEventDrift > 0 ? "+" : ""}{pos.preEventDrift}%
              </p>
            </div>
            <div>
              <p className="micro">Percentile</p>
              <p className="stat-medium" style={{ color: pos.percentile > 70 || pos.percentile < 30 ? "var(--amber)" : "var(--text)" }}>{pos.percentile}th</p>
            </div>
            <div>
              <p className="micro">Direction</p>
              <p className="stat-medium" style={{ color: pos.driftDirection === "bullish" ? "var(--green)" : pos.driftDirection === "bearish" ? "var(--red)" : "var(--text-muted)" }}>
                {pos.driftDirection}
              </p>
            </div>
          </div>
          <p className="caption">{pos.implication}</p>
        </div>
      )}

      {/* AI Briefing */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <p className="section-label">Pre-event briefing</p>
          {briefing.source === "ai" && <span className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: 9 }}>AI</span>}
        </div>

        <p className="body-text mb-4">{briefing.context}</p>

        {/* Scenarios */}
        <div className="space-y-3">
          {briefing.scenarios.map((sc, i) => {
            const barColor = sc.probability >= 40 ? "var(--green)" : sc.probability >= 25 ? "var(--amber)" : "var(--text-muted)";
            return (
              <div key={i} className="rounded-lg py-3 px-3" style={{ background: "var(--surface-hover)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{sc.title}</p>
                  <span className="stat-medium" style={{ color: barColor }}>{sc.probability}%</span>
                </div>
                <p className="micro mb-1" style={{ color: "var(--text-muted)" }}>If: {sc.condition}</p>
                <p className="caption font-medium mb-1" style={{ color: "var(--accent)" }}>{sc.tradeAction}</p>
                <div className="flex gap-4">
                  <span className="micro">Entry: <span style={{ color: "var(--text-secondary)" }}>{sc.entry}</span></span>
                  <span className="micro">Risk: <span style={{ color: "var(--red)" }}>{sc.risk}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key risk */}
        <div className="mt-3 rounded-lg py-2 px-3" style={{ background: "var(--red-soft)" }}>
          <p className="micro font-semibold" style={{ color: "var(--red)" }}>Key risk</p>
          <p className="caption">{briefing.keyRisk}</p>
        </div>
      </div>

      {/* Quick stats from playbook */}
      {stats && stats.total > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 card text-center py-3">
            <p className="stat-medium" style={{ color: "var(--green)" }}>{stats.beats}/{stats.total}</p>
            <p className="micro">Historical beats</p>
          </div>
          <div className="flex-1 card text-center py-3">
            <p className="stat-medium" style={{ color: stats.beatWinRate >= 60 ? "var(--green)" : "var(--amber)" }}>{stats.beatWinRate}%</p>
            <p className="micro">Beat win rate</p>
          </div>
          <div className="flex-1 card text-center py-3">
            <p className="stat-medium" style={{ color: "var(--red)" }}>{stats.misses}/{stats.total}</p>
            <p className="micro">Historical misses</p>
          </div>
        </div>
      )}
    </div>
  );
}
