/**
 * Imports every published post from a WordPress.com blog.
 *
 *   npx tsx scripts/import-wordpress.ts financefrontier6.wordpress.com
 *
 * It writes:
 *   - public/imported/<post>/<n>.webp   the post's pictures, resized and compressed,
 *                                       so they keep working after the old blog is closed
 *   - supabase/imports/wordpress.sql    paste into the Supabase SQL Editor and press Run
 *
 * Posts keep their original publish dates. Running the SQL twice does not create duplicates.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";
import sharp from "sharp";
import type { DocNode, Mark } from "../lib/content/doc";
import { readingMinutes } from "../lib/content/doc";
import { safeHref } from "../lib/content/render";
import { slugify } from "../lib/format";
import { samplePosts } from "../lib/samplePosts";

const site = process.argv[2] ?? "financefrontier6.wordpress.com";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type WpPost = {
  date: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: Record<string, unknown>;
  featured_image?: string;
};

// ---------------------------------------------------------------------------
// HTML entities and text
// ---------------------------------------------------------------------------

function decode(s: string) {
  const doc = parseDocument(`<x>${s}</x>`, { decodeEntities: true });
  return textOf(doc.children).replace(/\s+/g, " ").trim();
}

function textOf(nodes: ChildNode[]): string {
  return nodes
    .map((n) => (n.type === "text" ? n.data : "children" in n ? textOf(n.children as ChildNode[]) : ""))
    .join("");
}

const isEl = (n: ChildNode): n is Element => n.type === "tag" || n.type === "script" || n.type === "style";

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

type PendingImage = { url: string; file: string; publicPath: string };
let pending: PendingImage[] = [];
let imageIndex = 0;
let currentSlug = "";

/** Remembers a picture to download and returns the address it will have on the new site. */
function localImage(src: string) {
  const clean = src.replace(/\?.*$/, "");
  const existing = pending.find((p) => p.url === clean);
  if (existing) return existing.publicPath;
  imageIndex += 1;
  const publicPath = `/imported/${currentSlug}/${imageIndex}.webp`;
  pending.push({ url: clean, file: join(root, "public", publicPath), publicPath });
  return publicPath;
}

function imageNode(el: Element, caption = ""): DocNode | null {
  const src = el.attribs["data-orig-file"] || el.attribs.src;
  if (!src || !/^https?:/.test(src)) return null;
  return {
    type: "image",
    attrs: { src: localImage(src), alt: decode(el.attribs.alt ?? ""), caption },
  };
}

// ---------------------------------------------------------------------------
// Inline content: text with bold, italic and links
// ---------------------------------------------------------------------------

function inline(nodes: ChildNode[], marks: Mark[] = [], hoisted: DocNode[] = []): DocNode[] {
  const out: DocNode[] = [];
  for (const n of nodes) {
    if (n.type === "text") {
      const text = n.data.replace(/\s+/g, " ");
      if (text) out.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
      continue;
    }
    if (!isEl(n)) continue;
    const tag = n.name.toLowerCase();
    const kids = n.children as ChildNode[];
    if (tag === "br") out.push({ type: "hardBreak" });
    else if (tag === "strong" || tag === "b") out.push(...inline(kids, addMark(marks, { type: "bold" }), hoisted));
    else if (tag === "em" || tag === "i") out.push(...inline(kids, addMark(marks, { type: "italic" }), hoisted));
    else if (tag === "code") out.push(...inline(kids, addMark(marks, { type: "code" }), hoisted));
    else if (tag === "a") {
      const href = safeHref(n.attribs.href);
      out.push(...inline(kids, href ? addMark(marks, { type: "link", attrs: { href } }) : marks, hoisted));
    } else if (tag === "img") {
      const img = imageNode(n);
      if (img) hoisted.push(img);
    } else if (tag === "sub" || tag === "sup") {
      // On the old blog these hold source links written out as plain text. Make them real links.
      const text = textOf(kids).trim();
      const href = /^https?:\/\/\S+$/.test(text) ? safeHref(text) : null;
      if (href) out.push({ type: "text", text: "Source", marks: addMark(marks, { type: "link", attrs: { href } }) });
      else out.push(...inline(kids, marks, hoisted));
    } else if (tag === "script" || tag === "style") continue;
    else out.push(...inline(kids, marks, hoisted));
  }
  return out;
}

