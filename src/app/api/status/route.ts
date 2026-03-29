import { NextResponse } from "next/server";

interface ProviderStatus {
  name: string;
  provider: string;
  status: "live" | "mock" | "error";
  description: string;
  docsUrl: string;
  envVar: string;
}

async function checkEndpoint(
  url: string,
  options?: RequestInit,
  timeout = 8000
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, statusCode: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export const dynamic = "force-dynamic"; // never cache this route

export async function GET() {
  const providers: ProviderStatus[] = [];

  // --- News (GDELT is now the default, no env var needed) ---
  const newsApiKey = process.env.NEWSAPI_KEY;
  const forceMock = process.env.NEXT_PUBLIC_NEWS_PROVIDER === "mock";

  if (newsApiKey) {
    const result = await checkEndpoint(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${newsApiKey}`
    );
    providers.push({
      name: "News",
      provider: "NewsAPI",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — fetching live articles"
        : `Key set but API returned ${result.statusCode || "unreachable"}: ${result.error || ""}`,
      docsUrl: "https://newsapi.org",
      envVar: "NEWSAPI_KEY",
    });
  } else if (forceMock) {
    providers.push({
      name: "News",
      provider: "Mock",
      status: "mock",
      description: "Forced to mock via NEXT_PUBLIC_NEWS_PROVIDER=mock",
      docsUrl: "https://newsapi.org",
      envVar: "NEXT_PUBLIC_NEWS_PROVIDER",
    });
  } else {
    // GDELT is the default
    const result = await checkEndpoint(
      "https://api.gdeltproject.org/api/v2/doc/doc?query=markets&mode=ArtList&format=json&maxrecords=1"
    );
    providers.push({
      name: "News",
      provider: "GDELT",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — free public API, no key needed"
        : `GDELT unreachable (${result.statusCode || "timeout"}): ${result.error || "check server logs"}`,
      docsUrl: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
      envVar: "—",
    });
  }

  // --- Market Data ---
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey) {
    const result = await checkEndpoint(
      `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${polygonKey}`
    );
    providers.push({
      name: "Market Data",
      provider: "Polygon / Massive",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — real-time quotes and historical bars"
        : `Key set but API returned ${result.statusCode || "unreachable"}`,
      docsUrl: "https://massive.com",
      envVar: "POLYGON_API_KEY",
    });
  } else {
    providers.push({
      name: "Market Data",
      provider: "Mock",
      status: "mock",
      description: "Using demo data — sign up at massive.com and add POLYGON_API_KEY",
      docsUrl: "https://massive.com",
      envVar: "POLYGON_API_KEY",
    });
  }

  // --- Economic Calendar ---
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    const today = new Date().toISOString().split("T")[0];
    const result = await checkEndpoint(
      `https://finnhub.io/api/v1/calendar/economic?from=${today}&to=${today}&token=${finnhubKey}`
    );
    providers.push({
      name: "Economic Calendar",
      provider: "Finnhub",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — real-time economic events"
        : `Key set but API returned ${result.statusCode || "unreachable"}`,
      docsUrl: "https://finnhub.io",
      envVar: "FINNHUB_API_KEY",
    });
  } else {
    providers.push({
      name: "Economic Calendar",
      provider: "Mock",
      status: "mock",
      description: "Using demo data — sign up at finnhub.io and add FINNHUB_API_KEY",
      docsUrl: "https://finnhub.io",
      envVar: "FINNHUB_API_KEY",
    });
  }

  // --- Sentiment ---
  const avKey = process.env.ALPHA_VANTAGE_KEY;
  if (avKey) {
    const result = await checkEndpoint(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=AAPL&apikey=${avKey}&limit=1`
    );
    providers.push({
      name: "Sentiment",
      provider: "Alpha Vantage",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — news sentiment scoring (25 req/day)"
        : `Key set but API returned ${result.statusCode || "unreachable"}`,
      docsUrl: "https://www.alphavantage.co",
      envVar: "ALPHA_VANTAGE_KEY",
    });
  } else {
    providers.push({
      name: "Sentiment",
      provider: "Mock",
      status: "mock",
      description: "Using demo data — get a free key at alphavantage.co",
      docsUrl: "https://www.alphavantage.co/support/#api-key",
      envVar: "ALPHA_VANTAGE_KEY",
    });
  }

  // --- Execution ---
  const alpacaKey = process.env.ALPACA_API_KEY;
  const alpacaSecret = process.env.ALPACA_SECRET_KEY;
  if (alpacaKey && alpacaSecret) {
    const result = await checkEndpoint(
      "https://paper-api.alpaca.markets/v2/account",
      {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
      }
    );
    providers.push({
      name: "Execution",
      provider: "Alpaca (Paper)",
      status: result.ok ? "live" : "error",
      description: result.ok
        ? "Connected — paper trading active"
        : `Keys set but API returned ${result.statusCode || "unreachable"}`,
      docsUrl: "https://alpaca.markets",
      envVar: "ALPACA_API_KEY",
    });
  } else {
    providers.push({
      name: "Execution",
      provider: "Mock",
      status: "mock",
      description: "Using simulated execution — sign up at alpaca.markets for paper trading",
      docsUrl: "https://alpaca.markets",
      envVar: "ALPACA_API_KEY",
    });
  }

  return NextResponse.json({ providers, checkedAt: new Date().toISOString() });
}
