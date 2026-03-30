import type { EconomicEvent } from "@/types";
import { isCircuitOpen, markSourceFailed, FEED_CONFIGS } from "@/services/feed-cache";

export interface CalendarProvider {
  getUpcomingEvents(days?: number): Promise<EconomicEvent[]>;
  getEventsByCountry(country: string): Promise<EconomicEvent[]>;
}

// ---------------------------------------------------------------------------
// Mock provider — static events for demo mode
// ---------------------------------------------------------------------------
class MockCalendarProvider implements CalendarProvider {
  private generateEvents(): EconomicEvent[] {
    const now = new Date();
    const events: EconomicEvent[] = [];
    let id = 1;

    // Comprehensive economic calendar — covers US, UK, EU, JP, CN, INT
    const templates = [
      // US — High impact
      { title: "FOMC Rate Decision", country: "US", impact: "high" as const, dayOffset: 2, hour: 18, forecast: "4.25%", previous: "4.50%" },
      { title: "Non-Farm Payrolls", country: "US", impact: "high" as const, dayOffset: 4, hour: 13, forecast: "185K", previous: "275K" },
      { title: "US CPI (YoY)", country: "US", impact: "high" as const, dayOffset: 5, hour: 13, forecast: "3.1%", previous: "3.2%" },
      { title: "US Core CPI (MoM)", country: "US", impact: "high" as const, dayOffset: 5, hour: 13, forecast: "0.3%", previous: "0.4%" },
      { title: "US Core PCE Price Index (YoY)", country: "US", impact: "high" as const, dayOffset: 8, hour: 13, forecast: "2.7%", previous: "2.8%" },
      { title: "US Retail Sales (MoM)", country: "US", impact: "high" as const, dayOffset: 7, hour: 13, forecast: "0.4%", previous: "0.6%" },
      { title: "Fed Chair Powell Speaks", country: "US", impact: "high" as const, dayOffset: 3, hour: 17, forecast: undefined, previous: undefined },
      // US — Medium impact
      { title: "US ISM Manufacturing PMI", country: "US", impact: "medium" as const, dayOffset: 1, hour: 15, forecast: "50.5", previous: "50.3" },
      { title: "US ISM Services PMI", country: "US", impact: "medium" as const, dayOffset: 3, hour: 15, forecast: "52.1", previous: "51.5" },
      { title: "US Initial Jobless Claims", country: "US", impact: "medium" as const, dayOffset: 4, hour: 13, forecast: "215K", previous: "210K" },
      { title: "US Durable Goods Orders", country: "US", impact: "medium" as const, dayOffset: 6, hour: 13, forecast: "1.2%", previous: "-0.8%" },
      { title: "US Consumer Confidence", country: "US", impact: "medium" as const, dayOffset: 2, hour: 15, forecast: "104.5", previous: "102.9" },
      { title: "US PPI (MoM)", country: "US", impact: "medium" as const, dayOffset: 6, hour: 13, forecast: "0.2%", previous: "0.3%" },

      // UK — High impact
      { title: "BoE Interest Rate Decision", country: "GB", impact: "high" as const, dayOffset: 4, hour: 12, forecast: "4.50%", previous: "4.50%" },
      { title: "UK CPI (YoY)", country: "GB", impact: "high" as const, dayOffset: 3, hour: 7, forecast: "3.0%", previous: "3.2%" },
      { title: "UK GDP (QoQ)", country: "GB", impact: "high" as const, dayOffset: 9, hour: 7, forecast: "0.3%", previous: "0.1%" },
      // UK — Medium impact
      { title: "UK Employment Change", country: "GB", impact: "medium" as const, dayOffset: 2, hour: 7, forecast: "25K", previous: "15K" },
      { title: "UK Retail Sales (MoM)", country: "GB", impact: "medium" as const, dayOffset: 5, hour: 7, forecast: "0.5%", previous: "-0.3%" },
      { title: "UK Manufacturing PMI", country: "GB", impact: "medium" as const, dayOffset: 1, hour: 9, forecast: "48.5", previous: "47.9" },
      { title: "UK Services PMI", country: "GB", impact: "medium" as const, dayOffset: 1, hour: 9, forecast: "54.2", previous: "53.8" },
      { title: "UK Average Earnings (3Mo/YoY)", country: "GB", impact: "medium" as const, dayOffset: 2, hour: 7, forecast: "5.8%", previous: "5.9%" },
      { title: "BoE Governor Bailey Speaks", country: "GB", impact: "medium" as const, dayOffset: 5, hour: 10, forecast: undefined, previous: undefined },

      // Eurozone
      { title: "ECB Interest Rate Decision", country: "EU", impact: "high" as const, dayOffset: 3, hour: 12, forecast: "3.50%", previous: "3.75%" },
      { title: "Eurozone CPI Flash (YoY)", country: "EU", impact: "medium" as const, dayOffset: 7, hour: 10, forecast: "2.4%", previous: "2.6%" },
      { title: "Eurozone GDP (QoQ)", country: "EU", impact: "medium" as const, dayOffset: 8, hour: 10, forecast: "0.2%", previous: "0.1%" },
      { title: "ECB President Lagarde Speaks", country: "EU", impact: "medium" as const, dayOffset: 4, hour: 14, forecast: undefined, previous: undefined },
      { title: "Germany Manufacturing PMI", country: "EU", impact: "medium" as const, dayOffset: 1, hour: 9, forecast: "43.5", previous: "42.8" },

      // Japan
      { title: "Bank of Japan Rate Decision", country: "JP", impact: "high" as const, dayOffset: 6, hour: 3, forecast: "0.25%", previous: "0.25%" },
      { title: "Japan CPI (YoY)", country: "JP", impact: "medium" as const, dayOffset: 5, hour: 0, forecast: "3.2%", previous: "3.0%" },

      // China
      { title: "China Manufacturing PMI", country: "CN", impact: "medium" as const, dayOffset: 9, hour: 2, forecast: "50.1", previous: "49.8" },
      { title: "China GDP (YoY)", country: "CN", impact: "high" as const, dayOffset: 10, hour: 2, forecast: "5.0%", previous: "4.9%" },

      // International
      { title: "OPEC+ Ministerial Meeting", country: "INT", impact: "high" as const, dayOffset: 8, hour: 10, forecast: undefined, previous: undefined },

      // Canada / Australia
      { title: "BoC Interest Rate Decision", country: "CA", impact: "high" as const, dayOffset: 3, hour: 15, forecast: "3.75%", previous: "4.00%" },
      { title: "RBA Interest Rate Decision", country: "AU", impact: "high" as const, dayOffset: 2, hour: 4, forecast: "4.10%", previous: "4.35%" },
      { title: "Australia Employment Change", country: "AU", impact: "medium" as const, dayOffset: 4, hour: 1, forecast: "30K", previous: "25K" },
    ];

    for (const t of templates) {
      const d = new Date(now);
      d.setDate(d.getDate() + t.dayOffset);
      d.setHours(t.hour, 30, 0, 0);

      events.push({
        id: `evt-${String(id++).padStart(3, "0")}`,
        title: t.title,
        country: t.country,
        date: d.toISOString(),
        impact: t.impact,
        forecast: t.forecast,
        previous: t.previous,
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    const events = this.generateEvents();
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + days);
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= now && eventDate <= cutoff;
    });
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    return this.generateEvents().filter(e => e.country === country);
  }
}

