"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadJournal, getJournalStats, closeJournalTrade, type JournalEntry, type JournalStats } from "@/lib/journal";

function fp(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function EntryCard({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [exitPrice, setExitPrice] = useState("");
  const [notes, setNotes] = useState("");

  const dirColor = entry.direction === "long" ? "text-[--green]" : "text-[--red]";
  const statusColor = entry.status === "open" ? "text-[--accent]" : entry.status === "closed" ? (entry.pnl && entry.pnl > 0 ? "text-[--green]" : "text-[--red]") : "text-[--text-muted]";

  function handleClose(reason: JournalEntry["exitReason"]) {
    const price = parseFloat(exitPrice);
    if (!price || price <= 0) return;
    closeJournalTrade(entry.id, price, reason, notes || undefined);
    setClosing(false);
    onClose();
  }

  return (
    <div className="rounded-lg card p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${dirColor}`}>{entry.direction === "long" ? "Long" : "Short"}</span>
        <span className="text-xs font-semibold text-[--text]">{entry.assetName}</span>
        <span className="text-2xs text-[--text-muted]">{entry.setupType}</span>
        <span className={`text-2xs font-medium ml-auto ${statusColor}`}>
          {entry.status === "planned" ? "Planned" : entry.status === "open" ? "Open" : entry.pnlPercent != null ? `${entry.pnlPercent > 0 ? "+" : ""}${entry.pnlPercent}%` : "Closed"}
        </span>
      </div>

      <p className="text-2xs text-[--text-secondary] line-clamp-1 mb-1">{entry.preTradeNotes}</p>

      <div className="flex items-center gap-3 text-2xs text-[--text-muted]">
        <span>Entry: {fp(entry.entryPrice)}</span>
        {entry.exitPrice && <span>Exit: {fp(entry.exitPrice)}</span>}
        {entry.pnl != null && <span className={entry.pnl >= 0 ? "text-[--green]" : "text-[--red]"}>P&L: {entry.pnl >= 0 ? "+" : ""}&pound;{entry.pnl.toFixed(2)}</span>}
        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
      </div>

      {(entry.status === "planned" || entry.status === "open") && !closing && (
        <button onClick={() => setClosing(true)} className="text-2xs text-[--accent] mt-1.5">Close this trade</button>
      )}

      {closing && (
        <div className="mt-2 space-y-2">
          <input
            type="number" step="0.01" placeholder="Exit price"
            value={exitPrice} onChange={e => setExitPrice(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-[--surface-overlay] rounded text-[--text] focus:outline-none"
          />
          <input
            type="text" placeholder="Notes (optional)"
            value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-[--surface-overlay] rounded text-[--text] focus:outline-none"
          />
          <div className="flex gap-1.5">
            <button onClick={() => handleClose("target")} className="flex-1 px-2 py-1 text-2xs font-medium rounded bg-[--green-bg] text-[--green]">Hit target</button>
            <button onClick={() => handleClose("stop")} className="flex-1 px-2 py-1 text-2xs font-medium rounded bg-[--red-bg] text-[--red]">Stopped out</button>
            <button onClick={() => handleClose("manual")} className="flex-1 px-2 py-1 text-2xs font-medium rounded bg-[--surface-overlay] text-[--text-muted]">Manual</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsPanel({ stats, entries }: { stats: JournalStats; entries: JournalEntry[] }) {
  if (stats.totalTrades === 0 && entries.length === 0) return null;

  const planned = entries.filter(e => e.status === "planned").length;
  const open = entries.filter(e => e.status === "open").length;
  const implemented = entries.filter(e => e.tags.includes("implemented")).length;

  return (
    <div className="card p-4 mb-4 space-y-3">
      <p className="section-label">Performance</p>

      {/* Lifecycle overview */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div><p className="stat-medium" style={{ color: "var(--text)" }}>{entries.length}</p><p className="micro">Total</p></div>
        <div><p className="stat-medium" style={{ color: "var(--text-muted)" }}>{planned}</p><p className="micro">Planned</p></div>
        <div><p className="stat-medium" style={{ color: "var(--accent)" }}>{open + implemented}</p><p className="micro">Active</p></div>
        <div><p className="stat-medium" style={{ color: stats.totalTrades > 0 ? "var(--green)" : "var(--text-muted)" }}>{stats.totalTrades}</p><p className="micro">Closed</p></div>
      </div>

      {stats.totalTrades > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div><p className="stat-medium" style={{ color: stats.winRate >= 50 ? "var(--green)" : "var(--red)" }}>{stats.winRate}%</p><p className="micro">Win rate</p></div>
            <div><p className="stat-medium" style={{ color: stats.totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>&pound;{stats.totalPnl.toFixed(0)}</p><p className="micro">Total P&L</p></div>
            <div><p className="stat-medium" style={{ color: stats.avgPnl >= 0 ? "var(--green)" : "var(--red)" }}>&pound;{stats.avgPnl.toFixed(0)}</p><p className="micro">Avg P&L</p></div>
            <div><p className="stat-medium" style={{ color: "var(--text)" }}>{stats.bestTrade > 0 ? `+${stats.bestTrade}%` : "—"}</p><p className="micro">Best</p></div>
          </div>

          {Object.keys(stats.bySetupType).length > 0 && (
            <div className="space-y-1">
              <p className="micro mb-1">By setup type</p>
              {Object.entries(stats.bySetupType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="caption" style={{ color: "var(--text-secondary)" }}>{type.replace(/_/g, " ")}</span>
                  <span className="micro">{data.count} trades · {data.winRate}% WR · &pound;{data.avgPnl.toFixed(0)} avg</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [filter, setFilter] = useState<"all" | "planned" | "open" | "closed">("all");

  function refresh() {
    setEntries(loadJournal());
    setStats(getJournalStats());
  }

  useEffect(() => { refresh(); }, []);

  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light text-[--text] tracking-tight">Journal</h1>
        <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text]">&larr; Dashboard</Link>
      </div>

      {stats && <StatsPanel stats={stats} entries={entries} />}

      {/* Filter */}
      <div className="flex gap-1.5">
        {(["all", "planned", "open", "closed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-2xs font-medium rounded transition-colors ${
              filter === f ? "bg-[--accent] text-white" : "card text-[--text-muted]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${entries.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(entry => (
            <EntryCard key={entry.id} entry={entry} onClose={refresh} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg card p-5 text-center">
          <p className="text-sm text-[--text-secondary]">No journal entries yet.</p>
          <p className="text-xs text-[--text-muted] mt-1">Plan a trade from a setup to start tracking.</p>
        </div>
      )}
    </div>
  );
}
