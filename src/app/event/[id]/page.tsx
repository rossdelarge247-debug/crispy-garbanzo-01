"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { MacroEvent, MacroTrade } from "@/types/macro-trader";
import { formatCurrencyPrice, getCurrencySymbol } from "@/lib/currency";
import { addJournalEntry } from "@/lib/journal";
import CandlestickChart from "@/components/CandlestickChart";
import BacktestPanel from "@/components/BacktestPanel";
import type { FinalisedPlan } from "@/components/BacktestPanelTypes";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<MacroEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalisedPlan, setFinalisedPlan] = useState<FinalisedPlan | null>(null);
  const [logged, setLogged] = useState(false);
  const [notes, setNotes] = useState("");

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
    if (!event?.topTrade) return;
    const t = event.topTrade;
    addJournalEntry({
      symbol: t.asset, assetName: t.assetName,
      direction: t.direction === "short" ? "short" : "long",
      setupType: `event_${event.category}`,
      thesis: `${event.title}: ${t.thesis}`,
      catalyst: event.title,
      entryPrice: 0, entryTime: event.date,
      preTradeNotes: `Event: ${event.title}. Forecast: ${event.forecast ?? "n/a"}. Previous: ${event.previous ?? "n/a"}. ${notes}`,
      status: "planned",
      tags: [event.category, t.asset.toLowerCase(), "macro"],
    });
    setLogged(true);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-16 rounded-lg skeleton" />
        <div className="h-8 w-64 rounded-lg skeleton" />
        <div className="card space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-5 rounded-lg skeleton" />)}</div>
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

  const trade = event.topTrade;
  const cur = trade ? getCurrencySymbol(trade.asset) : "$";

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

      {/* Forecast vs previous */}
      {(event.forecast || event.previous) && (
        <div className="card">
          <p className="section-label mb-2">Market expectations</p>
          <div className="flex gap-6">
            {event.forecast && (
              <div>
                <p className="micro">Forecast (consensus)</p>
                <p className="stat-large" style={{ color: "var(--text)" }}>{event.forecast}</p>
              </div>
            )}
            {event.previous && (
              <div>
                <p className="micro">Previous</p>
                <p className="stat-large" style={{ color: "var(--text-muted)" }}>{event.previous}</p>
              </div>
            )}
            {event.hoursUntil > 0 && (
              <div className="ml-auto text-right">
                <p className="micro">Time until event</p>
                <p className="stat-large" style={{ color: "var(--accent)" }}>{event.hoursUntil < 24 ? `${Math.round(event.hoursUntil)}h` : `${Math.round(event.hoursUntil / 24)}d`}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Affected assets */}
      {event.affectedAssets.length > 0 && (
        <div className="card">
          <p className="section-label mb-2">Affected assets</p>
          <div className="space-y-2">
            {event.affectedAssets.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="pill" style={{ background: a.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: a.direction === "long" ? "var(--green)" : "var(--red)" }}>
                  {a.direction === "long" ? "↑" : "↓"} {a.name}
                </span>
                <span className="caption flex-1">{a.reasoning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart for top trade asset */}
      {trade && <CandlestickChart symbol={trade.asset} height={260} />}

      {/* Trade plan */}
      {trade && (
        <div className="card" style={{ background: "var(--accent-soft)" }}>
          <p className="section-label mb-3" style={{ color: "var(--accent)" }}>Recommended trade</p>

          <div className="flex items-center gap-2 mb-3">
            <span className="pill" style={{ background: trade.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: trade.direction === "long" ? "var(--green)" : "var(--red)" }}>
              {trade.direction === "long" ? "Long" : "Short"} {trade.assetName}
            </span>
            <span className="stat-medium" style={{ color: event.conviction >= 70 ? "var(--green)" : "var(--amber)" }}>{event.conviction}%</span>
          </div>

          <p className="body-text mb-4">{trade.thesis}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><p className="micro">Entry</p><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{trade.entry}</p></div>
            <div><p className="micro">Hold</p><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{trade.holdPeriod}</p></div>
            <div><p className="micro">Stop loss</p><p className="text-sm font-semibold" style={{ color: "var(--red)" }}>{trade.stopLossPercent}%</p></div>
            <div><p className="micro">Target</p><p className="text-sm font-semibold" style={{ color: "var(--green)" }}>{trade.takeProfitPercent}%</p></div>
          </div>

          <div className="rounded-lg py-3 px-3" style={{ background: "var(--surface)" }}>
            <div className="flex gap-4 text-center">
              <div className="flex-1"><p className="stat-medium" style={{ color: "var(--text)" }}>£{trade.tradeAmount}</p><p className="micro">Position</p></div>
              <div className="flex-1"><p className="stat-medium" style={{ color: "var(--text)" }}>{trade.leverage}x</p><p className="micro">Leverage</p></div>
              <div className="flex-1"><p className="stat-medium" style={{ color: "var(--text)" }}>£{trade.exposure.toLocaleString()}</p><p className="micro">Exposure</p></div>
              <div className="flex-1"><p className="stat-medium" style={{ color: "var(--red)" }}>£{trade.maxLoss}</p><p className="micro">Max loss</p></div>
              <div className="flex-1"><p className="stat-medium" style={{ color: "var(--green)" }}>{trade.riskReward}:1</p><p className="micro">R:R</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Backtest */}
      {trade && (
        <BacktestPanel
          symbol={trade.asset}
          direction={trade.direction === "short" ? "short" : "long"}
          setupType={`event_${event.category}`}
          onFinalise={setFinalisedPlan}
        />
      )}

      {/* Journal CTA */}
      {trade && (
        <div className="card space-y-3">
          <p className="section-label">Add to journal</p>
          <textarea
            placeholder="Notes — your thesis, what you're watching for..."
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
              <Link href="/journal" className="micro" style={{ color: "var(--accent)" }}>View in journal →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
