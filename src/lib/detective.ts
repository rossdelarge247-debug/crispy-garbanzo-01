/**
 * Detective Mode — monitors events for pre-release intelligence.
 *
 * Stores watched events in localStorage. On each poll:
 * - Fetches latest news headlines for the event
 * - Checks social sentiment for shifts
 * - Compares with previous snapshot
 * - If something changed, creates an alert
 *
 * Polling happens client-side when the user has the app open.
 * Email alerts are a placeholder for future Vercel cron integration.
 */

export interface DetectiveWatch {
  id: string;
  eventTitle: string;
  eventDate: string;
  primaryAsset: string;
  email?: string;
  createdAt: string;
  lastChecked?: string;
  lastSnapshot?: DetectiveSnapshot;
}

export interface DetectiveSnapshot {
  timestamp: string;
  headlineCount: number;
  topHeadlines: string[];
  sentimentLabel: string;
  sentimentScore: number;
}

export interface DetectiveAlert {
  id: string;
  watchId: string;
  eventTitle: string;
  type: "new_headline" | "sentiment_shift" | "volume_spike";
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
}

const WATCHES_KEY = "trade-wizard-detective-watches";
const ALERTS_KEY = "trade-wizard-detective-alerts";

// Watches
export function loadWatches(): DetectiveWatch[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(WATCHES_KEY) || "[]"); }
  catch { return []; }
}

export function saveWatch(watch: DetectiveWatch): void {
  const all = loadWatches();
  if (all.some(w => w.id === watch.id)) return;
  all.push(watch);
  localStorage.setItem(WATCHES_KEY, JSON.stringify(all));
}

export function removeWatch(id: string): void {
  const all = loadWatches().filter(w => w.id !== id);
  localStorage.setItem(WATCHES_KEY, JSON.stringify(all));
}

export function isWatching(eventTitle: string): boolean {
  return loadWatches().some(w => w.eventTitle === eventTitle);
}

// Alerts
export function loadDetectiveAlerts(): DetectiveAlert[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]"); }
  catch { return []; }
}

function saveDetectiveAlerts(alerts: DetectiveAlert[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
}

export function addDetectiveAlert(alert: Omit<DetectiveAlert, "id" | "createdAt" | "read">): void {
  const all = loadDetectiveAlerts();
  // Deduplicate
  if (all.some(a => a.title === alert.title && Date.now() - new Date(a.createdAt).getTime() < 3600_000)) return;
  all.unshift({ ...alert, id: `det-${Date.now()}`, createdAt: new Date().toISOString(), read: false });
  saveDetectiveAlerts(all);
}

export function markDetectiveAlertRead(id: string): void {
  const all = loadDetectiveAlerts();
  const a = all.find(x => x.id === id);
  if (a) a.read = true;
  saveDetectiveAlerts(all);
}

export function getUnreadDetectiveCount(): number {
  return loadDetectiveAlerts().filter(a => !a.read).length;
}

/**
 * Poll all watched events for new intelligence.
 * Call this periodically (e.g., every 5 minutes when app is open).
 */
export async function pollWatches(): Promise<number> {
  const watches = loadWatches();
  let newAlerts = 0;

  for (const watch of watches) {
    // Skip if event has passed
    if (new Date(watch.eventDate).getTime() < Date.now() - 24 * 3600_000) continue;

    try {
      const res = await fetch(`/api/social-listen?event=${encodeURIComponent(watch.eventTitle)}&asset=${watch.primaryAsset}`);
      if (!res.ok) continue;
      const data = await res.json();

      const snapshot: DetectiveSnapshot = {
        timestamp: new Date().toISOString(),
        headlineCount: data.clues?.length ?? 0,
        topHeadlines: data.clues?.slice(0, 3).map((c: { title: string }) => c.title) ?? [],
        sentimentLabel: data.compositeLabel ?? "neutral",
        sentimentScore: data.signals?.[0]?.score ?? 0,
      };

      const prev = watch.lastSnapshot;

      // Detect changes
      if (prev) {
        // New headlines
        const newHeadlines = snapshot.topHeadlines.filter(h => !prev.topHeadlines.includes(h));
        if (newHeadlines.length > 0) {
          addDetectiveAlert({
            watchId: watch.id, eventTitle: watch.eventTitle, type: "new_headline",
            title: `New intelligence: ${watch.eventTitle}`,
            detail: newHeadlines[0],
          });
          newAlerts++;
        }

        // Sentiment shift
        if (prev.sentimentLabel !== snapshot.sentimentLabel && snapshot.sentimentLabel !== "unavailable") {
          addDetectiveAlert({
            watchId: watch.id, eventTitle: watch.eventTitle, type: "sentiment_shift",
            title: `Sentiment shifted: ${watch.eventTitle}`,
            detail: `${prev.sentimentLabel} → ${snapshot.sentimentLabel}`,
          });
          newAlerts++;
        }
      }

      // Update snapshot
      watch.lastChecked = new Date().toISOString();
      watch.lastSnapshot = snapshot;
    } catch {}
  }

  // Save updated watches with new snapshots
  if (typeof window !== "undefined") {
    localStorage.setItem(WATCHES_KEY, JSON.stringify(watches));
  }

  return newAlerts;
}
