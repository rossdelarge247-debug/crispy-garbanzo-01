/**
 * Leverage — Plus500-style retail CFD leverage limits.
 *
 * Based on FCA UK retail client limits:
 * - Forex: 1:30
 * - Major indices: 1:20
 * - Commodities (gold): 1:20, other: 1:10
 * - Stocks: 1:5
 * - Crypto: 1:2 (banned on Plus500 UK but available elsewhere)
 *
 * Source: https://brokerchooser.com/broker-reviews/plus500-review/maximum-leverage-for-cfds
 */

export interface LeverageInfo {
  leverage: number;
  label: string;       // "1:30"
  marginPercent: number; // 3.33% for 1:30
  warning?: string;
}

const LEVERAGE_MAP: Record<string, LeverageInfo> = {
  // Forex — 1:30
  "EUR-USD": { leverage: 30, label: "1:30", marginPercent: 3.33 },
  "GBP-USD": { leverage: 30, label: "1:30", marginPercent: 3.33 },
  "USD-JPY": { leverage: 30, label: "1:30", marginPercent: 3.33 },
  "AUD-USD": { leverage: 30, label: "1:30", marginPercent: 3.33 },
  "USD-CAD": { leverage: 30, label: "1:30", marginPercent: 3.33 },
  "USD-CHF": { leverage: 30, label: "1:30", marginPercent: 3.33 },

  // Indices — 1:20
  "SPY":  { leverage: 20, label: "1:20", marginPercent: 5 },
  "QQQ":  { leverage: 20, label: "1:20", marginPercent: 5 },
  "DIA":  { leverage: 20, label: "1:20", marginPercent: 5 },
  "DXY":  { leverage: 20, label: "1:20", marginPercent: 5 },

  // Commodities — gold 1:20, others 1:10
  "GC=F": { leverage: 20, label: "1:20", marginPercent: 5 },
  "SI=F": { leverage: 10, label: "1:10", marginPercent: 10 },
  "BZ=F": { leverage: 10, label: "1:10", marginPercent: 10 },
  "CL=F": { leverage: 10, label: "1:10", marginPercent: 10 },
  "NG=F": { leverage: 10, label: "1:10", marginPercent: 10 },

  // Stocks — 1:5
  "NVDA": { leverage: 5, label: "1:5", marginPercent: 20 },
  "AAPL": { leverage: 5, label: "1:5", marginPercent: 20 },
  "MSFT": { leverage: 5, label: "1:5", marginPercent: 20 },
  "TSLA": { leverage: 5, label: "1:5", marginPercent: 20 },
  "META": { leverage: 5, label: "1:5", marginPercent: 20 },
  "GOOGL":{ leverage: 5, label: "1:5", marginPercent: 20 },
  "AMZN": { leverage: 5, label: "1:5", marginPercent: 20 },

  // Crypto — 1:2 (FCA limits, banned on Plus500 UK but available on other platforms)
  "BTC-USD":  { leverage: 2, label: "1:2", marginPercent: 50, warning: "Crypto CFDs banned for UK retail on Plus500. Available on other platforms at 1:2." },
  "ETH-USD":  { leverage: 2, label: "1:2", marginPercent: 50, warning: "Crypto CFDs banned for UK retail on Plus500. Available on other platforms at 1:2." },
  "SOL-USD":  { leverage: 2, label: "1:2", marginPercent: 50, warning: "Crypto CFDs banned for UK retail on Plus500. Available on other platforms at 1:2." },
  "XRP-USD":  { leverage: 2, label: "1:2", marginPercent: 50 },
  "DOGE-USD": { leverage: 2, label: "1:2", marginPercent: 50 },
  "ADA-USD":  { leverage: 2, label: "1:2", marginPercent: 50 },
};

export function getLeverage(symbol: string): LeverageInfo {
  return LEVERAGE_MAP[symbol] ?? { leverage: 5, label: "1:5", marginPercent: 20 };
}

/**
 * Calculate margin required and exposure for a trade.
 */
export function calculateTradeSize(
  symbol: string,
  tradeAmount: number, // £ the user wants to risk
  entryPrice: number,
  stopLossPercent: number
) {
  const lev = getLeverage(symbol);
  const exposure = tradeAmount * lev.leverage;
  const positionSize = entryPrice > 0 ? exposure / entryPrice : 0;
  const marginRequired = tradeAmount; // margin = trade amount at max leverage
  const maxLoss = exposure * (stopLossPercent / 100);
  const riskPercent = tradeAmount > 0 ? (maxLoss / tradeAmount) * 100 : 0;

  return {
    leverage: lev,
    exposure,
    positionSize: +positionSize.toFixed(4),
    marginRequired,
    maxLoss: +maxLoss.toFixed(2),
    riskPercent: +riskPercent.toFixed(1),
  };
}
