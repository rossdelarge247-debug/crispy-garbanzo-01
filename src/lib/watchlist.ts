/**
 * Watchlist — user's selected instruments, stored in localStorage.
 */

import type { WatchedInstrument } from "@/types/mission-control";

const STORAGE_KEY = "trade-wizard-watchlist";

export const DEFAULT_WATCHLIST: WatchedInstrument[] = [
  { symbol: "BTC-USD", name: "Bitcoin", assetClass: "crypto" },
  { symbol: "GBP-USD", name: "GBP/USD", assetClass: "fx" },
  { symbol: "EUR-USD", name: "EUR/USD", assetClass: "fx" },
  { symbol: "BZ=F", name: "Brent Crude", assetClass: "commodity" },
  { symbol: "GC=F", name: "Gold", assetClass: "commodity" },
  { symbol: "SPY", name: "S&P 500", assetClass: "equity" },
];

export const ALL_INSTRUMENTS: WatchedInstrument[] = [
  // Crypto
  { symbol: "BTC-USD", name: "Bitcoin", assetClass: "crypto" },
  { symbol: "ETH-USD", name: "Ethereum", assetClass: "crypto" },
  { symbol: "SOL-USD", name: "Solana", assetClass: "crypto" },
  // FX
  { symbol: "GBP-USD", name: "GBP/USD", assetClass: "fx" },
  { symbol: "EUR-USD", name: "EUR/USD", assetClass: "fx" },
  { symbol: "USD-JPY", name: "USD/JPY", assetClass: "fx" },
  { symbol: "AUD-USD", name: "AUD/USD", assetClass: "fx" },
  // Commodities
  { symbol: "BZ=F", name: "Brent Crude", assetClass: "commodity" },
  { symbol: "CL=F", name: "WTI Crude", assetClass: "commodity" },
  { symbol: "GC=F", name: "Gold", assetClass: "commodity" },
  { symbol: "SI=F", name: "Silver", assetClass: "commodity" },
  { symbol: "NG=F", name: "Natural Gas", assetClass: "commodity" },
  // Equities / Indices
  { symbol: "SPY", name: "S&P 500", assetClass: "equity" },
  { symbol: "QQQ", name: "Nasdaq 100", assetClass: "equity" },
  { symbol: "NVDA", name: "NVIDIA", assetClass: "equity" },
  { symbol: "AAPL", name: "Apple", assetClass: "equity" },
  { symbol: "TSLA", name: "Tesla", assetClass: "equity" },
  { symbol: "MSFT", name: "Microsoft", assetClass: "equity" },
];

export function loadWatchlist(): WatchedInstrument[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WATCHLIST;
    return JSON.parse(stored);
  } catch { return DEFAULT_WATCHLIST; }
}

export function saveWatchlist(instruments: WatchedInstrument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
}

export function addToWatchlist(instrument: WatchedInstrument): void {
  const current = loadWatchlist();
  if (current.some(i => i.symbol === instrument.symbol)) return;
  saveWatchlist([...current, instrument]);
}

export function removeFromWatchlist(symbol: string): void {
  saveWatchlist(loadWatchlist().filter(i => i.symbol !== symbol));
}
