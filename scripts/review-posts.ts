/**
 * One-off editorial pass over the posts imported from WordPress.
 * Reads the posts from a Supabase database, applies the changes below and writes
 * supabase/imports/review.sql, which makes the same changes in the live database.
 *
 *   npx tsx scripts/review-posts.ts
 *
 * Needs SUPABASE_URL and SUPABASE_SECRET_KEY for the database to read from
 * (the local one by default).
 */
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { DocNode } from "../lib/content/doc";
import { readingMinutes } from "../lib/content/doc";
import { quoteSymbol, type StockSnapshot } from "../lib/content/stock";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
if (!key) throw new Error("Set SUPABASE_SECRET_KEY (the local one is printed by: npx supabase status).");


type Snap = Omit<StockSnapshot, "price"> & { price?: string };
type Edit = {
  slug?: string;
  title?: string;
  excerpt?: string;
  seo?: string;
  tags?: string[];
  series?: string;
  author?: string;
  cover?: string;
  coverAlt?: string;
  /** Use the post's first picture as the cover and take it out of the text. */
  firstImageAsCover?: boolean;
  /** Remove these pictures from the text (theme leftovers). */
  dropImages?: string[];
  /** Put a picture back into the text after this many blocks. */
  restoreImage?: { after: number; src: string; alt: string };
  /** Remove this many blocks from the start of the post. */
  dropLeading?: number;
  snapshot?: Snap;
};

const metric = (label: string, value: string) => ({ label, value });