function addMark(marks: Mark[], mark: Mark) {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

/** Joins neighbouring text with the same formatting and trims the ends. */
function tidy(nodes: DocNode[]): DocNode[] {
  const merged: DocNode[] = [];
  for (const n of nodes) {
    const last = merged[merged.length - 1];
    if (n.type === "text" && last?.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(n.marks ?? [])) {
      last.text = (last.text ?? "") + (n.text ?? "");
    } else merged.push({ ...n });
  }
  while (merged.length && (merged[0].type === "hardBreak" || (merged[0].type === "text" && !merged[0].text!.trim()))) merged.shift();
  while (merged.length && (merged.at(-1)!.type === "hardBreak" || (merged.at(-1)!.type === "text" && !merged.at(-1)!.text!.trim()))) merged.pop();
  if (merged[0]?.type === "text") merged[0].text = merged[0].text!.replace(/^\s+/, "");
  const end = merged.at(-1);
  if (end?.type === "text") end.text = end.text!.replace(/\s+$/, "");
  return merged.filter((n) => n.type !== "text" || n.text);
}

function paragraph(nodes: ChildNode[]): DocNode[] {
  const hoisted: DocNode[] = [];
  const content = tidy(inline(nodes, [], hoisted));
  const out: DocNode[] = [];
  if (content.length) out.push({ type: "paragraph", content });
  return [...out, ...hoisted];
}

// ---------------------------------------------------------------------------
// Blocks: paragraphs, headings, lists, quotes, tables, pictures
// ---------------------------------------------------------------------------

const BLOCK_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "figure", "img", "table", "hr",
  "pre", "div", "section", "details", "summary", "iframe", "li",
]);

function blocks(nodes: ChildNode[]): DocNode[] {
  const out: DocNode[] = [];
  let run: ChildNode[] = []; // loose inline content between blocks
  const flush = () => {
    if (run.length) out.push(...paragraph(run));
    run = [];
  };
  for (const n of nodes) {
    if (n.type === "text" || (isEl(n) && !BLOCK_TAGS.has(n.name.toLowerCase()))) {
      run.push(n);
      continue;
    }
    if (!isEl(n)) continue;
    flush();
    out.push(...block(n));
  }
  flush();
  return out;
}

function block(el: Element): DocNode[] {
  const tag = el.name.toLowerCase();
  const kids = el.children as ChildNode[];
  const cls = el.attribs.class ?? "";
  switch (tag) {
    case "p":
      return paragraph(kids);
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      // headings on the old blog were often bold as well; the new style is bold already
      const content = tidy(inline(kids)).map((c) => ({ ...c, marks: c.marks?.filter((m) => m.type !== "bold") }));
      const clean = content.map((c) => (c.marks?.length ? c : { ...c, marks: undefined }));
      if (!clean.length) return [];
      return [{ type: "heading", attrs: { level: tag === "h1" || tag === "h2" ? 2 : 3 }, content: clean }];
    }
    case "ul":
    case "ol": {
      const items = kids.filter((k): k is Element => isEl(k) && k.name === "li").map(listItem).filter(Boolean) as DocNode[];
      if (!items.length) return [];
      return [{ type: tag === "ul" ? "bulletList" : "orderedList", content: items }];
    }
    case "li":
      return blocks(kids);
    case "blockquote": {
      const inner = blocks(kids).filter((b) => b.type !== "image");
      return inner.length ? [{ type: "blockquote", content: inner }] : [];
    }
    case "hr":
      return [{ type: "horizontalRule" }];
    case "pre": {
      const text = textOf(kids).replace(/\n$/, "");
      return text.trim() ? [{ type: "codeBlock", attrs: { language: null }, content: [{ type: "text", text }] }] : [];
    }
    case "img": {
      const img = imageNode(el);
      return img ? [img] : [];
    }
    case "iframe":
      return embed(el);
    case "table":
      return table(el);
    case "summary": {
      const content = tidy(inline(kids, [{ type: "bold" }]));
      return content.length ? [{ type: "paragraph", content }] : [];
    }
    case "figure": {
      const caption = decode(
        (el.children as ChildNode[])
          .filter((k): k is Element => isEl(k) && k.name === "figcaption")
          .map((k) => textOf(k.children as ChildNode[]))
          .join(" "),
      );
      const img = find(el, "img");
      if (img && !find(el, "table")) {
        const node = imageNode(img, caption);
        return node ? [node] : [];
      }
      if (/wp-block-embed/.test(cls) || find(el, "iframe")) {
        const frame = find(el, "iframe");
        return frame ? embed(frame) : blocks(kids.filter((k) => !(isEl(k) && k.name === "figcaption")));
      }
      return blocks(kids.filter((k) => !(isEl(k) && k.name === "figcaption")));
    }
    default:
      // div, section, details and anything else: keep what is inside
      if (/wp-block-post-date/.test(cls)) return [];
      return blocks(kids);
  }
}

