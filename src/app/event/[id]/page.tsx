"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { MacroEvent, MacroTrade } from "@/types/macro-trader";
import { formatCurrencyPrice, getCurrencySymbol } from "@/lib/currency";
import { addJournalEntry } from "@/lib/journal";
import CandlestickChart from "@/components/CandlestickChart";
import EventPlaybook from "@/components/EventPlaybook";
import PreEventBriefing from "@/components/PreEventBriefing";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<MacroEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [_unused, _setUnused] = useState(null); // placeholder
  const [logged, setLogged] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);

  useEffect(() => {
    fetch("/api/macro-calendar?days=30")
      .then(r => r.json())
      .then(data => {
        const found = data.events?.find((e: MacroEvent) => e.id === id);
        setEvent(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handleLog() {
    if (!event) return;
    const a = event.affectedAssets[activeAssetIdx];
    addJournalEntry({
      symbol: a?.symbol ?? "", assetName: a?.name ?? event.title,
      direction: a?.direction === "short" ? "short" : "long",
      setupType: `event_${event.category}`,
      thesis: `${event.title}: ${a?.reasoning ?? ""}`,
      catalyst: event.title,
      entryPrice: 0, entryTime: event.date,
      preTradeNotes: `Event: ${event.title}. Forecast: ${event.forecast ?? "n/a"}. ${notes}`,
      status: "planned",
      tags: [event.category, (a?.symbol ?? "").toLowerCase(), "macro"],
    });
    setLogged(true);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-16 rounded-lg skeleton" />
        <div className="h-8 w-64 rounded-lg skeleton" />
        {[1, 2, 3].map(i => <div key={i} className="card space-y-3"><div className="h-5 rounded-lg skeleton" /><div className="h-4 w-3/4 rounded-lg skeleton" /></div>)}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="caption" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>
        <div className="card mt-4"><p className="body-text">Event not found.</p></div>
      </div>
    );
  }

  const activeAsset = event.affectedAssets[activeAssetIdx];
  const trade = event.topTrade;
  const cur = activeAsset ? getCurrencySymbol(activeAsset.symbol) : "$";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard" className="caption inline-block" style={{ color: "var(--text-muted)" }}>&larr; Back</Link>

      {/* Event header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="pill" style={{ background: event.dayLabel.includes("Today") ? "var(--accent-soft)" : "var(--surface-hover)", color: event.dayLabel.includes("Today") ? "var(--accent)" : "var(--text-muted)" }}>
            {event.dayLabel}
          </span>
          <span className="micro">{event.timeLabel}</span>
          <span className="micro">{event.country}</span>
          <span className="pill" style={{ background: event.impact === "high" ? "var(--red-soft)" : "var(--surface-hover)", color: event.impact === "high" ? "var(--red)" : "var(--text-muted)" }}>
            {event.impact} impact
          </span>
        </div>
        <h1 className="page-title">{event.title}</h1>
      </div>

      {/* Expectations */}
      <div className="card">
        <p className="section-label mb-2">Market expectations</p>
        <div className="flex gap-6 mb-3">
          {event.forecast && <div><p className="micro">Forecast</p><p className="stat-large" style={{ color: "var(--text)" }}>{event.forecast}</p></div>}
          {event.previous && <div><p className="micro">Previous</p><p className="stat-large" style={{ color: "var(--text-muted)" }}>{event.previous}</p></div>}
          {event.hoursUntil > 0 && <div className="ml-auto text-right"><p className="micro">Time until</p><p className="stat-large" style={{ color: "var(--accent)" }}>{event.hoursUntil < 24 ? `${Math.round(event.hoursUntil)}h` : `${Math.round(event.hoursUntil / 24)}d`}</p></div>}
        </div>
      </div>

      {/* Summary + Sentiment */}
      {(event.marketExpectation || event.sentimentContext) && (
        <div className="card">
          <p className="section-label mb-2">Analysis</p>
          {event.marketExpectation && <p className="body-text mb-2">{event.marketExpectation}</p>}
          {event.sentimentContext && (
            <div className="rounded-lg py-2 px-3" style={{ background: "var(--surface-hover)" }}>
              <p className="micro font-semibold mb-0.5" style={{ color: "var(--accent)" }}>Market intelligence</p>
              <p className="caption" style={{ fontStyle: "italic" }}>{event.sentimentContext}</p>
            </div>
          )}
        </div>
      )}

      {/* Pre-event intelligence: positioning + AI briefing + scenarios */}
      <PreEventBriefing eventId={event.id} />

      {/* Affected assets — ranked with tabs */}
      {event.affectedAssets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="section-label">Affected assets</p>
            <span className="micro" style={{ color: "var(--text-muted)" }}>Ranked by opportunity strength</span>
          </div>

          {/* Asset tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {event.affectedAssets.map((a, i) => (
              <button key={i} onClick={() => setActiveAssetIdx(i)}
                className="pill transition-colors shrink-0" style={{
                  background: i === activeAssetIdx ? "var(--accent)" : "var(--surface-hover)",
                  color: i === activeAssetIdx ? "white" : "var(--text-muted)",
                }}>
                {a.direction === "long" ? "↑" : "↓"} {a.name}
                {i === 0 && <span className="ml-1 opacity-70">★</span>}
              </button>
            ))}
          </div>

          {/* Active asset detail */}
          {activeAsset && (
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <span className="pill" style={{ background: activeAsset.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: activeAsset.direction === "long" ? "var(--green)" : "var(--red)" }}>
                  {activeAsset.direction === "long" ? "Long" : "Short"}
                </span>
                <span className="text-base font-medium" style={{ color: "var(--text)" }}>{activeAsset.name}</span>
                {activeAssetIdx === 0 && <span className="micro" style={{ color: "var(--accent)" }}>Top pick</span>}
              </div>
              <p className="body-text mb-3">{activeAsset.reasoning}</p>

              {/* Trade spec for this asset */}
              {trade && activeAssetIdx === 0 && (
                <div className="rounded-lg py-3 px-3 mb-3" style={{ background: "var(--surface-hover)" }}>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div><p className="stat-medium" style={{ color: "var(--text)" }}>{cur}{(trade.tradeAmount * trade.leverage * trade.takeProfitPercent / 100).toFixed(0)}</p><p className="micro">Max win</p></div>
                    <div><p className="stat-medium" style={{ color: "var(--red)" }}>{cur}{trade.maxLoss.toFixed(0)}</p><p className="micro">Max loss</p></div>
                    <div><p className="stat-medium" style={{ color: "var(--text)" }}>{trade.stopLossPercent}%</p><p className="micro">Stop</p></div>
                    <div><p className="stat-medium" style={{ color: "var(--text)" }}>{trade.takeProfitPercent}%</p><p className="micro">Target</p></div>
                    <div><p className="stat-medium" style={{ color: "var(--green)" }}>{trade.riskReward}:1</p><p className="micro">R:R</p></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Price chart for active asset */}
      {activeAsset && <CandlestickChart symbol={activeAsset.symbol} height={260} />}

      {/* Event Playbook — historical event reactions */}
      <EventPlaybook eventTitle={event.title} />

      {/* Journal CTA */}
      <div className="card space-y-3">
        <p className="section-label">Add to journal</p>
        <textarea
          placeholder="Your thesis, notes, what you're watching..."
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ background: "var(--surface-hover)", color: "var(--text)" }}
        />
        {!logged ? (
          <div className="flex gap-3">
            <button onClick={handleLog} className="flex-1 py-3 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "white" }}>
              Log trade plan
            </button>
            <button disabled className="py-3 px-4 text-sm font-semibold" style={{ borderRadius: "var(--radius)", background: "var(--surface-hover)", color: "var(--text-muted)", opacity: 0.5, cursor: "not-allowed" }}>
              Execute via broker
            </button>
          </div>
        ) : (
          <div className="text-center py-3 rounded-lg" style={{ background: "var(--green-soft)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>Logged to journal</p>
            <Link href="/journal" className="micro" style={{ color: "var(--accent)" }}>View →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
