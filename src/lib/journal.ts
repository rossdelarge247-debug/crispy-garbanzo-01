/**
 * Trade Journal — log trades, track outcomes, review performance.
 */

export interface JournalEntry {
  id: string;
  // Trade details
  symbol: string;
  assetName: string;
  direction: "long" | "short";
  setupType: string;           // "trend_continuation", "pullback", etc.
  // Thesis
  thesis: string;
  catalyst?: string;
  // Execution
  entryPrice: number;
  entryTime: string;
  stopLoss?: number;
  takeProfit?: number;
  size?: number;
  // Outcome (filled on close)
  exitPrice?: number;
  exitTime?: string;
  exitReason?: "target" | "stop" | "manual" | "time";
  pnl?: number;
  pnlPercent?: number;
  // Notes
  preTradeNotes: string;
  postTradeNotes?: string;
  emotionalState?: "confident" | "neutral" | "anxious" | "fomo" | "revenge";
  adherenceScore?: number;     // 0-100: did I follow my plan?
  // Metadata
  status: "planned" | "open" | "closed";
  createdAt: string;
  updatedAt: string;
  // Tags for review
  tags: string[];              // ["calendar", "btc", "win", "followed_plan"]
}

export interface JournalStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  bySetupType: Record<string, { count: number; winRate: number; avgPnl: number }>;
}

const STORAGE_KEY = "trade-wizard-journal";

export function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveJournal(entries: JournalEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addJournalEntry(entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): JournalEntry {
  const full: JournalEntry = {
    ...entry,
    id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const all = loadJournal();
  all.unshift(full);
  saveJournal(all.slice(0, 200));
  return full;
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): void {
  const all = loadJournal();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  saveJournal(all);
}

export function closeJournalTrade(id: string, exitPrice: number, exitReason: JournalEntry["exitReason"], notes?: string): void {
  const all = loadJournal();
  const entry = all.find(e => e.id === id);
  if (!entry) return;

  const returnPct = entry.direction === "long"
    ? ((exitPrice - entry.entryPrice) / entry.entryPrice) * 100
    : ((entry.entryPrice - exitPrice) / entry.entryPrice) * 100;
  const pnl = entry.size ? entry.size * (returnPct / 100) : 0;

  entry.exitPrice = exitPrice;
  entry.exitTime = new Date().toISOString();
  entry.exitReason = exitReason;
  entry.pnlPercent = +returnPct.toFixed(2);
  entry.pnl = +pnl.toFixed(2);
  entry.status = "closed";
  if (notes) entry.postTradeNotes = notes;
  entry.tags = [
    ...entry.tags.filter(t => t !== "win" && t !== "loss"),
    returnPct > 0 ? "win" : "loss",
  ];
  entry.updatedAt = new Date().toISOString();

  saveJournal(all);
}

export function getJournalStats(): JournalStats {
  const entries = loadJournal().filter(e => e.status === "closed" && e.pnlPercent != null);

  if (entries.length === 0) {
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgPnl: 0, bestTrade: 0, worstTrade: 0, bySetupType: {} };
  }

  const wins = entries.filter(e => (e.pnlPercent ?? 0) > 0);
  const totalPnl = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);
  const bySetup: Record<string, { wins: number; total: number; pnl: number }> = {};

  for (const e of entries) {
    if (!bySetup[e.setupType]) bySetup[e.setupType] = { wins: 0, total: 0, pnl: 0 };
    bySetup[e.setupType].total++;
    if ((e.pnlPercent ?? 0) > 0) bySetup[e.setupType].wins++;
    bySetup[e.setupType].pnl += e.pnl ?? 0;
  }

  return {
    totalTrades: entries.length,
    wins: wins.length,
    losses: entries.length - wins.length,
    winRate: +(wins.length / entries.length * 100).toFixed(1),
    totalPnl: +totalPnl.toFixed(2),
    avgPnl: +(totalPnl / entries.length).toFixed(2),
    bestTrade: Math.max(...entries.map(e => e.pnlPercent ?? 0)),
    worstTrade: Math.min(...entries.map(e => e.pnlPercent ?? 0)),
    bySetupType: Object.fromEntries(
      Object.entries(bySetup).map(([type, data]) => [
        type,
        { count: data.total, winRate: +(data.wins / data.total * 100).toFixed(1), avgPnl: +(data.pnl / data.total).toFixed(2) },
      ])
    ),
  };
}