function listItem(li: Element): DocNode | null {
  const content = blocks(li.children as ChildNode[]);
  if (!content.length) return null;
  // a list item must start with a paragraph
  if (content[0].type !== "paragraph") content.unshift({ type: "paragraph" });
  return { type: "listItem", content };
}

function find(el: Element, name: string): Element | null {
  for (const k of el.children as ChildNode[]) {
    if (!isEl(k)) continue;
    if (k.name === name) return k;
    const deeper = find(k, name);
    if (deeper) return deeper;
  }
  return null;
}

/** Embedded videos become a plain link: nothing from another site runs on the page. */
function embed(frame: Element): DocNode[] {
  const src = frame.attribs.src ?? "";
  const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
  const href = yt ? `https://www.youtube.com/watch?v=${yt[1]}` : safeHref(src);
  if (!href) return [];
  const label = yt ? "Watch the video on YouTube" : "Open the embedded content";
  return [{ type: "paragraph", content: [{ type: "text", text: `▶ ${label}`, marks: [{ type: "link", attrs: { href } }] }] }];
}

function table(el: Element): DocNode[] {
  const rows: Element[] = [];
  const collect = (node: Element) => {
    for (const k of node.children as ChildNode[]) {
      if (!isEl(k)) continue;
      if (k.name === "tr") rows.push(k);
      else if (["thead", "tbody", "tfoot"].includes(k.name)) collect(k);
    }
  };
  collect(el);
  const out = rows
    .map((tr) => {
      const cells = (tr.children as ChildNode[])
        .filter((c): c is Element => isEl(c) && (c.name === "td" || c.name === "th"))
        .map((c) => {
          const content = blocks(c.children as ChildNode[]).filter((b) => b.type === "paragraph");
          return {
            type: c.name === "th" ? "tableHeader" : "tableCell",
            attrs: { colspan: Number(c.attribs.colspan) || 1, rowspan: Number(c.attribs.rowspan) || 1, colwidth: null },
            content: content.length ? content : [{ type: "paragraph" }],
          };
        });
      return cells.length ? { type: "tableRow", content: cells } : null;
    })
    .filter(Boolean) as DocNode[];
  return out.length ? [{ type: "table", content: out }] : [];
}

// ---------------------------------------------------------------------------
// Tags, excerpts and the SQL file
// ---------------------------------------------------------------------------

// Every post on a finance blog is about finance, so these tags would not help anyone filter.
const TOO_GENERAL = new Set(["finance", "investing", "investment", "stocks", "uncategorized"]);
const NAMES: Record<string, string> = {
  ai: "AI",
  "artificial-intelligence": "AI",
  llm: "AI",
  "deep-seek": "AI",
  "stock-market": "Stock Market",
  "equity research": "Equity Research",
  equity: "Equity Research",
  "personal-finance": "Personal Finance",
  "passive-income": "Passive Income",
  "digital-marketing": "Tools",
  marketing: "Tools",
  ozempic: "Healthcare",
  diabetes: "Healthcare",
  obesity: "Healthcare",
  "weight-loss": "Healthcare",
  health: "Healthcare",
  meta: "Big Tech",
  crypto: "Crypto",
  bitcoin: "Crypto",
};

/** Posts that had no tags on the old blog. */
const EXTRA_TAGS: Record<string, string[]> = {
  "novo-nordisk-vs-eli-lilly-why-the-consensus-has-it-backwards-again": ["Healthcare"],
  "stock-evaluation-criteria": ["Valuation", "Beginners"],
  "journey-and-motivation": ["Personal"],
  "how-to-build-a-strong-financial-foundation": ["Personal Finance", "Beginners"],
  "assets-vs-liabilities": ["Personal Finance", "Beginners"],
  "journey-into-the-stock-market": ["Beginners"],
  "budgeting-for-beginners": ["Personal Finance", "Beginners"],
  "the-power-of-financial-discipline": ["Personal Finance"],
};

