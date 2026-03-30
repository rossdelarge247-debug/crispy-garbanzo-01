/**
 * Setup Detector — identifies specific trade setups from regime + signal data.
 *
 * Five setup types, each with clear detection logic:
 * 1. Trend continuation — strong trend, momentum aligned
 * 2. Pullback — trending but price pulled back toward mean
 * 3. Breakout — compressed vol, price near range extreme
 * 4. Mean reversion — price at extreme, stretched from mean
 * 5. Event-driven — high-impact calendar event imminent
 *
 * Reuses: SignalProfile (momentum, vol, trend, position, volume)
 *         InstrumentRegime (trend state, volatility state, events)
 */

import type { Setup, SetupType, InstrumentRegime } from "@/types/mission-control";
import type { Direction } from "@/types";
import type { SignalProfile } from "@/services/signal-profile";
import { getAssetDisplayName } from "@/lib/asset-names";

// ---------------------------------------------------------------------------
// Detection functions
// ---------------------------------------------------------------------------

function detectTrendContinuation(
  symbol: string, regime: InstrumentRegime, profile: SignalProfile
): Setup | null {
  if (regime.trend !== "strong_up" && regime.trend !== "strong_down" && regime.trend !== "up" && regime.trend !== "down") return null;
  if (profile.trendAlignment < 0.6) return null;

  const isUp = regime.trend.includes("up");
  const direction: Direction = isUp ? "long" : "short";
  const strong = regime.trend.startsWith("strong");
  const name = getAssetDisplayName(symbol);

  return {
    id: `setup-tc-${symbol}`,
    symbol,
    type: "trend_continuation",
    typeLabel: "Trend continuation",
    direction,
    label: `${name} ${isUp ? "uptrend" : "downtrend"} continuation`,
    thesis: `${name} is in a ${strong ? "strong " : ""}${isUp ? "uptrend" : "downtrend"} with ${(profile.trendAlignment * 100).toFixed(0)}% timeframe alignment. Momentum supports continuation.`,
    confidence: strong ? 75 : 65,
    entryCondition: "At current levels, with trend",
    stopLoss: isUp ? `Below ${(profile.price * 0.97).toFixed(2)}` : `Above ${(profile.price * 1.03).toFixed(2)}`,
    target: isUp ? `${(profile.price * 1.04).toFixed(2)}` : `${(profile.price * 0.96).toFixed(2)}`,
    holdPeriod: "3-7 days",
    regime,
    detectedAt: new Date().toISOString(),
  };
}

function detectPullback(
  symbol: string, regime: InstrumentRegime, profile: SignalProfile
): Setup | null {
  if (regime.trend !== "up" && regime.trend !== "strong_up" && regime.trend !== "down" && regime.trend !== "strong_down") return null;

  const isUp = regime.trend.includes("up");
  const name = getAssetDisplayName(symbol);

  // Pullback: trending but price has retraced from recent extreme
  if (isUp && profile.distFromHigh30d > -2) return null; // not enough pullback
  if (isUp && profile.distFromHigh30d < -10) return null; // too deep, might be reversing
  if (!isUp && profile.distFromLow30d < 2) return null;
  if (!isUp && profile.distFromLow30d > 10) return null;

  const pullbackPct = isUp ? Math.abs(profile.distFromHigh30d) : profile.distFromLow30d;

  return {
    id: `setup-pb-${symbol}`,
    symbol,
    type: "pullback",
    typeLabel: "Pullback in trend",
    direction: isUp ? "long" : "short",
    label: `${name} ${pullbackPct.toFixed(1)}% pullback in ${isUp ? "uptrend" : "downtrend"}`,
    thesis: `${name} has pulled back ${pullbackPct.toFixed(1)}% from its 30-day ${isUp ? "high" : "low"} while the broader trend remains intact. This is a potential entry point.`,
    confidence: 70,
    entryCondition: "At current levels — the pullback is the entry",
    stopLoss: isUp ? `Below ${(profile.price * 0.96).toFixed(2)}` : `Above ${(profile.price * 1.04).toFixed(2)}`,
    target: isUp ? `Retest of 30-day high` : `Retest of 30-day low`,
    holdPeriod: "3-10 days",
    regime,
    detectedAt: new Date().toISOString(),
  };
}

function detectBreakout(
  symbol: string, regime: InstrumentRegime, profile: SignalProfile
): Setup | null {
  // Breakout: compressed volatility + price near range edge + volume pickup
  if (regime.volatility !== "compressed" && regime.volatility !== "normal") return null;
  if (regime.trend !== "flat") return null;

  const nearHigh = Math.abs(profile.distFromHigh30d) < 3;
  const nearLow = profile.distFromLow30d < 3;
  if (!nearHigh && !nearLow) return null;

  const direction: Direction = nearHigh ? "long" : "short";
  const name = getAssetDisplayName(symbol);

  return {
    id: `setup-bo-${symbol}`,
    symbol,
    type: "breakout",
    typeLabel: "Breakout",
    direction,
    label: `${name} breakout ${nearHigh ? "above resistance" : "below support"}`,
    thesis: `${name} is ${regime.volatilityLabel.toLowerCase()} and pressing against its 30-day ${nearHigh ? "high" : "low"}. Volume is ${profile.volumeRatio > 1.2 ? "picking up" : "average"}. A breakout could trigger a directional move.`,
    confidence: profile.volumeRatio > 1.2 ? 68 : 58,
    entryCondition: nearHigh ? `On break above 30-day high` : `On break below 30-day low`,
    stopLoss: nearHigh ? `Below ${(profile.price * 0.97).toFixed(2)}` : `Above ${(profile.price * 1.03).toFixed(2)}`,
    target: nearHigh ? `${(profile.price * 1.05).toFixed(2)}` : `${(profile.price * 0.95).toFixed(2)}`,
    holdPeriod: "1-5 days",
    regime,
    detectedAt: new Date().toISOString(),
  };
}