const edits: Record<string, Edit> = {
  "the-ai-factory-building-the-most-expensive-fortress-in-history-msft": {
    title: "Microsoft (MSFT): The AI Factory and the Most Expensive Fortress in History",
    excerpt:
      "Microsoft's $35 billion spending spree has spooked the market. I think investors are scared of the wrong thing, and that at around $360 the stock is a chance to buy the infrastructure of the next twenty years at a discount.",
    seo: "Why Microsoft's huge AI spending is a moat rather than a mistake, and why the 2026 sell-off looks like a buying opportunity.",
    tags: ["AI", "Big Tech", "Technology"],
    snapshot: {
      company: "Microsoft", ticker: "MSFT", exchange: "NASDAQ", verdict: "buy", currency: "USD",
      summary: "The market fears the AI bill. I see a moat being built.",
      metrics: [metric("Revenue growth", "18%+"), metric("Operating margin", "49%"), metric("Capex per quarter", "US$35B")],
    },
  },
  "berkshire-hathaway-brk-b-the-safest-cheap-stock-on-wall-street-or-a-very": {
    slug: "berkshire-hathaway-brk-b-safest-cheap-stock-or-expensive-hedge",
    title: "Berkshire Hathaway (BRK.B): The Safest “Cheap” Stock on Wall Street, or a Very Expensive Hedge?",
    excerpt:
      "Berkshire is being called one of the cheapest safe stocks you can buy. Look past the headlines and it sits closer to fair value than deep value. Whether it belongs in your portfolio depends on what you want it to do.",
    seo: "Is Berkshire Hathaway undervalued, or priced about right? A look at its cash pile, its businesses and life after Buffett.",
    tags: ["Business", "Stock Market", "Value"],
    snapshot: {
      company: "Berkshire Hathaway", ticker: "BRK.B", exchange: "NYSE", verdict: "hold", currency: "USD",
      summary: "A fortress worth owning for safety, not for bargain-hunting.",
      metrics: [metric("Valuation", "Near fair value"), metric("Role", "Defensive hedge")],
    },
  },
  "reddit-rddt-why-the-front-page-of-the-internet-just-caught-fire": {
    title: "Reddit (RDDT): Why the Front Page of the Internet Just Caught Fire",
    excerpt:
      "Reddit's second-quarter results turned a meme stock into a real business: revenue up 78%, a proper profit and a growing AI licensing stream. At around 128 times earnings, though, it is priced for perfection.",
    seo: "Reddit's blow-out 2025 results, its AI licensing deals and global push, and why the valuation leaves no room for error.",
    snapshot: {
      company: "Reddit", ticker: "RDDT", exchange: "NYSE", verdict: "watch", currency: "USD",
      summary: "A real business now, but the price already assumes everything goes right.",
      metrics: [metric("Revenue growth", "+78% YoY"), metric("P/E", "~128x"), metric("Daily users", "110.4M")],
    },
  },
  "unitedhealth-unh-americas-quiet-fortress": {
    title: "UnitedHealth (UNH): America’s Quiet Fortress",
    excerpt:
      "UnitedHealth has fallen almost 50% from its highs, yet the business underneath has barely flinched. With fair value estimates well above the share price, a 2.9% dividend yield and Buffett buying, this is a fortress on sale.",
    seo: "Why UnitedHealth's 50% fall looks like an opportunity: fair value estimates, Buffett's stake and the resilience of US health insurance.",
    tags: ["Healthcare", "Stock Market", "Passive Income"],
    cover: "/covers/posts/unitedhealth.webp",
    coverAlt: "UNH in large letters with a share price line that falls and then recovers",
    snapshot: {
      company: "UnitedHealth Group", ticker: "UNH", exchange: "NYSE", verdict: "buy", currency: "USD",
      summary: "The sell-off is a gift: a compounder hiding in plain sight.",
      metrics: [metric("Dividend yield", "2.9%"), metric("Fall from high", "~50%"), metric("Fair value range", "US$590–870")],
    },
  },
  "microstrategy-the-most-elegant-house-of-cards-on-wall-street": {
    title: "MicroStrategy (MSTR): The Most Elegant House of Cards on Wall Street?",
    excerpt:
      "MicroStrategy is no longer really a software company. It is a machine that sells shares to buy Bitcoin, and its share price runs well ahead of what it holds. Here is how the loop works, and why a plain Bitcoin ETF looks cleaner.",
    seo: "How MicroStrategy's share-issuing Bitcoin loop works, why it trades at a premium, and the risks when the music stops.",
    tags: ["Crypto", "Stock Market"],
    cover: "/covers/posts/microstrategy.webp",
    coverAlt: "MSTR in large letters over a jagged rising price line",
    snapshot: {
      company: "MicroStrategy", ticker: "MSTR", exchange: "NASDAQ", verdict: "avoid", currency: "USD",
      summary: "Elegant engineering on volatile ground. A spot Bitcoin ETF does the job without the premium.",
      metrics: [metric("Main asset", "Bitcoin"), metric("Premium to holdings", "Around 2x")],
    },
  },
  "capital-curiosity": {
    slug: "agora-api-the-micro-cap-nobodys-watching",
    title: "Agora (API): The Micro-Cap Nobody’s Watching",
    excerpt:
      "Agora's share price has fallen about 95% and its accounts are full of one-off write-downs. Underneath, it holds more cash than its entire market value, has no debt, still produces free cash flow and is buying back its own shares.",
    seo: "Agora (API) holds more cash than its market value. How impairments hide a cash-rich business, and the catalysts that could unlock it.",
    tags: ["Small Caps", "Value", "Technology"],
    cover: "/covers/posts/agora.webp",
    coverAlt: "API in large letters over a price line that falls and starts to recover",
    dropLeading: 1,
    snapshot: {
      company: "Agora, Inc.", ticker: "API", exchange: "NASDAQ", verdict: "buy", currency: "USD",
      summary: "A cash-rich micro-cap hidden behind accounting noise. For patient investors.",
      metrics: [metric("Market cap", "~US$167M"), metric("Cash", "US$286M"), metric("Debt", "US$0")],
    },
  },
  "meta-in-2030-from-ads-to-ai-infrastructure-powerhouse": {
    title: "Meta (META) in 2030: From Ads to AI Infrastructure Powerhouse",
    excerpt:
      "Most people still see Meta as a social media company. Behind the scenes it is turning into an AI infrastructure business, and even the gloomiest 2030 scenario points to steady returns from today's price.",
    seo: "How Meta is turning into an AI infrastructure company, and what its earnings and valuation could look like by 2030.",
    snapshot: {
      company: "Meta Platforms", ticker: "META", exchange: "NASDAQ", verdict: "buy", currency: "USD",
      summary: "Valued on its past as an ad business, building a future in AI infrastructure.",
      metrics: [metric("Forward P/E", "26x"), metric("Market cap", "US$1.28T"), metric("Returned to owners", "~US$70B a year")],
    },
  },
  "is-google-stock-a-buy-in-2025": {
    title: "Alphabet (GOOGL): Is Google Stock a Buy in 2025?",
    excerpt:
      "Many worry that AI will make Google search obsolete. Alphabet's results say otherwise: search is stronger, Cloud is profitable and Gemini is everywhere, all at a forward P/E of about 16.",
    seo: "Why Alphabet looks like a mispriced compounder in 2025: search, Cloud, YouTube, Waymo and a forward P/E well below its peers.",
    snapshot: {
      company: "Alphabet", ticker: "GOOGL", exchange: "NASDAQ", verdict: "buy", currency: "USD",
      summary: "A mispriced compounder still valued like an ad-only business.",
      metrics: [metric("Forward P/E", "16.3x"), metric("Market cap", "US$1.86T"), metric("Free cash flow (TTM)", "US$74.9B")],
    },
  },
  "novo-nordisk-vs-eli-lilly-why-the-consensus-has-it-backwards-again": {
    title: "Novo Nordisk vs Eli Lilly: Why the Consensus Has It Backwards, Again",
    excerpt:
      "When Eli Lilly's weight-loss pill hit its trial target, Novo Nordisk shares fell 7%. A closer look at the data shows Novo a year ahead with stronger results, and I am happy to add to my position.",
    seo: "Novo Nordisk's oral semaglutide against Eli Lilly's orforglipron: trial results, timelines and why the market read it wrong.",
    tags: ["Healthcare", "Stock Market"],
    cover: "/covers/posts/novo-vs-lilly.webp",
    coverAlt: "NVO vs LLY in large letters over a rising price line",
    restoreImage: {
      after: 2,
      src: "/imported/novo-nordisk-vs-eli-lilly-why-the-consensus-has-it-backwards-again/1.webp",
      alt: "The four phases of a clinical trial, from 20 to 100 patients in phase 1 to post-marketing studies in phase 4",
    },
    snapshot: {
      company: "Novo Nordisk", ticker: "NVO", exchange: "NYSE", verdict: "buy", currency: "USD",
      summary: "A year ahead in the race for the weight-loss pill, with stronger numbers.",
      metrics: [metric("P/E when I bought", "29x"), metric("Pill weight loss (trial)", "12.9–16.6%")],
    },
  },
  "novo-nordisk-overvalued-or-a-forgotten-gem": {
    title: "Novo Nordisk (NVO): Overvalued or a Forgotten Gem?",
    excerpt:
      "Novo Nordisk earns an 85% gross margin, returns 30 to 60% on its capital and leads the boom in weight-loss drugs. It is not cheap at 29 times earnings, but its fundamentals go a long way towards justifying the price.",
    seo: "Is Novo Nordisk worth its price? Margins, the weight-loss boom, competition from Eli Lilly and copycats, and the real risks.",
    tags: ["Healthcare", "Stock Market"],
    cover: "/covers/posts/novo-nordisk.webp",
    coverAlt: "NVO in large letters over a price line that rises and levels off",
    snapshot: {
      company: "Novo Nordisk", ticker: "NVO", exchange: "NYSE", verdict: "watch", currency: "USD",
      summary: "Quality at a fair price. A top contender to keep an eye on.",
      metrics: [metric("Market cap", "~US$390B"), metric("P/E", "~29.5x"), metric("Gross margin", "85%")],
    },
  },
  "best-stock-analysis-tools-for-2025": {
    title: "The Best Stock Analysis Tools for 2025",
    excerpt:
      "Five research platforms compared, from GuruFocus to Koyfin: what each does well, where each falls short, and the one I would pick for investors who want a tool that fits their own style.",
    seo: "GuruFocus, PEvaluator, FinChat, Simply Wall St and Koyfin compared: the best stock analysis tools for 2025.",
    tags: ["Tools", "Beginners"],
    cover: "/covers/posts/analysis-tools.webp",
    coverAlt: "The word Tools in large letters over a rising line",
    restoreImage: {
      after: 1,
      src: "/imported/best-stock-analysis-tools-for-2025/1.webp",
      alt: "A stock analysis dashboard showing financial strength, profitability and valuation scores",
    },
  },
  "is-big-tech-really-this-dumb-how-100-chinese-engineers-built-an-ai-for-6m-that": {
    slug: "is-big-tech-really-this-dumb-deepseek",
    title: "Is Big Tech Really This Dumb? How DeepSeek Built an AI for $6 Million",
    excerpt:
      "A team of about 100 engineers built DeepSeek for a reported $6 million, while US tech giants have spent hundreds of billions. What that means for Big Tech's moat, and why open-source AI could change who wins.",
    seo: "DeepSeek's $6 million AI and what it means for Big Tech: open-source models, AI costs and the end of the walled garden.",
  },
  "stock-evaluation-criteria": {
    title: "My Stock Evaluation Criteria",
    excerpt:
      "Before I buy any company, it has to pass a set of rules I wrote down in advance. Here is why every investor needs criteria like these, and the ones I use to stay calm when the market gets excited.",
    seo: "The criteria I use to evaluate a stock before buying, and why fixed rules beat hype and fear of missing out.",
    cover: "/covers/posts/stock-criteria.webp",
    coverAlt: "The word Criteria in large letters over a steadily rising line",
  },
  "the-power-of-financial-discipline": {
    excerpt:
      "Financial discipline is not about big, flashy changes. It is the small, steady decisions that compound over time. The habits that have made the biggest difference to my own finances.",
    seo: "Simple habits for financial discipline: tracking spending, avoiding lifestyle creep, clear goals and delayed gratification.",
    firstImageAsCover: true,
    dropImages: ["/imported/the-power-of-financial-discipline/2.webp"],
  },
  "budgeting-for-beginners": {
    excerpt:
      "A budget is not about saying no to everything fun. It is a plan for your money. The simple process I used to start budgeting, including a free spreadsheet you can copy.",
    seo: "A beginner's guide to budgeting: track your spending, set categories, pick a tool and stay flexible.",
    firstImageAsCover: true,
    dropImages: ["/imported/budgeting-for-beginners/2.webp"],
  },
  "journey-into-the-stock-market": {
    title: "Journey into the Stock Market",
    excerpt:
      "Investing felt intimidating until I took the first step. How I got started, the platforms I tried in Australia, and the most important lesson: time in the market beats timing the market.",
    seo: "How I started investing in shares in Australia: learning the basics, choosing a platform and starting small with an index fund.",
    firstImageAsCover: true,
    dropImages: ["/imported/journey-into-the-stock-market/2.webp"],
  },
  "assets-vs-liabilities": {
    title: "Assets vs Liabilities",
    excerpt:
      "Assets put money in your pocket and liabilities take it out. Understanding the difference is one of the simplest ways to start building wealth.",
    seo: "The difference between assets and liabilities, explained simply, and why it matters for growing your net worth.",
    firstImageAsCover: true,
    dropImages: ["/imported/assets-vs-liabilities/2.webp"],
  },
};

