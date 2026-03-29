/**
 * Session Awareness — Trade Wizard 2.0
 *
 * Detects the current trading session state so the app
 * can behave differently at different times of day.
 */

export type SessionState = "pre_market" | "market_open" | "post_market" | "closed" | "weekend";

export interface SessionInfo {
  state: SessionState;
  label: string;
  description: string;
  emoji: string;
  nextEvent: string; // e.g., "Market opens in 2h 15m"
  isActionable: boolean; // can we trade right now?
}

// US Eastern Time market hours
const MARKET_OPEN_HOUR = 9;  // 9:30 AM ET
const MARKET_OPEN_MIN = 30;
const MARKET_CLOSE_HOUR = 16; // 4:00 PM ET
const PRE_MARKET_HOUR = 4;    // 4:00 AM ET
const POST_MARKET_HOUR = 20;  // 8:00 PM ET

function getETTime(): Date {
  // Get current time in US/Eastern
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return et;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getSessionInfo(): SessionInfo {
  const et = getETTime();
  const day = et.getDay(); // 0 = Sunday
  const hour = et.getHours();
  const min = et.getMinutes();
  const timeInMinutes = hour * 60 + min;

  const marketOpenMin = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MIN; // 570
  const marketCloseMin = MARKET_CLOSE_HOUR * 60; // 960
  const preMarketMin = PRE_MARKET_HOUR * 60; // 240
  const postMarketMin = POST_MARKET_HOUR * 60; // 1200

  // Weekend
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2;
    return {
      state: "weekend",
      label: "Weekend",
      description: "Markets are closed for the weekend. Time to prep for Monday.",
      emoji: "🌙",
      nextEvent: `Markets open Monday ${daysUntilMonday === 1 ? "tomorrow" : "in 2 days"}`,
      isActionable: false,
    };
  }

  // Pre-market (4 AM - 9:30 AM ET)
  if (timeInMinutes >= preMarketMin && timeInMinutes < marketOpenMin) {
    const minsUntilOpen = marketOpenMin - timeInMinutes;
    return {
      state: "pre_market",
      label: "Pre-market",
      description: "Markets haven't opened yet. Great time to review today's setups and prep your game plan.",
      emoji: "🌅",
      nextEvent: `Market opens in ${formatDuration(minsUntilOpen * 60 * 1000)}`,
      isActionable: false,
    };
  }

  // Market open (9:30 AM - 4:00 PM ET)
  if (timeInMinutes >= marketOpenMin && timeInMinutes < marketCloseMin) {
    const minsUntilClose = marketCloseMin - timeInMinutes;
    return {
      state: "market_open",
      label: "Market open",
      description: "Markets are live. The wizard is watching your focus universe.",
      emoji: "🟢",
      nextEvent: `Market closes in ${formatDuration(minsUntilClose * 60 * 1000)}`,
      isActionable: true,
    };
  }

  // Post-market (4:00 PM - 8:00 PM ET)
  if (timeInMinutes >= marketCloseMin && timeInMinutes < postMarketMin) {
    return {
      state: "post_market",
      label: "After hours",
      description: "Regular session is over. Review how today's setups played out and plan for tomorrow.",
      emoji: "🌆",
      nextEvent: "Regular session closed. After-hours trading available on some platforms.",
      isActionable: false,
    };
  }

  // Closed (8 PM - 4 AM ET)
  return {
    state: "closed",
    label: "Markets closed",
    description: "Markets are closed. Tomorrow's briefing will be ready when you wake up.",
    emoji: "🌙",
    nextEvent: "Pre-market starts at 4:00 AM ET",
    isActionable: false,
  };
}

// For crypto (24/7)
export function isCryptoOpen(): boolean {
  return true; // crypto never sleeps
}
