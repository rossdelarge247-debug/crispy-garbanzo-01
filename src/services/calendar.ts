import type { EconomicEvent } from "@/types";
import { isCircuitOpen, markSourceFailed, FEED_CONFIGS } from "@/services/feed-cache";

export interface CalendarProvider {
  getUpcomingEvents(days?: number): Promise<EconomicEvent[]>;
  getEventsByCountry(country: string): Promise<EconomicEvent[]>;
}

// ---------------------------------------------------------------------------
// Forex Factory Calendar — free, no API key required
// Fetches this week + next week for full 14-day coverage
// ---------------------------------------------------------------------------

interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

function mapFFCountry(currency: string): string {
  const map: Record<string, string> = {
    USD: "US", EUR: "EU", GBP: "GB", JPY: "JP",
    CAD: "CA", AUD: "AU", NZD: "NZ", CHF: "CH", CNY: "CN",
  };
  return map[currency] || currency;
}

function mapFFImpact(impact: string): "high" | "medium" | "low" {
  const normalized = impact.toLowerCase();
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

class ForexFactoryCalendarProvider implements CalendarProvider {
  private urls = [
    "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json",
    "https://cdn-nfs.faireconomy.media/ff_calendar_nextweek.json",
  ];

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    const feedConfig = FEED_CONFIGS.calendar();
    if (isCircuitOpen(feedConfig)) {
      return []; // No mock — return empty if circuit is open
    }

    try {
      const results = await Promise.all(
        this.urls.map(async (url) => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
              signal: controller.signal,
              next: { revalidate: 600 },
            });
            clearTimeout(timer);
            if (!response.ok) return [];
            const data: ForexFactoryEvent[] = await response.json();
            if (!Array.isArray(data)) return [];
            return data;
          } catch { return []; }
        })
      );

      const allData = results.flat();

      if (allData.length === 0) {
        markSourceFailed("forex_factory");
        return []; // No mock — return empty
      }

      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(now.getDate() + days);

      return allData
        .filter((evt) => evt.impact.toLowerCase() !== "holiday")
        .filter((evt) => {
          const eventDate = new Date(evt.date);
          return eventDate >= now && eventDate <= cutoff;
        })
        .map((evt, i) => ({
          id: `ff-${i}-${new Date(evt.date).getTime()}`,
          title: evt.title,
          country: mapFFCountry(evt.country),
          date: new Date(evt.date).toISOString(),
          impact: mapFFImpact(evt.impact),
          forecast: evt.forecast || undefined,
          previous: evt.previous || undefined,
        }));
    } catch {
      markSourceFailed("forex_factory");
      return []; // No mock — return empty
    }
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(14);
    return events.filter(e => e.country === country);
  }
}

// ---------------------------------------------------------------------------
// Finnhub Economic Calendar API (requires paid plan)
// ---------------------------------------------------------------------------

interface FinnhubEvent {
  actual?: string;
  country: string;
  estimate?: string;
  event: string;
  impact: string;
  prev?: string;
  time: string;
  unit?: string;
}

interface FinnhubCalendarResponse {
  economicCalendar?: FinnhubEvent[];
}

function mapFinnhubImpact(impact: string): "high" | "medium" | "low" {
  const normalized = impact.toLowerCase();
  if (normalized === "high" || normalized === "3") return "high";
  if (normalized === "medium" || normalized === "2") return "medium";
  return "low";
}

function mapFinnhubCountry(country: string): string {
  const map: Record<string, string> = {
    US: "US", CA: "CA",
    DE: "EU", FR: "EU", IT: "EU", ES: "EU", NL: "EU", EU: "EU",
    GB: "GB", JP: "JP", CN: "CN", AU: "AU",
  };
  return map[country.toUpperCase()] || country.toUpperCase();
}

function formatFinnhubValue(value: string | undefined, unit: string | undefined): string | undefined {
  if (!value || value === "") return undefined;
  if (unit === "%") return `${value}%`;
  if (unit === "K" || unit === "k") return `${value}K`;
  if (unit === "M" || unit === "m") return `${value}M`;
  if (unit === "B" || unit === "b") return `${value}B`;
  return value;
}

class FinnhubCalendarProvider implements CalendarProvider {
  private apiKey: string;
  private baseUrl = "https://finnhub.io/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);

    try {
      const response = await fetch(
        `${this.baseUrl}/calendar/economic?from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}&token=${this.apiKey}`,
        { next: { revalidate: 600 } }
      );

      if (!response.ok) {
        return new ForexFactoryCalendarProvider().getUpcomingEvents(days);
      }

      const data: FinnhubCalendarResponse = await response.json();

      if (!data.economicCalendar || data.economicCalendar.length === 0) {
        return [];
      }

      return data.economicCalendar.map((evt, i) => ({
        id: `finnhub-${i}-${evt.time.replace(/\s/g, "")}`,
        title: evt.event,
        country: mapFinnhubCountry(evt.country),
        date: evt.time.includes("T") ? evt.time : `${evt.time.replace(" ", "T")}Z`,
        impact: mapFinnhubImpact(evt.impact),
        actual: formatFinnhubValue(evt.actual, evt.unit),
        forecast: formatFinnhubValue(evt.estimate, evt.unit),
        previous: formatFinnhubValue(evt.prev, evt.unit),
      }));
    } catch {
      return new ForexFactoryCalendarProvider().getUpcomingEvents(days);
    }
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(30);
    return events.filter(e => e.country === country);
  }
}

// ---------------------------------------------------------------------------
// Factory — Finnhub (paid) → Forex Factory (free) → empty
// No mock data. If no source works, the dashboard shows "no events".
// ---------------------------------------------------------------------------
export function getCalendarProvider(): CalendarProvider {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) return new FinnhubCalendarProvider(finnhubKey);
  return new ForexFactoryCalendarProvider();
}