/** Posts that are too thin to stand on their own, and guest posts the site no longer carries. */
const remove = [
  "journey-and-motivation",
  "how-to-build-a-strong-financial-foundation",
  "weekly-market-inspection-1-aspire-mining-ltd",
  "weekly-market-inspection-2-china-sxt-pharmaceuticals-inc",
  "weekly-market-inspection-3-pathward-financial-inc",
  "next-technology-holding-inc-quality-or-not",
  "asx-small-cap-gems-uos",
  "careers-in-finance-which-path-should-you-pick",
];

// ---------------------------------------------------------------------------
// Text fixes applied everywhere
// ---------------------------------------------------------------------------

const typos: [RegExp, string][] = [
  [/\bexcpecially\b/g, "especially"],
  [/\bAdvsior\b/g, "Adviser"],
  [/\boverseeas\b/g, "oversees"],
  [/\bWeighong\b/g, "Weihong"],
  [/\bShenzen\b/g, "Shenzhen"],
  [/\ban specialist\b/g, "a specialist"],
  [/\bCommonwealths Banks\b/g, "Commonwealth Bank"],
  [/\bSimply Wallstreet\b/g, "Simply Wall St"],
  [/\bSimply Wall Street\b/g, "Simply Wall St"],
  [/\bThe mainly focuses\b/g, "It mainly focuses"],
  [/\bFinchat\b/g, "FinChat"],
  [/\bEtoro\b/g, "eToro"],
  [/ {2,}/g, " "],
];

