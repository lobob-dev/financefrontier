import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getPublishedPostsWithContent } from "./posts";
import type { DocNode } from "./content/doc";
import { hasSnapshotContent, parsePrice, quoteSymbol, readSnapshot, type StockSnapshot } from "./content/stock";

export type Quote = { price: number; currency: string; asOf: string };

export type Pick = {
  post: { slug: string; title: string; date: string };
  snapshot: StockSnapshot;
  symbol: string | null;
  priceThen: number | null;
  quote: Quote | null;
  /** Percentage change since the post, when both prices are known in the same currency. */
  change: number | null;
};

function snapshotsIn(node: DocNode, out: StockSnapshot[] = []) {
  if (node.type === "stockSnapshot") {
    const s = readSnapshot(node.attrs);
    if (hasSnapshotContent(s)) out.push(s);
  }
  for (const child of node.content ?? []) snapshotsIn(child, out);
  return out;
}

/**
 * Today's price from Yahoo Finance's public chart feed. No account is needed.
 * Cached for a few hours; if the feed does not answer, the page shows a dash.
 */
async function getQuote(symbol: string): Promise<Quote | null> {
  "use cache";
  cacheTag("quotes");
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 3 * 86400 });
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; FinanceFrontier/1.0)" }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      currency: String(meta.currency ?? ""),
      asOf: new Date((Number(meta.regularMarketTime) || Date.now() / 1000) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

/** Every company snapshot in a published post, newest post first. */
export async function getPicks(): Promise<Pick[]> {
  const posts = await getPublishedPostsWithContent();
  const found = posts.flatMap((post) =>
    snapshotsIn(post.content).map((snapshot) => ({ post: { slug: post.slug, title: post.title, date: post.date }, snapshot })),
  );
  return Promise.all(
    found.map(async ({ post, snapshot }) => {
      const symbol = quoteSymbol(snapshot);
      const quote = symbol ? await getQuote(symbol) : null;
      const priceThen = parsePrice(snapshot.price);
      const sameCurrency = quote && quote.currency.toUpperCase() === snapshot.currency.toUpperCase();
      const change = quote && priceThen && sameCurrency ? (quote.price / priceThen - 1) * 100 : null;
      return { post, snapshot, symbol, priceThen, quote, change };
    }),
  );
}
