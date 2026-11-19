import "server-only";
import { cacheLife, cacheTag } from "next/cache";

/** Prices from Yahoo Finance's public chart feed. No account is needed. */

export type Quote = { price: number; currency: string; asOf: string };
export type Point = { t: number; close: number };

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; FinanceFrontier/1.0)" };
const base = "https://query1.finance.yahoo.com/v8/finance/chart/";

export const isSymbol = (s: string) => /^[\^A-Z0-9.\-=]{1,15}$/.test(s);

/** Today's price, cached for a few hours. Null when the feed does not answer. */
export async function getQuote(symbol: string): Promise<Quote | null> {
  "use cache";
  cacheTag("quotes");
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 3 * 86400 });
  if (!isSymbol(symbol)) return null;
  try {
    const res = await fetch(`${base}${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      currency: String(meta.currency ?? ""),
      asOf: new Date(Number(meta.regularMarketTime) * 1000 || 0).toISOString(),
    };
  } catch {
    return null;
  }
}

/** Daily closes between two dates, cached for a day (past prices do not change). */
export async function getHistory(symbol: string, fromIso: string, toIso: string): Promise<{ currency: string; points: Point[] } | null> {
  "use cache";
  cacheTag("history");
  cacheLife({ stale: 3600, revalidate: 86400, expire: 7 * 86400 });
  if (!isSymbol(symbol)) return null;
  const p1 = Math.floor(new Date(fromIso).getTime() / 1000);
  const p2 = Math.floor(new Date(toIso).getTime() / 1000);
  if (!Number.isFinite(p1) || !Number.isFinite(p2) || p2 <= p1) return null;
  const interval = p2 - p1 > 3 * 365 * 86400 ? "1wk" : "1d";
  try {
    const res = await fetch(`${base}${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=${interval}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const r = (await res.json())?.chart?.result?.[0];
    const times: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? [];
    const points = times
      .map((t, i) => ({ t: t * 1000, close: closes[i] ?? NaN }))
      .filter((p) => Number.isFinite(p.close) && p.close > 0);
    return points.length ? { currency: String(r?.meta?.currency ?? ""), points } : null;
  } catch {
    return null;
  }
}

/** The last daily close before a moment, e.g. the price when a post went up. */
export async function getCloseBefore(symbol: string, iso: string): Promise<number | null> {
  const from = new Date(new Date(iso).getTime() - 14 * 86400_000).toISOString();
  const history = await getHistory(symbol, from, iso);
  if (!history) return null;
  const limit = new Date(iso).getTime() - 6.5 * 3600_000;
  const before = history.points.filter((p) => p.t <= limit);
  return before.at(-1)?.close ?? null;
}

/** The index each listing is measured against. */
export function benchmarkFor(exchange: string) {
  switch (exchange) {
    case "ASX":
      return { symbol: "^AXJO", name: "ASX 200" };
    case "LSE":
      return { symbol: "^FTSE", name: "FTSE 100" };
    case "TSX":
      return { symbol: "^GSPTSE", name: "TSX" };
    default:
      return { symbol: "^GSPC", name: "S&P 500" };
  }
}