/** US spellings to Australian ones, keeping capital letters. */
function australian(text: string) {
  return text
    .replace(
      /\b(organi|speciali|analy|reali|prioriti|capitali|moneti|optimi|minimi|maximi|recogni|utili|democrati|emphasi|authori|stabili|categori|summari|critici|apologi|jeopardi|visuali|standardi|digiti|incentivi|revolutioni|normali|subsidi|itemi|finali|mobili|centrali|globali|penali|scrutini|memori|legali)z(e|ed|es|ing|ation|ations|er|ers)\b/gi,
      (_m, stem: string, end: string) => `${stem}s${end}`,
    )
    .replace(/\b(fav|behavi|col|lab|hon|neighb|harb|rum|vap|endeav|rig)or(s|ed|ing|ite|ites|able|ably|ful)?\b/gi, (_m, stem: string, end = "") => `${stem}our${end}`)
    .replace(/\b(cent)er(s)?\b/gi, (_m, c: string, s = "") => `${c}re${s}`)
    .replace(/\b(cent)ered\b/gi, (_m, c: string) => `${c}red`)
    .replace(/\b(travel|model|cancel|label|signal|fuel)(ed|ing|er|ers)\b/gi, (_m, w: string, end: string) => `${w}l${end}`)
    .replace(/\bdefense\b/gi, (m) => (m[0] === "D" ? "Defence" : "defence"))
    .replace(/\bfinancial advisor(s)?\b/gi, (m, s = "") => (m[0] === "F" ? "Financial adviser" : "financial adviser") + s);
}

