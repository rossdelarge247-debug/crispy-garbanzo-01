/**
 * Human-Readable Asset Names — Trade Daddy 2.0
 *
 * Maps ticker symbols to names a novice would understand.
 * Used everywhere in the UI — no jargon codes ever shown to users.
 */

export interface AssetInfo {
  symbol: string;
  name: string;          // "British Pound / US Dollar"
  shortName: string;     // "GBP/USD"
  nickname?: string;     // "Cable"
  category: string;      // "Forex", "Crypto", etc.
  description: string;   // One sentence for beginners
}

const ASSET_DIRECTORY: Record<string, AssetInfo> = {
  // Forex
  "EUR-USD": { symbol: "EUR-USD", name: "Euro / US Dollar", shortName: "EUR/USD", category: "Forex", description: "The most traded currency pair in the world" },
  "GBP-USD": { symbol: "GBP-USD", name: "British Pound / US Dollar", shortName: "GBP/USD", nickname: "Cable", category: "Forex", description: "UK currency against the US Dollar" },
  "USD-JPY": { symbol: "USD-JPY", name: "US Dollar / Japanese Yen", shortName: "USD/JPY", category: "Forex", description: "Dollar against the Yen — sensitive to interest rate differences" },
  "AUD-USD": { symbol: "AUD-USD", name: "Australian Dollar / US Dollar", shortName: "AUD/USD", nickname: "Aussie", category: "Forex", description: "Aussie Dollar — tied to commodity prices" },
  "USD-CAD": { symbol: "USD-CAD", name: "US Dollar / Canadian Dollar", shortName: "USD/CAD", nickname: "Loonie", category: "Forex", description: "Heavily influenced by oil prices" },
  "USD-CHF": { symbol: "USD-CHF", name: "US Dollar / Swiss Franc", shortName: "USD/CHF", nickname: "Swissy", category: "Forex", description: "Swiss Franc — traditional safe haven" },
  "DXY": { symbol: "DXY", name: "US Dollar Index", shortName: "Dollar Index", category: "Forex", description: "Measures the Dollar against a basket of major currencies" },

  // Crypto
  "BTC-USD": { symbol: "BTC-USD", name: "Bitcoin", shortName: "BTC", category: "Crypto", description: "The original cryptocurrency" },
  "ETH-USD": { symbol: "ETH-USD", name: "Ethereum", shortName: "ETH", category: "Crypto", description: "The second largest crypto — powers smart contracts and DeFi" },
  "SOL-USD": { symbol: "SOL-USD", name: "Solana", shortName: "SOL", category: "Crypto", description: "Fast blockchain known for low fees" },
  "XRP-USD": { symbol: "XRP-USD", name: "XRP", shortName: "XRP", category: "Crypto", description: "Designed for cross-border payments" },
  "DOGE-USD": { symbol: "DOGE-USD", name: "Dogecoin", shortName: "DOGE", category: "Crypto", description: "The original meme coin" },
  "ADA-USD": { symbol: "ADA-USD", name: "Cardano", shortName: "ADA", category: "Crypto", description: "Research-driven blockchain platform" },

  // Stocks
  "AAPL": { symbol: "AAPL", name: "Apple", shortName: "Apple", category: "Stocks", description: "iPhone maker — world's most valuable company" },
  "MSFT": { symbol: "MSFT", name: "Microsoft", shortName: "Microsoft", category: "Stocks", description: "Windows, Azure cloud, and AI leader" },
  "GOOGL": { symbol: "GOOGL", name: "Alphabet (Google)", shortName: "Google", category: "Stocks", description: "Search, YouTube, and cloud computing" },
  "AMZN": { symbol: "AMZN", name: "Amazon", shortName: "Amazon", category: "Stocks", description: "E-commerce and cloud computing giant" },
  "NVDA": { symbol: "NVDA", name: "NVIDIA", shortName: "NVIDIA", category: "Stocks", description: "AI chip maker — the backbone of the AI boom" },
  "TSLA": { symbol: "TSLA", name: "Tesla", shortName: "Tesla", category: "Stocks", description: "Electric vehicles and energy" },
  "META": { symbol: "META", name: "Meta (Facebook)", shortName: "Meta", category: "Stocks", description: "Social media and virtual reality" },
  "NFLX": { symbol: "NFLX", name: "Netflix", shortName: "Netflix", category: "Stocks", description: "Streaming entertainment" },
  "XOM": { symbol: "XOM", name: "Exxon Mobil", shortName: "Exxon", category: "Stocks", description: "One of the world's largest oil companies" },
  "JPM": { symbol: "JPM", name: "JPMorgan Chase", shortName: "JPMorgan", category: "Stocks", description: "America's biggest bank" },
  "COIN": { symbol: "COIN", name: "Coinbase", shortName: "Coinbase", category: "Stocks", description: "Crypto exchange — stock moves with crypto markets" },

  // Commodities
  "BZ=F": { symbol: "BZ=F", name: "Brent Crude Oil", shortName: "Brent Oil", category: "Commodities", description: "International benchmark for oil prices" },
  "CL=F": { symbol: "CL=F", name: "WTI Crude Oil", shortName: "WTI Oil", category: "Commodities", description: "US benchmark for oil prices" },
  "GC=F": { symbol: "GC=F", name: "Gold", shortName: "Gold", category: "Commodities", description: "Traditional safe haven — rises in uncertainty" },
  "SI=F": { symbol: "SI=F", name: "Silver", shortName: "Silver", category: "Commodities", description: "Precious metal and industrial commodity" },
  "NG=F": { symbol: "NG=F", name: "Natural Gas", shortName: "Nat Gas", category: "Commodities", description: "Heating and electricity fuel — very seasonal" },
  "USO": { symbol: "USO", name: "US Oil Fund", shortName: "Oil Fund", category: "Commodities", description: "ETF that tracks crude oil prices" },

  // Indices
  "SPY": { symbol: "SPY", name: "S&P 500", shortName: "S&P 500", category: "Indices", description: "The 500 biggest US companies — the stock market benchmark" },
  "QQQ": { symbol: "QQQ", name: "Nasdaq 100", shortName: "Nasdaq", category: "Indices", description: "Tech-heavy index — Apple, Microsoft, NVIDIA" },
  "DIA": { symbol: "DIA", name: "Dow Jones", shortName: "Dow Jones", category: "Indices", description: "30 blue-chip US stocks" },
  "IWM": { symbol: "IWM", name: "Russell 2000", shortName: "Small Caps", category: "Indices", description: "Small US companies — more volatile" },
  "VIX": { symbol: "VIX", name: "Volatility Index", shortName: "Fear Index", nickname: "VIX", category: "Indices", description: "Measures market fear — rises when stocks fall" },
  "TLT": { symbol: "TLT", name: "US Treasury Bonds", shortName: "Bonds", category: "Indices", description: "Long-term government bonds — safe haven" },

  // Sectors
  "XLF": { symbol: "XLF", name: "Financial Sector", shortName: "Financials", category: "Sectors", description: "Banks, insurance, and financial services" },
  "XLK": { symbol: "XLK", name: "Technology Sector", shortName: "Tech", category: "Sectors", description: "Software, hardware, and semiconductors" },
  "XLE": { symbol: "XLE", name: "Energy Sector", shortName: "Energy", category: "Sectors", description: "Oil, gas, and energy companies" },
  "XLV": { symbol: "XLV", name: "Healthcare Sector", shortName: "Healthcare", category: "Sectors", description: "Pharma, biotech, and medical devices" },
  "XLRE": { symbol: "XLRE", name: "Real Estate Sector", shortName: "Real Estate", category: "Sectors", description: "REITs and property companies" },
};

/**
 * Get human-readable info for any symbol.
 * Falls back gracefully for unknown symbols.
 */
export function getAssetInfo(symbol: string): AssetInfo {
  return ASSET_DIRECTORY[symbol] || {
    symbol,
    name: symbol.replace(/[-=]/g, " "),
    shortName: symbol.replace(/[-=]/g, "/"),
    category: "Other",
    description: "",
  };
}

/** Get the friendly display name — "British Pound / US Dollar" not "GBP-USD" */
export function getAssetName(symbol: string): string {
  return getAssetInfo(symbol).name;
}

/** Get the short display name — "GBP/USD" not "GBP-USD" */
export function getAssetShortName(symbol: string): string {
  return getAssetInfo(symbol).shortName;
}

/** Get nickname if exists — "Cable" for GBP/USD */
export function getAssetNickname(symbol: string): string | undefined {
  return getAssetInfo(symbol).nickname;
}

/** Format for display: "British Pound / US Dollar (Cable)" */
export function getAssetDisplayName(symbol: string): string {
  const info = getAssetInfo(symbol);
  return info.nickname ? `${info.name} (${info.nickname})` : info.name;
}
