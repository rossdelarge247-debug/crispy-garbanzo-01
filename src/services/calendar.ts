import type { EconomicEvent } from "@/types";

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

    // Generate a realistic weekly calendar relative to today
    const templates = [
      { title: "FOMC Rate Decision", country: "US", impact: "high" as const, dayOffset: 2, hour: 18, forecast: "4.25%", previous: "4.50%" },
      { title: "Non-Farm Payrolls", country: "US", impact: "high" as const, dayOffset: 4, hour: 12, forecast: "185K", previous: "275K" },
      { title: "US CPI (YoY)", country: "US", impact: "high" as const, dayOffset: 5, hour: 12, forecast: "3.1%", previous: "3.2%" },
      { title: "ECB Interest Rate Decision", country: "EU", impact: "high" as const, dayOffset: 3, hour: 11, forecast: "3.50%", previous: "3.75%" },
      { title: "OPEC+ Ministerial Meeting", country: "INT", impact: "high" as const, dayOffset: 1, hour: 10, forecast: undefined, previous: undefined },
      { title: "US ISM Manufacturing PMI", country: "US", impact: "medium" as const, dayOffset: 1, hour: 14, forecast: "50.5", previous: "50.3" },
      { title: "US Initial Jobless Claims", country: "US", impact: "medium" as const, dayOffset: 4, hour: 12, forecast: "215K", previous: "210K" },
      { title: "Eurozone CPI Flash (YoY)", country: "EU", impact: "medium" as const, dayOffset: 2, hour: 9, forecast: "2.4%", previous: "2.6%" },
      { title: "Bank of Japan Rate Decision", country: "JP", impact: "high" as const, dayOffset: 6, hour: 3, forecast: "0.25%", previous: "0.25%" },
      { title: "UK GDP (QoQ)", country: "GB", impact: "medium" as const, dayOffset: 3, hour: 7, forecast: "0.3%", previous: "0.1%" },
      { title: "US Retail Sales (MoM)", country: "US", impact: "high" as const, dayOffset: 7, hour: 12, forecast: "0.4%", previous: "0.6%" },
      { title: "US Core PCE Price Index (YoY)", country: "US", impact: "high" as const, dayOffset: 8, hour: 12, forecast: "2.7%", previous: "2.8%" },
      { title: "China Manufacturing PMI", country: "CN", impact: "medium" as const, dayOffset: 5, hour: 1, forecast: "50.1", previous: "49.8" },
      { title: "US Durable Goods Orders", country: "US", impact: "medium" as const, dayOffset: 6, hour: 12, forecast: "1.2%", previous: "-0.8%" },
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
  private url = "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json";

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.url, {
        signal: controller.signal,
        next: { revalidate: 600 }, // cache 10 min (rate limit: 2 req / 5 min)
      });
      clearTimeout(timer);

      if (!response.ok) {
        console.warn(`Forex Factory returned ${response.status}, falling back to mock`);
        return new MockCalendarProvider().getUpcomingEvents(days);
      }

      const data: ForexFactoryEvent[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return new MockCalendarProvider().getUpcomingEvents(days);
      }

      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(now.getDate() + days);

      return data
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
    } catch (error) {
      console.warn("Forex Factory fetch failed, falling back to mock:", error);
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