const fixText = (t: string) => typos.reduce((s, [re, to]) => s.replace(re, to), australian(t));

/** Emoji and pictographs at the start of headings and lines, which clash with the site's style. */
const LEADING_EMOJI = /^(?:[\p{Extended_Pictographic}‍️]+\s*)+/u;

function plain(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plain).join("");
}

function fixNode(node: DocNode, inHeading = false): DocNode {
  if (node.type === "text") {
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === "link" || m.type === "code")) return node;
    return { ...node, text: fixText(node.text ?? "") };
  }
  if (node.type === "codeBlock" || node.type === "image") return node;
  const heading = inHeading || node.type === "heading";
  const content = node.content?.map((c) => fixNode(c, heading));
  const out: DocNode = { ...node, ...(content ? { content } : {}) };
  // strip a leading emoji from headings and from paragraphs that open with a pointer emoji
  if ((node.type === "heading" || node.type === "paragraph") && out.content?.[0]?.type === "text") {
    const first = out.content[0];
    const stripped = (first.text ?? "").replace(node.type === "heading" ? LEADING_EMOJI : /^(?:👉|📌)\s*/u, "");
    if (stripped !== first.text) out.content = [{ ...first, text: stripped }, ...out.content.slice(1)].filter((c) => c.type !== "text" || c.text);
  }
  return out;
}

const isDisclaimer = (t: string) =>
  /^(disclaimer\b|this is not financial advice|this article is for (information|educational)|the information provided here is not financial advice)/i.test(t.trim()) ||
  /^(personal analysis )?written by eeshan karra\.?$/i.test(t.trim()) ||
  /^author\s*[–-]\s*natesh/i.test(t.trim()) ||
  /^linkedin:\s*https?:/i.test(t.trim()) ||
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}, \d{4}$/i.test(t.trim());

/** "“Quote” – Name" paragraphs become pull quotes. */
function quoteBlock(node: DocNode): DocNode | null {
  if (node.type !== "paragraph") return null;
  const t = plain(node).trim();
  const m = t.match(/^[“"]([\s\S]{12,260})[”"]\s*(?:[–—-]\s*(.{2,60}))?$/);
  if (!m) return null;
  const content: DocNode[] = [{ type: "paragraph", content: [{ type: "text", text: `“${m[1].trim()}”` }] }];
  if (m[2]) content.push({ type: "paragraph", content: [{ type: "text", text: `— ${m[2].trim()}` }] });
  return { type: "blockquote", content };
}

function cleanBlocks(blocks: DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const text = plain(b).trim().replace(/^(?:[\p{Extended_Pictographic}\u200d\ufe0f]+\s*)+/u, "");
    // disclaimers are added by the site itself; a "Disclaimer" heading takes its paragraph with it
    if (b.type === "heading" && /^disclaimer\b/i.test(text)) {
      i += 1;
      continue;
    }
    if ((b.type === "paragraph" || b.type === "heading" || b.type === "blockquote") && isDisclaimer(text)) continue;
    // a disclaimer squeezed onto the end of the "Written by" line
    if (b.type === "paragraph" && /^written by eeshan karra\s+disclaimer/i.test(text)) continue;
    const q = quoteBlock(b);
    out.push(q ?? b);
  }
  // drop empty paragraphs left at the end
  while (out.length && out.at(-1)!.type === "paragraph" && !plain(out.at(-1)!).trim()) out.pop();
  return out;
}

// ---------------------------------------------------------------------------
// Share prices on the day of each post, from Yahoo Finance
// ---------------------------------------------------------------------------

