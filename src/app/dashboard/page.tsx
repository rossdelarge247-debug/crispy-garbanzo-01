"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { PolicyDashboardData, PolicyAnnouncement, PolicyTrade, PolicyCategory, PolicyPattern } from "@/types/policy-tracker";
import { CATEGORY_CONFIG } from "@/types/policy-tracker";
import { getCurrencySymbol } from "@/lib/currency";
import FeedStatus from "@/components/FeedStatus";

/* ================================================================
   Skeleton
   ================================================================ */

function Loading() {
  const [step, setStep] = useState(0);
  const steps = ["Scanning policy announcements", "Analysing market impact", "Generating trade recommendations", "Checking sentiment"];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000); return () => clearInterval(t); }, [steps.length]);
  return (
    <div className="space-y-4">
      <p className="caption">{steps[step]}...</p>
      {[1, 2, 3, 4].map(i => <div key={i} className="card space-y-2 py-4"><div className="h-4 w-3/4 rounded skeleton" /><div className="h-3 w-full rounded skeleton" /><div className="h-3 w-1/2 rounded skeleton" /></div>)}
    </div>
  );
}

/* ================================================================
   Sentiment gauge
   ================================================================ */

function SentimentPulse({ overall, score }: { overall: string; score: number }) {
  const color = overall === "bullish" ? "var(--green)" : overall === "bearish" ? "var(--red)" : "var(--text-muted)";
  const bg = overall === "bullish" ? "var(--green-soft)" : overall === "bearish" ? "var(--red-soft)" : "var(--surface-hover)";
  return (
    <div className="flex items-center gap-3 card py-3 px-4">
      <div className="flex-1">
        <p className="micro">Market sentiment</p>
        <p className="stat-medium" style={{ color }}>{overall}</p>
      </div>
      <div className="w-24 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(5, 50 + score / 2)}%`, background: color }} />
      </div>
      <span className="stat-medium" style={{ color }}>{score > 0 ? "+" : ""}{score}</span>
    </div>
  );
}

/* ================================================================
   Policy announcement card
   ================================================================ */

function PolicyCard({ item }: { item: PolicyAnnouncement }) {
  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const sentColor = item.sentiment === "bullish" ? "var(--green)" : item.sentiment === "bearish" ? "var(--red)" : "var(--text-muted)";

  return (
    <Link href={`/event/${item.id}`} className="block card-hover py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="micro">{item.timeLabel}</span>
        <span className="pill" style={{ border: `1px solid ${cat.color}`, color: cat.color, background: "transparent", fontSize: 9 }}>
          {cat.emoji} {cat.label}
        </span>
        <span className="pill" style={{ background: item.impact === "high" ? "var(--red-soft)" : "var(--surface-hover)", color: item.impact === "high" ? "var(--red)" : "var(--text-muted)", fontSize: 9 }}>
          {item.impact}
        </span>
        {item.isWeekend && <span className="pill" style={{ background: "var(--amber-soft)", color: "var(--amber)", fontSize: 9 }}>Weekend</span>}
        <span className="pill ml-auto" style={{ background: "transparent", color: sentColor, fontSize: 9, border: `1px solid ${sentColor}` }}>
          {item.sentiment}
        </span>
      </div>

      {/* Title */}
      <p className="text-base font-medium mb-1" style={{ color: "var(--text)" }}>{item.title}</p>
      {item.summary && <p className="caption line-clamp-2 mb-2">{item.summary}</p>}

      {/* Affected assets */}
      {item.affectedAssets.length > 0 && (
        <div className="space-y-0">
          {item.affectedAssets.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-2 py-1" style={{ borderTop: i > 0 ? "1px solid var(--surface-hover)" : "none" }}>
              <span className="pill" style={{ background: a.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: a.direction === "long" ? "var(--green)" : "var(--red)" }}>
                {a.direction === "long" ? "↑" : "↓"} {a.name}
              </span>
              <span className="micro flex-1" style={{ color: "var(--text-muted)" }}>{a.reasoning}</span>
              <span className="micro font-bold" style={{ color: a.confidence >= 70 ? "var(--green)" : "var(--text-muted)" }}>{a.confidence}%</span>
            </div>
          ))}
        </div>
      )}

      <p className="micro mt-2" style={{ color: "var(--text-muted)" }}>{item.source} · {item.dayLabel}</p>
    </Link>
  );
}

/* ================================================================
   Active trade card
   ================================================================ */

function TradeCard({ trade }: { trade: PolicyTrade }) {
  const cur = getCurrencySymbol(trade.asset);
  return (
    <div className="card py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="pill" style={{ background: trade.direction === "long" ? "var(--green-soft)" : "var(--red-soft)", color: trade.direction === "long" ? "var(--green)" : "var(--red)" }}>
            {trade.direction === "long" ? "↑ Long" : "↓ Short"} {trade.assetName}
          </span>
          <span className="micro font-bold" style={{ color: trade.confidence >= 70 ? "var(--green)" : "var(--amber)" }}>{trade.confidence}%</span>
        </div>
        <span className="micro" style={{ color: "var(--text-muted)" }}>{trade.riskReward}:1 R:R</span>
      </div>
      <p className="caption mb-2">{trade.thesis}</p>
      <div className="flex gap-3 micro">
        <span>£{trade.tradeAmount} at {trade.leverage}x</span>
        <span style={{ color: "var(--green)" }}>Win: {cur}{trade.maxWin}</span>
        <span style={{ color: "var(--red)" }}>Loss: {cur}{trade.maxLoss}</span>
        <span className="ml-auto" style={{ color: "var(--text-muted)" }}>{trade.timing}</span>
      </div>
    </div>
  );
}