function tagsFor(post: WpPost, slug: string) {
  const names = [...Object.keys(post.tags), ...(EXTRA_TAGS[slug] ?? [])]
    .map((t) => t.toLowerCase())
    .filter((t) => !TOO_GENERAL.has(t))
    .map((t) => NAMES[t] ?? t.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  return [...new Set(names)].slice(0, 4);
}

function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[\s,.;:–-]+$/, "");
  return `${cut}…`;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const api = `https://public-api.wordpress.com/rest/v1.1/sites/${site}/posts/?number=100&status=publish&order_by=date&order=DESC`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`WordPress answered ${res.status}`);
  const { posts } = (await res.json()) as { posts: WpPost[] };
  console.log(`Found ${posts.length} posts on ${site}`);

  const used = new Set<string>();
  const rows: string[] = [];
  const allImages: PendingImage[] = [];

  for (const post of posts) {
    const title = decode(post.title);
    let slug = slugify(title) || slugify(decodeURIComponent(post.slug)) || "post";
    while (used.has(slug)) slug += "-2";
    used.add(slug);

    currentSlug = slug;
    pending = [];
    imageIndex = 0;

    const parsed = parseDocument(post.content, { decodeEntities: true });
    const content = blocks(parsed.children).filter((b) => !(b.type === "paragraph" && !b.content?.length));

    // Cover: the post's featured picture, or else its first picture (taken out of the text so it does not show twice).
    let cover: string | null = null;
    let coverAlt = "";
    if (post.featured_image) {
      cover = localImage(post.featured_image);
      coverAlt = title;
    } else {
      const first = content.findIndex((b) => b.type === "image");
      if (first !== -1) {
        cover = String(content[first].attrs!.src);
        coverAlt = String(content[first].attrs!.alt || title);
        if (first < 2) content.splice(first, 1);
      }
    }

    const doc: DocNode = { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
    const excerpt = shorten(decode(post.excerpt), 300);
    const tags = tagsFor(post, slug);
    allImages.push(...pending);

    rows.push(
      [
        q(slug),
        q(title.slice(0, 200)),
        q(excerpt),
        `${q(JSON.stringify(doc))}::jsonb`,
        cover ? q(cover) : "null",
        q(coverAlt.slice(0, 300)),
        `array[${tags.map(q).join(", ")}]::text[]`,
        q(shorten(excerpt, 160)),
        "'published'",
        `${q(new Date(post.date).toISOString())}::timestamptz`,
        String(readingMinutes(doc)),
      ].join(",\n    "),
    );
    console.log(`  ${new Date(post.date).toISOString().slice(0, 10)}  ${slug}  (${pending.length} pictures, tags: ${tags.join(", ") || "none"})`);
  }

  // Download and compress the pictures.
  let saved = 0;
  let before = 0;
  for (const img of allImages) {
    const r = await fetch(img.url);
    if (!r.ok) {
      console.warn(`  could not download ${img.url} (${r.status})`);
      continue;
    }
    const input = Buffer.from(await r.arrayBuffer());
    before += input.length;
    mkdirSync(dirname(img.file), { recursive: true });
    const out = await sharp(input, { animated: false })
      .rotate()
      .resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    writeFileSync(img.file, out);
    saved += out.length;
  }
  console.log(`Saved ${allImages.length} pictures: ${(before / 1e6).toFixed(1)} MB on WordPress, ${(saved / 1e6).toFixed(1)} MB here`);

  const sampleSlugs = samplePosts.map((p) => q(p.slug)).join(", ");
  const sql = `-- Your ${posts.length} posts from ${site}, with their original publish dates.
-- Paste all of this into the Supabase SQL Editor and press Run.
-- Running it again is safe: posts that are already there are left alone.

-- 1. Remove the three sample posts that came with the site.
delete from public.posts where slug in (${sampleSlugs});

-- 2. Add your posts.
insert into public.posts
  (slug, title, excerpt, content, cover_image_url, cover_image_alt, tags, seo_description, status, published_at, reading_minutes)
values
${rows.map((r) => `  (\n    ${r}\n  )`).join(",\n")}
on conflict (slug) do nothing;
`;
  const sqlPath = join(root, "supabase", "imports", "wordpress.sql");
  mkdirSync(dirname(sqlPath), { recursive: true });
  writeFileSync(sqlPath, sql);
  console.log(`Wrote supabase/imports/wordpress.sql (${(sql.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
