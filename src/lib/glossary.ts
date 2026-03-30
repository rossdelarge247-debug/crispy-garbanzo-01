/**
 * Trading Glossary — plain English explanations for trading terms.
 * Used by the Tooltip component to explain concepts to novices.
 */

export const GLOSSARY: Record<string, string> = {
  // Setup types
  "trend_continuation": "The price is already moving in one direction and is likely to keep going. You trade with the existing momentum.",
  "pullback": "The price has temporarily dipped against the main trend. This can be a good entry point before the trend resumes.",
  "breakout": "The price has been stuck in a range and is now breaking out. This often leads to a strong directional move.",
  "mean_reversion": "The price has moved too far too fast and is likely to snap back toward its average. You trade the reversal.",
  "event_driven": "A scheduled economic release or news event is expected to move the market. You position before or react after.",

  // Regime terms
  "strong_up": "Prices are rising strongly across all timeframes. The market has clear upward momentum.",
  "up": "Prices are generally rising, though not as aggressively. The trend favours buyers.",
  "flat": "No clear direction. The market is moving sideways, often waiting for a catalyst.",
  "down": "Prices are generally falling. The trend favours sellers or short positions.",
  "strong_down": "Prices are falling strongly across all timeframes. Clear downward momentum.",

  // Volatility
  "extreme": "Price swings are much larger than normal. High risk — positions can move sharply against you.",
  "elevated": "More price movement than usual. Wider stop losses may be needed.",
  "normal": "Typical market conditions. Standard risk parameters apply.",
  "compressed": "Unusually low volatility. The market is coiling — a breakout in either direction may follow.",

  // Style terms
  "Trend continuation": "Trading in the direction of the existing trend. Works best when momentum is strong and timeframes agree.",
  "Pullback entry": "Buying a dip in an uptrend or selling a rally in a downtrend. The trend does the work.",
  "Breakout": "Entering when price breaks through a key level. Requires volume confirmation to avoid false breaks.",
  "Range trading": "Buying near support and selling near resistance in a sideways market.",
  "Mean reversion (cautious)": "Fading an extreme move. Higher risk — only works when the trend isn't strong.",

  // Signal terms
  "trend alignment": "How well short-term, medium-term, and long-term price movements agree on direction. 100% = all aligned.",
  "vol ratio": "Current volatility compared to the recent average. Above 1.5 = elevated. Below 0.6 = compressed.",
  "win rate": "Percentage of similar historical setups that were profitable. Higher = more reliable pattern.",
  "profit factor": "Total gains divided by total losses from historical setups. Above 1.5 = good. Above 2.0 = strong.",
  "confidence": "How strong the evidence is for this trade idea, based on historical data, regime fit, and signal alignment.",

  // General
  "long": "Buying an asset expecting the price to go up. You profit when the price rises.",
  "short": "Selling an asset expecting the price to go down. You profit when the price falls.",
  "stop loss": "A price level where you exit to limit losses. Essential risk management.",
  "take profit": "A price level where you exit to lock in gains.",
  "risk/reward": "How much you stand to gain vs how much you risk. 2:1 means potential gain is twice the potential loss.",
};

/**
 * Get explanation for a term. Case-insensitive, tries exact match then fuzzy.
 */
export function explain(term: string): string | null {
  // Exact match
  if (GLOSSARY[term]) return GLOSSARY[term];

  // Case-insensitive
  const lower = term.toLowerCase();
  for (const [key, value] of Object.entries(GLOSSARY)) {
    if (key.toLowerCase() === lower) return value;
  }

  return null;
}
