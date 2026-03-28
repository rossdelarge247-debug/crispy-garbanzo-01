import type { EconomicEvent } from "@/types";

export interface CalendarProvider {
  getUpcomingEvents(days?: number): Promise<EconomicEvent[]>;
  getEventsByCountry(country: string): Promise<EconomicEvent[]>;
}

class MockCalendarProvider implements CalendarProvider {
  private events: EconomicEvent[] = [
    {
      id: "evt-001",
      title: "FOMC Rate Decision",
      country: "US",
      date: "2026-03-31T18:00:00Z",
      impact: "high",
      forecast: "4.25%",
      previous: "4.50%",
    },
    {
      id: "evt-002",
      title: "Non-Farm Payrolls",
      country: "US",
      date: "2026-04-03T12:30:00Z",
      impact: "high",
      forecast: "185K",
      previous: "275K",
    },
    {
      id: "evt-003",
      title: "ECB Interest Rate Decision",
      country: "EU",
      date: "2026-04-02T11:45:00Z",
      impact: "high",
      forecast: "3.50%",
      previous: "3.75%",
    },
    {
      id: "evt-004",
      title: "US CPI (YoY)",
      country: "US",
      date: "2026-04-10T12:30:00Z",
      impact: "high",
      forecast: "3.1%",
      previous: "3.2%",
    },
    {
      id: "evt-005",
      title: "OPEC+ Joint Ministerial Committee Meeting",
      country: "INT",
      date: "2026-04-01T10:00:00Z",
      impact: "high",
      forecast: undefined,
      previous: undefined,
    },
    {
      id: "evt-006",
      title: "US ISM Manufacturing PMI",
      country: "US",
      date: "2026-04-01T14:00:00Z",
      impact: "medium",
      forecast: "50.5",
      previous: "50.3",
    },
    {
      id: "evt-007",
      title: "Eurozone CPI Flash Estimate (YoY)",
      country: "EU",
      date: "2026-03-31T09:00:00Z",
      impact: "medium",
      forecast: "2.4%",
      previous: "2.6%",
    },
    {
      id: "evt-008",
      title: "US Initial Jobless Claims",
      country: "US",
      date: "2026-04-03T12:30:00Z",
      impact: "low",
      forecast: "215K",
      previous: "210K",
    },
  ];

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + days);
    return this.events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= now && eventDate <= cutoff;
    });
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    return this.events.filter(e => e.country === country);
  }
}

class FinnhubCalendarProvider implements CalendarProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getUpcomingEvents(days = 14): Promise<EconomicEvent[]> {
    // TODO: Implement Finnhub economic calendar API
    // GET https://finnhub.io/api/v1/calendar/economic?from={from}&to={to}&token={key}
    throw new Error("Finnhub calendar provider not yet implemented. Set up at https://finnhub.io");
  }

  async getEventsByCountry(country: string): Promise<EconomicEvent[]> {
    const events = await this.getUpcomingEvents(30);
    return events.filter(e => e.country === country);
  }
}

export function getCalendarProvider(): CalendarProvider {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (apiKey) return new FinnhubCalendarProvider(apiKey);
  return new MockCalendarProvider();
}
