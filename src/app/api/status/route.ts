import { NextResponse } from "next/server";

interface ProviderStatus {
  name: string;
  provider: string;
  status: "live" | "mock" | "error";
  description: string;
  docsUrl: string;
  envVar: string;
}

async function checkEndpoint(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const providers: ProviderStatus[] = [];

  // --- News ---
  const newsApiKey = process.env.NEWSAPI_KEY;
  const newsProvider = process.env.NEXT_PUBLIC_NEWS_PROVIDER;
  if (newsApiKey) {
    const reachable = await checkEndpoint(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${newsApiKey}`
    );
    providers.push({
      name: "News",
      provider: "NewsAPI",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — fetching live articles" : "Key set but API unreachable",
      docsUrl: "https://newsapi.org",
      envVar: "NEWSAPI_KEY",
    });
  } else if (newsProvider === "gdelt") {
    const reachable = await checkEndpoint(
      "https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&format=json&maxrecords=1"
    );
    providers.push({
      name: "News",
      provider: "GDELT",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — free public API, no key needed" : "GDELT API unreachable",
      docsUrl: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
      envVar: "NEXT_PUBLIC_NEWS_PROVIDER",
    });
  } else {
    providers.push({
      name: "News",
      provider: "Mock",
      status: "mock",
      description: "Using demo data — set NEXT_PUBLIC_NEWS_PROVIDER=gdelt or add NEWSAPI_KEY",
      docsUrl: "https://newsapi.org",
      envVar: "NEWSAPI_KEY",
    });
  }

  // --- Market Data ---
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey) {
    const reachable = await checkEndpoint(
      `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${polygonKey}`
    );
    providers.push({
      name: "Market Data",
      provider: "Polygon / Massive",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — real-time quotes and historical bars" : "Key set but API unreachable",
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
    const reachable = await checkEndpoint(
      `https://finnhub.io/api/v1/calendar/economic?from=${today}&to=${today}&token=${finnhubKey}`
    );
    providers.push({
      name: "Economic Calendar",
      provider: "Finnhub",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — real-time economic events" : "Key set but API unreachable",
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
    const reachable = await checkEndpoint(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=AAPL&apikey=${avKey}&limit=1`
    );
    providers.push({
      name: "Sentiment",
      provider: "Alpha Vantage",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — news sentiment scoring (25 req/day)" : "Key set but API unreachable",
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
    let reachable = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("https://paper-api.alpaca.markets/v2/account", {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      reachable = res.ok;
    } catch {
      reachable = false;
    }
    providers.push({
      name: "Execution",
      provider: "Alpaca (Paper)",
      status: reachable ? "live" : "error",
      description: reachable ? "Connected — paper trading active" : "Keys set but API unreachable",
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
