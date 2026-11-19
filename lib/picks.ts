import "server-only";
import { getPublishedPostsWithContent } from "./posts";
import type { DocNode } from "./content/doc";
import { hasSnapshotContent, parsePrice, quoteSymbol, readSnapshot, type StockSnapshot, type Verdict } from "./content/stock";
import { benchmarkFor, getCloseBefore, getQuote, type Quote } from "./market";

export type { Quote };

export type Pick = {
  post: { slug: string; title: string; date: string };
  snapshot: StockSnapshot;
  symbol: string | null;
  priceThen: number | null;
  quote: Quote | null;
  /** Percentage change since the post, when both prices are known in the same currency. */
  change: number | null;
  benchmark: { name: string; change: number | null };
  /** The pick's move minus the market's move, in percentage points. */
  vsMarket: number | null;
  /** Whether the call has gone the right way compared with the market. */
  ahead: boolean | null;
};

export function snapshotsIn(node: DocNode, out: StockSnapshot[] = []) {
  if (node.type === "stockSnapshot") {
    const s = readSnapshot(node.attrs);
    if (hasSnapshotContent(s)) out.push(s);
  }
  for (const child of node.content ?? []) snapshotsIn(child, out);
  return out;
}

/** Buy and Hold calls are right when the share beats the market; Watch and Avoid calls when it lags. */
const positive = (v: Verdict) => v === "buy" || v === "hold";

const marketMove = async (exchange: string, since: string) => {
  const b = benchmarkFor(exchange);
  const [then, now] = await Promise.all([getCloseBefore(b.symbol, since), getQuote(b.symbol)]);
  return { name: b.name, change: then && now ? (now.price / then - 1) * 100 : null };
};

export async function buildPick(post: { slug: string; title: string; date: string }, snapshot: StockSnapshot): Promise<Pick> {
  const symbol = quoteSymbol(snapshot);
  const [quote, benchmark] = await Promise.all([
    symbol ? getQuote(symbol) : Promise.resolve(null),
    marketMove(snapshot.exchange, post.date),
  ]);
  const priceThen = parsePrice(snapshot.price);
  const sameCurrency = quote && quote.currency.toUpperCase() === snapshot.currency.toUpperCase();
  const change = quote && priceThen && sameCurrency ? (quote.price / priceThen - 1) * 100 : null;
  const vsMarket = change !== null && benchmark.change !== null ? change - benchmark.change : null;
  const ahead = vsMarket === null ? null : positive(snapshot.verdict) ? vsMarket > 0 : vsMarket < 0;
  return { post, snapshot, symbol, priceThen, quote, change, benchmark, vsMarket, ahead };
}

/** Every company snapshot in a published post, newest post first. */
export async function getPicks(): Promise<Pick[]> {
  const posts = await getPublishedPostsWithContent();
  return Promise.all(
    posts.flatMap((post) =>
      snapshotsIn(post.content).map((snapshot) => buildPick({ slug: post.slug, title: post.title, date: post.date }, snapshot)),
    ),
  );
}

/** The first pick in one post, for its share picture. */
export async function getPickForPost(slug: string): Promise<Pick | null> {
  const post = (await getPublishedPostsWithContent()).find((p) => p.slug === slug);
  const snapshot = post ? snapshotsIn(post.content)[0] : undefined;
  return post && snapshot ? buildPick({ slug: post.slug, title: post.title, date: post.date }, snapshot) : null;
}