/* ================================================================
   Session line
   ================================================================ */

function SessionLine() {
  const now = new Date();
  const h = now.getUTCHours();
  const isOpen = h >= 8 && h < 21 && now.getDay() !== 0 && now.getDay() !== 6;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  return (
    <p className="caption flex items-center gap-2 mt-1">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isOpen ? "var(--green)" : "var(--text-muted)" }} />
      <span>{timeStr} · {isOpen ? "Markets open" : isWeekend ? "Weekend — watch for announcements" : "Markets closed"}</span>
    </p>
  );
}

/* ================================================================
   Dashboard
   ================================================================ */

export default function PolicyDashboard() {
  const [data, setData] = useState<PolicyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | "all">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/policy-feed");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allAnnouncements = data?.announcements ?? [];
  const filtered = categoryFilter === "all" ? allAnnouncements : allAnnouncements.filter(a => a.category === categoryFilter);

  // Category counts
  const catCounts: Partial<Record<PolicyCategory, number>> = {};
  for (const a of allAnnouncements) { catCounts[a.category] = (catCounts[a.category] ?? 0) + 1; }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">The Trump Trade Tracker</h1>
          <SessionLine />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Link href="/journal" className="micro" style={{ color: "var(--text-muted)" }}>Journal</Link>
          <Link href="/about" className="micro" style={{ color: "var(--text-muted)" }}>About</Link>
        </div>
      </div>

      <FeedStatus />

      {loading && <Loading />}

      {!loading && data && (
        <div className="space-y-6">
          {/* Weekend alert */}
          {data.weekendAlert && (
            <div className="card py-3" style={{ background: "var(--amber-soft)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>⚠ Weekend announcement detected</p>
              <p className="caption">Policy news dropped outside market hours. Monitor for Monday open impact.</p>
            </div>
          )}

          {/* Brief */}
          <div className="card">
            <p className="section-label mb-2" style={{ color: "var(--accent)" }}>Intelligence brief</p>
            <p className="text-base font-medium leading-relaxed" style={{ color: "var(--text)" }}>{data.brief}</p>
          </div>

          {/* Sentiment pulse */}
          <SentimentPulse overall={data.sentimentPulse.overall} score={data.sentimentPulse.score} />

          {/* Active trades */}
          {data.activeTrades.length > 0 && (
            <div>
              <p className="section-label mb-2">Active trade recommendations</p>
              <div className="space-y-2">
                {data.activeTrades.map((t, i) => <TradeCard key={i} trade={t} />)}
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCategoryFilter("all")} className="pill transition-colors" style={{
              background: categoryFilter === "all" ? "var(--accent)" : "var(--surface-hover)",
              color: categoryFilter === "all" ? "white" : "var(--text-muted)",
            }}>All ({allAnnouncements.length})</button>
            {(Object.entries(catCounts) as [PolicyCategory, number][]).map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)} className="pill transition-colors" style={{
                  background: categoryFilter === cat ? "var(--accent)" : "var(--surface-hover)",
                  color: categoryFilter === cat ? "white" : "var(--text-muted)",
                }}>{cfg.emoji} {cfg.label} ({count})</button>
              );
            })}
          </div>

          {/* Policy feed */}
          <div>
            <p className="section-label mb-2">Policy feed</p>
            {filtered.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--surface-hover)" }}>
                {filtered.map(a => <PolicyCard key={a.id} item={a} />)}
              </div>
            ) : (
              <div className="card py-6 text-center">
                <p className="body-text">No policy announcements {categoryFilter !== "all" ? `in ${CATEGORY_CONFIG[categoryFilter]?.label}` : ""} right now.</p>
              </div>
            )}
          </div>

          {/* Known patterns */}
          {data.patterns.length > 0 && (
            <div>
              <p className="section-label mb-2">Known patterns</p>
              <div className="space-y-2">
                {data.patterns.map((p, i) => (
                  <div key={i} className="card py-2">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.name}</p>
                    <p className="caption">{p.description}</p>
                    <div className="flex gap-3 micro mt-1">
                      <span>{p.frequency}</span>
                      <span style={{ color: "var(--accent)" }}>{p.avgImpact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between caption pt-4" style={{ borderTop: "1px solid var(--surface)" }}>
            <span>Updated {new Date(data.updatedAt).toLocaleTimeString()}</span>
            <Link href="/settings" style={{ color: "var(--accent)" }}>Settings</Link>
          </div>
        </div>
      )}
    </div>
  );
}
