/**
 * User Preferences — Trade Wizard 2.0
 *
 * Stores user's focus universe, experience level, risk style,
 * and notification preferences. localStorage for Phase 1,
 * database-backed in Phase 2.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FocusAsset {
  symbol: string;
  name: string;
  category: "forex" | "stocks" | "crypto" | "commodities" | "indices" | "sectors";
}

export interface UserPreferences {
  // Onboarding complete?
  onboarded: boolean;

  // Step 1: What do you want to trade?
  categories: string[]; // ["forex", "crypto", "stocks", etc.]

  // Step 2: Focus universe
  focusAssets: FocusAsset[];

  // Step 3: Experience level
  experienceLevel: "simple" | "balanced" | "advanced";

  // Step 4: How proactive should Trade Wizard be?
  proactiveLevel: "explain" | "suggest" | "plan" | "paper" | "live";

  // Step 5: Risk style
  riskStyle: "cautious" | "balanced" | "aggressive";

  // Step 6: Notifications
  notifications: {
    dailyBriefing: boolean;
    eventAlerts: boolean;
    tradeSetupAlerts: boolean;
    invalidationAlerts: boolean;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboarded: false,
  categories: [],
  focusAssets: [],
  experienceLevel: "simple",
  proactiveLevel: "suggest",
  riskStyle: "balanced",
  notifications: {
    dailyBriefing: true,
    eventAlerts: true,
    tradeSetupAlerts: true,
    invalidationAlerts: false,
  },
};

// ---------------------------------------------------------------------------
// Preset asset lists for onboarding
// ---------------------------------------------------------------------------

export const ASSET_PRESETS: Record<string, FocusAsset[]> = {
  forex: [
    { symbol: "EUR-USD", name: "Euro / Dollar", category: "forex" },
    { symbol: "GBP-USD", name: "Pound / Dollar", category: "forex" },
    { symbol: "USD-JPY", name: "Dollar / Yen", category: "forex" },
    { symbol: "AUD-USD", name: "Aussie / Dollar", category: "forex" },
    { symbol: "USD-CAD", name: "Dollar / Canadian", category: "forex" },
    { symbol: "USD-CHF", name: "Dollar / Swiss Franc", category: "forex" },
  ],
  stocks: [
    { symbol: "AAPL", name: "Apple", category: "stocks" },
    { symbol: "MSFT", name: "Microsoft", category: "stocks" },
    { symbol: "GOOGL", name: "Alphabet", category: "stocks" },
    { symbol: "AMZN", name: "Amazon", category: "stocks" },
    { symbol: "NVDA", name: "NVIDIA", category: "stocks" },
    { symbol: "TSLA", name: "Tesla", category: "stocks" },
    { symbol: "META", name: "Meta", category: "stocks" },
    { symbol: "NFLX", name: "Netflix", category: "stocks" },
    { symbol: "XOM", name: "Exxon Mobil", category: "stocks" },
    { symbol: "JPM", name: "JPMorgan Chase", category: "stocks" },
  ],
  crypto: [
    { symbol: "BTC-USD", name: "Bitcoin", category: "crypto" },
    { symbol: "ETH-USD", name: "Ethereum", category: "crypto" },
    { symbol: "SOL-USD", name: "Solana", category: "crypto" },
    { symbol: "XRP-USD", name: "XRP", category: "crypto" },
    { symbol: "DOGE-USD", name: "Dogecoin", category: "crypto" },
    { symbol: "ADA-USD", name: "Cardano", category: "crypto" },
  ],
  commodities: [
    { symbol: "BZ=F", name: "Brent Crude Oil", category: "commodities" },
    { symbol: "CL=F", name: "WTI Crude Oil", category: "commodities" },
    { symbol: "GC=F", name: "Gold", category: "commodities" },
    { symbol: "SI=F", name: "Silver", category: "commodities" },
    { symbol: "NG=F", name: "Natural Gas", category: "commodities" },
  ],
  indices: [
    { symbol: "SPY", name: "S&P 500", category: "indices" },
    { symbol: "QQQ", name: "Nasdaq 100", category: "indices" },
    { symbol: "DIA", name: "Dow Jones", category: "indices" },
    { symbol: "IWM", name: "Russell 2000", category: "indices" },
    { symbol: "DXY", name: "US Dollar Index", category: "indices" },
  ],
  sectors: [
    { symbol: "XLF", name: "Financials", category: "sectors" },
    { symbol: "XLK", name: "Technology", category: "sectors" },
    { symbol: "XLE", name: "Energy", category: "sectors" },
    { symbol: "XLV", name: "Healthcare", category: "sectors" },
    { symbol: "XLRE", name: "Real Estate", category: "sectors" },
  ],
};

export const CATEGORY_LABELS: Record<string, { label: string; emoji: string; description: string }> = {
  forex: { label: "Forex", emoji: "💱", description: "Currency pairs like EUR/USD, GBP/USD" },
  stocks: { label: "Stocks", emoji: "📈", description: "Individual companies like Apple, NVIDIA" },
  crypto: { label: "Crypto", emoji: "₿", description: "Bitcoin, Ethereum, and altcoins" },
  commodities: { label: "Commodities", emoji: "🛢️", description: "Oil, gold, silver, natural gas" },
  indices: { label: "Indices", emoji: "📊", description: "S&P 500, Nasdaq, Dollar Index" },
  sectors: { label: "Sectors", emoji: "🏭", description: "Tech, energy, finance, healthcare" },
};

// ---------------------------------------------------------------------------
// Storage (localStorage for Phase 1)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "trade-wizard-preferences";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // silently fail
  }
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
