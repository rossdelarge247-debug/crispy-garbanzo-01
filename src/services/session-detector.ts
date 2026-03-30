/**
 * Session Detector — knows what trading session is active.
 */

import type { SessionState } from "@/types/mission-control";

export function getCurrentSession(assetClass: string): { state: SessionState; label: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const time = utcHour + utcMin / 60;

  // Crypto is always open
  if (assetClass === "crypto") {
    return { state: "crypto_24h", label: "24/7" };
  }

  // Weekend
  const day = now.getUTCDay();
  if (day === 0 || day === 6) {
    return { state: "closed", label: "Weekend" };
  }

  // FX / commodity sessions
  if (time >= 8 && time < 13) return { state: "london", label: "London" };
  if (time >= 13 && time < 16.5) return { state: "overlap", label: "London/NY overlap" };
  if (time >= 16.5 && time < 21) return { state: "ny", label: "New York" };
  if (time >= 0 && time < 8) return { state: "asia", label: "Asia" };

  return { state: "closed", label: "After hours" };
}