// ---------------------------------------------------------------------------
// Forex Factory Calendar — free, no API key required
// Source: https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json
//
// Response: array of objects:
// {
//   "title": "Non-Farm Employment Change",
//   "country": "USD",
//   "date": "2026-03-28T12:30:00-04:00",
//   "impact": "High",
//   "forecast": "185K",
//   "previous": "275K"
// }
//
// Notes:
// - "country" is actually a currency code (USD, EUR, GBP, JPY, etc.)
// - "impact" is capitalized: "High", "Medium", "Low", "Holiday"
// - Only returns this week's events
// - Rate limit: 2 requests per 5 minutes
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
    USD: "US",
    EUR: "EU",
    GBP: "GB",
    JPY: "JP",
    CAD: "CA",
    AUD: "AU",
    NZD: "NZ",
    CHF: "CH",
    CNY: "CN",
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
      return new MockCalendarProvider().getUpcomingEvents(days);
    }

    try {
      // Fetch this week AND next week in parallel
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
        return new MockCalendarProvider().getUpcomingEvents(days);
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
      return new MockCalendarProvider().getUpcomingEvents(days);
    }
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(14);
    return events.filter(e => e.country === country);
  }
}

// ---------------------------------------------------------------------------
// Finnhub Economic Calendar API (requires paid plan)
// Kept as an option for users with a paid Finnhub subscription.
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
        console.warn(`Finnhub API returned ${response.status}, falling back to Forex Factory`);
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
    } catch (error) {
      console.warn("Finnhub fetch failed, falling back to Forex Factory:", error);
      return new ForexFactoryCalendarProvider().getUpcomingEvents(days);
    }
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(30);
    return events.filter(e => e.country === country);
  }
}

// ---------------------------------------------------------------------------
// Factory
// Priority: FINNHUB_API_KEY (paid) → Forex Factory (free) → Mock
// ---------------------------------------------------------------------------
export function getCalendarProvider(): CalendarProvider {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) return new FinnhubCalendarProvider(finnhubKey);

  const forceMock = process.env.NEXT_PUBLIC_CALENDAR_PROVIDER === "mock";
  if (forceMock) return new MockCalendarProvider();

  // Default to Forex Factory — free, no key needed
  return new ForexFactoryCalendarProvider();
}