function detectMeanReversion(
  symbol: string, regime: InstrumentRegime, profile: SignalProfile
): Setup | null {
  // Mean reversion: price at extreme stretch from mean
  if (regime.trend === "strong_up" || regime.trend === "strong_down") return null; // don't fade strong trends

  const name = getAssetDisplayName(symbol);
  const stretchedUp = profile.return7d > 5 && Math.abs(profile.distFromHigh30d) < 2;
  const stretchedDown = profile.return7d < -5 && profile.distFromLow30d < 3;

  if (!stretchedUp && !stretchedDown) return null;

  const direction: Direction = stretchedUp ? "short" : "long";

  return {
    id: `setup-mr-${symbol}`,
    symbol,
    type: "mean_reversion",
    typeLabel: "Mean reversion",
    direction,
    label: `${name} ${stretchedUp ? "overbought" : "oversold"} snap-back`,
    thesis: `${name} has moved ${Math.abs(profile.return7d).toFixed(1)}% in 7 days and is near its 30-day ${stretchedUp ? "high" : "low"}. Without a strong trend, this stretch often reverts.`,
    confidence: Math.abs(profile.return7d) > 8 ? 65 : 55,
    entryCondition: "At current levels",
    stopLoss: stretchedUp ? `Above ${(profile.price * 1.02).toFixed(2)}` : `Below ${(profile.price * 0.98).toFixed(2)}`,
    target: "Reversion toward 20-day average",
    holdPeriod: "1-5 days",
    regime,
    detectedAt: new Date().toISOString(),
  };
}

function detectEventDriven(
  symbol: string, regime: InstrumentRegime
): Setup[] {
  if (regime.upcomingEvents.length === 0) return [];

  const name = getAssetDisplayName(symbol);
  const setups: Setup[] = [];

  for (const event of regime.upcomingEvents.slice(0, 2)) {
    if (event.impact !== "high") continue;

    const hoursAway = (new Date(event.date).getTime() - Date.now()) / (1000 * 3600);
    if (hoursAway < 0 || hoursAway > 72) continue;

    setups.push({
      id: `setup-ev-${symbol}-${event.title.slice(0, 10).replace(/\s/g, "")}`,
      symbol,
      type: "event_driven",
      typeLabel: "Event-driven",
      direction: "long", // direction depends on the specific event — Claude can refine
      label: `${name} — ${event.title}`,
      thesis: `${event.title} in ${hoursAway < 24 ? Math.round(hoursAway) + " hours" : Math.round(hoursAway / 24) + " days"}. This event historically moves ${name}.`,
      confidence: hoursAway < 12 ? 72 : 65,
      entryCondition: `Before ${event.title}`,
      stopLoss: "2% from entry",
      target: "3-5% move on event reaction",
      holdPeriod: "Through the event",
      catalyst: event.title,
      regime,
      detectedAt: new Date().toISOString(),
    });
  }

  return setups;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function detectSetups(
  symbol: string,
  regime: InstrumentRegime,
  profile: SignalProfile | null
): Setup[] {
  const setups: Setup[] = [];

  if (profile) {
    const tc = detectTrendContinuation(symbol, regime, profile);
    if (tc) setups.push(tc);

    const pb = detectPullback(symbol, regime, profile);
    if (pb) setups.push(pb);

    const bo = detectBreakout(symbol, regime, profile);
    if (bo) setups.push(bo);

    const mr = detectMeanReversion(symbol, regime, profile);
    if (mr) setups.push(mr);
  }

  const ev = detectEventDriven(symbol, regime);
  setups.push(...ev);

  // Assign trade day to each setup
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const todayDay = now.getDay();

  for (const setup of setups) {
    let targetDate: Date | null = null;

    // Event-driven: use the event date
    if (setup.type === "event_driven" && setup.catalyst) {
      const event = regime.upcomingEvents.find(e => e.title === setup.catalyst);
      if (event?.date) targetDate = new Date(event.date);
    }

    // Non-event setups: today if market is open, else next trading day
    if (!targetDate) {
      targetDate = new Date(now);
      // If weekend, push to Monday
      if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
      if (targetDate.getDay() === 6) targetDate.setDate(targetDate.getDate() + 2);
    }

    const targetDay = targetDate.getDay();
    const dayName = DAYS[targetDay];
    const diffDays = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let label = dayName;
    if (diffDays <= 0) label = `${dayName} (Today)`;
    else if (diffDays === 1) label = `${dayName} (Tomorrow)`;

    setup.tradeDay = dayName;
    setup.tradeDayLabel = label;
    setup.tradeDayDate = targetDate.toISOString().split("T")[0];
  }

  setups.sort((a, b) => b.confidence - a.confidence);
  return setups;
}
