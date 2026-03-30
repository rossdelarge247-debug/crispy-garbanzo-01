/**
 * Alert System — generates and stores alerts from regime changes,
 * setup formation, events, and risk conditions.
 */

import type { InstrumentSummary, Setup } from "@/types/mission-control";

export type AlertType = "regime_shift" | "setup_formed" | "event_imminent" | "risk";

export interface Alert {
  id: string;
  type: AlertType;
  symbol: string;
  instrumentName: string;
  title: string;
  detail: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "trade-wizard-alerts";

function loadAlerts(): Alert[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveAlerts(alerts: Alert[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)));
}

function addAlert(alert: Omit<Alert, "id" | "createdAt" | "read">): void {
  const all = loadAlerts();
  // Deduplicate: don't add if same title exists within last hour
  const recent = all.find(a => a.title === alert.title && Date.now() - new Date(a.createdAt).getTime() < 3600_000);
  if (recent) return;

  all.unshift({
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveAlerts(all);
}

export function markAlertRead(id: string): void {
  const all = loadAlerts();
  const alert = all.find(a => a.id === id);
  if (alert) alert.read = true;
  saveAlerts(all);
}

export function markAllRead(): void {
  const all = loadAlerts();
  all.forEach(a => a.read = true);
  saveAlerts(all);
}

export function getAlerts(): Alert[] {
  return loadAlerts();
}

export function getUnreadCount(): number {
  return loadAlerts().filter(a => !a.read).length;
}

/**
 * Generate alerts from instrument data. Called after each Mission Control refresh.
 */
export function generateAlerts(instruments: InstrumentSummary[]): void {
  for (const inst of instruments) {
    // Setup formation alerts
    for (const setup of inst.setups) {
      if (setup.confidence >= 65) {
        addAlert({
          type: "setup_formed",
          symbol: inst.symbol,
          instrumentName: inst.name,
          title: `${setup.typeLabel}: ${inst.name}`,
          detail: setup.label,
          urgency: setup.confidence >= 75 ? "high" : "medium",
        });
      }
    }

    // Event risk alerts
    if (inst.regime.eventRisk === "high") {
      const nextEvent = inst.regime.upcomingEvents[0];
      addAlert({
        type: "event_imminent",
        symbol: inst.symbol,
        instrumentName: inst.name,
        title: `Event risk: ${inst.name}`,
        detail: nextEvent ? `${nextEvent.title} — ${nextEvent.impact} impact` : "High-impact event imminent",
        urgency: "high",
      });
    }

    // Volatility alerts
    if (inst.regime.volatility === "extreme") {
      addAlert({
        type: "risk",
        symbol: inst.symbol,
        instrumentName: inst.name,
        title: `Extreme volatility: ${inst.name}`,
        detail: inst.regime.volatilityLabel,
        urgency: "high",
      });
    }

    // Compressed vol = breakout watch
    if (inst.regime.volatility === "compressed") {
      addAlert({
        type: "regime_shift",
        symbol: inst.symbol,
        instrumentName: inst.name,
        title: `Breakout watch: ${inst.name}`,
        detail: "Volatility compressed — potential breakout forming",
        urgency: "medium",
      });
    }
  }
}
