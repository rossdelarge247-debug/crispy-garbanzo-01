/**
 * Paper Positions — localStorage-based paper trading.
 *
 * When the user clicks "Set up paper trade", a position is created
 * and stored locally. The dashboard shows open positions with live P&L.
 */

export interface PaperPosition {
  id: string;
  flagId: string;
  asset: string;
  assetName: string;
  direction: "long" | "short";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  tradeAmount: number;
  leverage: number;
  openedAt: string;
  status: "open" | "closed";
  closePrice?: number;
  closedAt?: string;
  closeReason?: "target" | "stop" | "manual";
  pnl?: number;
}

const STORAGE_KEY = "trade-wizard-paper-positions";

export function loadPositions(): PaperPosition[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

export function savePosition(pos: PaperPosition): void {
  if (typeof window === "undefined") return;
  const all = loadPositions();
  all.unshift(pos);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
}

export function closePosition(id: string, closePrice: number, reason: PaperPosition["closeReason"]): void {
  if (typeof window === "undefined") return;
  const all = loadPositions();
  const pos = all.find(p => p.id === id);
  if (!pos) return;

  pos.status = "closed";
  pos.closePrice = closePrice;
  pos.closedAt = new Date().toISOString();
  pos.closeReason = reason;

  const returnPct = pos.direction === "long"
    ? (closePrice - pos.entryPrice) / pos.entryPrice
    : (pos.entryPrice - closePrice) / pos.entryPrice;
  pos.pnl = +(pos.tradeAmount * pos.leverage * returnPct).toFixed(2);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getOpenPositions(): PaperPosition[] {
  return loadPositions().filter(p => p.status === "open");
}

export function getClosedPositions(): PaperPosition[] {
  return loadPositions().filter(p => p.status === "closed");
}