async function closeBefore(symbol: string, iso: string): Promise<number | null> {
  const t = Math.floor(new Date(iso).getTime() / 1000);
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${t - 14 * 86400}&period2=${t}&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) return null;
  const r = (await res.json())?.chart?.result?.[0];
  const times: number[] = r?.timestamp ?? [];
  const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  for (let i = times.length - 1; i >= 0; i--) {
    // a daily bar is complete once its trading session has closed, about 6.5 hours after it opens
    if (times[i] + 6.5 * 3600 <= t && closes[i]) return closes[i]!;
  }
  return null;
}

// ---------------------------------------------------------------------------

const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);

async function main() {
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from("posts").select("*").order("published_at");
  if (error) throw error;
  const statements: string[] = [];
  const report: string[] = [];

  for (const row of data!) {
    if (remove.includes(row.slug)) {
      statements.push(`delete from public.posts where slug = ${q(row.slug)};`);
      report.push(`REMOVED  ${row.title}`);
      continue;
    }
    const e = edits[row.slug] ?? {};
    let blocks: DocNode[] = cleanBlocks((row.content as DocNode).content ?? []).map((b) => fixNode(b));
    if (e.dropLeading) blocks = blocks.slice(e.dropLeading);
    if (e.dropImages) blocks = blocks.filter((b) => !(b.type === "image" && e.dropImages!.includes(String(b.attrs?.src))));

    let cover: string | null = e.cover ?? row.cover_image_url;
    let coverAlt: string = e.coverAlt ?? row.cover_image_alt;
    if (e.firstImageAsCover) {
      const i = blocks.findIndex((b) => b.type === "image");
      if (i !== -1) {
        cover = String(blocks[i].attrs!.src);
        coverAlt = String(blocks[i].attrs!.alt || e.title || row.title);
        blocks.splice(i, 1);
      }
    }
    if (e.restoreImage) {
      blocks.splice(e.restoreImage.after, 0, { type: "image", attrs: { src: e.restoreImage.src, alt: e.restoreImage.alt, caption: "" } });
    }

    if (e.snapshot) {
      const symbol = quoteSymbol(e.snapshot);
      const close = symbol ? await closeBefore(symbol, row.published_at) : null;
      const snap: StockSnapshot = { ...e.snapshot, price: close ? close.toFixed(2) : "" };
      blocks.unshift({ type: "stockSnapshot", attrs: snap as unknown as Record<string, unknown> });
      report.push(`         snapshot ${snap.ticker} ${snap.verdict} at ${snap.price || "?"} on ${row.published_at.slice(0, 10)}`);
    }

    const doc: DocNode = { type: "doc", content: blocks };
    const title = e.title ?? fixText(row.title);
    const set = {
      slug: e.slug ?? row.slug,
      title,
      excerpt: e.excerpt ?? fixText(row.excerpt),
      seo_description: e.seo ?? fixText(row.seo_description),
      content: doc,
      cover_image_url: cover,
      cover_image_alt: coverAlt,
      tags: e.tags ?? row.tags,
      series: e.series ?? row.series ?? null,
      author: e.author ?? row.author ?? null,
      reading_minutes: readingMinutes(doc),
    };
    statements.push(`update public.posts set
  slug = ${q(set.slug)},
  title = ${q(set.title)},
  excerpt = ${q(set.excerpt)},
  seo_description = ${q(set.seo_description)},
  content = ${q(JSON.stringify(set.content))}::jsonb,
  cover_image_url = ${q(set.cover_image_url)},
  cover_image_alt = ${q(set.cover_image_alt)},
  tags = array[${set.tags.map((t: string) => q(t)).join(", ")}]::text[],
  series = ${q(set.series)},
  author = ${q(set.author)},
  reading_minutes = ${set.reading_minutes}
where slug = ${q(row.slug)};`);
    report.unshift(`${row.title === title ? "EDITED  " : "RENAMED "} ${title}${set.author ? `  (by ${set.author})` : ""}`);
  }

  const migration = readFileSync(join(root, "supabase/migrations/20261119000000_series_and_author.sql"), "utf8");
  const sql = `-- Editorial pass over the imported posts, plus two new columns (series and guest author).
-- Paste all of this into the Supabase SQL Editor and press Run. Running it twice is safe.

${migration}
${statements.join("\n\n")}
`;
  writeFileSync(join(root, "supabase/imports/review.sql"), sql);
  console.log(report.join("\n"));
  console.log(`\nWrote supabase/imports/review.sql (${(sql.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
