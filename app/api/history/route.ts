import type { NextRequest } from "next/server";
import { EXCHANGES, quoteSymbol, type Exchange } from "@/lib/content/stock";
import { benchmarkFor, getHistory } from "@/lib/market";

/**
 * Price history for the "what would it have become" calculator: the share and its
 * market index, with dividends reinvested (Yahoo's adjusted closes).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const ticker = (q.get("ticker") ?? "").trim().toUpperCase().slice(0, 12);
  const exchange = (EXCHANGES as readonly string[]).includes(q.get("exchange") ?? "") ? (q.get("exchange") as Exchange) : "NASDAQ";
  const from = q.get("from") ?? "";
  const symbol = quoteSymbol({ ticker, exchange });
  const start = new Date(from);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!symbol || Number.isNaN(start.getTime()) || start.getUTCFullYear() < 1980 || start >= today) {
    return Response.json({ error: "Check the ticker and the date." }, { status: 400 });
  }
  const b = benchmarkFor(exchange);
  const [stock, market] = await Promise.all([
    getHistory(symbol, start.toISOString(), today.toISOString()),
    getHistory(b.symbol, start.toISOString(), today.toISOString()),
  ]);
  if (!stock) return Response.json({ error: `No prices found for ${ticker} on the ${exchange}.` }, { status: 404 });
  const thin = (points: { t: number; close: number }[], n = 160) => {
    if (points.length <= n) return points;
    const step = (points.length - 1) / (n - 1);
    return Array.from({ length: n }, (_, i) => points[Math.round(i * step)]);
  };
  return Response.json(
    { symbol, currency: stock.currency, stock: thin(stock.points), market: market ? { name: b.name, points: thin(market.points) } : null },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
