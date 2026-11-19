import sanitizeHtml from "sanitize-html";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";
import type { DocNode, Mark } from "./doc";
import { glossaryMatcher, lookupTerm } from "./glossary";
import { VERDICTS, formatMoney, hasSnapshotContent, parsePrice, readSnapshot } from "./stock";

const lowlight = createLowlight(common);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Only ordinary web links, email links and links within the site are allowed. */
export function safeHref(raw: unknown): string | null {
  const href = String(raw ?? "").trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Images may come from the site itself or from any secure web address (Supabase storage). */
export function safeSrc(raw: unknown): string | null {
  const src = String(raw ?? "").trim();
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try {
    const url = new URL(src);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function plain(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plain).join("");
}

/** Everything the renderer keeps track of while it walks one post. */
type Ctx = {
  ids: Map<string, number>;
  headings: Heading[];
  /** glossary terms already explained in this post */
  terms: Set<string>;
  /** false inside headings, so titles stay plain */
  explain: boolean;
};

export type Heading = { id: string; text: string; level: 2 | 3 };

const MAX_TERMS_PER_POST = 14;

/** Wraps the first use of each glossary term in a small explainer. */
function withTerms(text: string, ctx: Ctx) {
  if (!ctx.explain || ctx.terms.size >= MAX_TERMS_PER_POST) return escapeHtml(text);
  const { regex } = glossaryMatcher();
  regex.lastIndex = 0;
  let out = "";
  let last = 0;
  for (const m of text.matchAll(regex)) {
    const term = lookupTerm(m[0]);
    if (!term || ctx.terms.has(term.id) || ctx.terms.size >= MAX_TERMS_PER_POST) continue;
    ctx.terms.add(term.id);
    out += escapeHtml(text.slice(last, m.index));
    out += `<span class="term" tabindex="0">${escapeHtml(m[0])}<span class="term-tip" role="tooltip">${escapeHtml(term.definition)}</span></span>`;
    last = m.index! + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

function renderText(node: DocNode, ctx: Ctx) {
  const marks: Mark[] = node.marks ?? [];
  const plainText = !marks.some((m) => m.type === "link" || m.type === "code");
  let html = plainText ? withTerms(node.text ?? "", ctx) : escapeHtml(node.text ?? "");
  // the code mark goes innermost and the link outermost
  const order = ["code", "bold", "italic", "underline", "strike", "link"];
  for (const mark of [...marks].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) break;
        const external = /^https?:/.test(href);
        html = `<a href="${escapeHtml(href)}"${external ? ' rel="noopener noreferrer nofollow" target="_blank"' : ""}>${html}</a>`;
        break;
      }
    }
  }
  return html;
}

function highlight(code: string, language: string) {
  try {
    const tree =
      language && lowlight.registered(language) ? lowlight.highlight(language, code) : lowlight.highlightAuto(code);
    return toHtml(tree);
  } catch {
    return escapeHtml(code);
  }
}

function renderSnapshot(node: DocNode) {
  const s = readSnapshot(node.attrs);
  if (!hasSnapshotContent(s)) return "";
  const verdict = VERDICTS[s.verdict];
  const price = parsePrice(s.price);
  const rows = [
    ...(price !== null ? [{ label: "Price when written", value: formatMoney(price, s.currency) }] : []),
    ...s.metrics.filter((m) => m.label && m.value),
  ];
  const listing = [s.exchange !== "Other" ? s.exchange : "", s.ticker].filter(Boolean).join(": ");
  return `<aside class="stock-card" aria-label="Company snapshot">
<div class="stock-card-head"><div><p class="stock-card-kicker">Company snapshot</p><p class="stock-card-name">${escapeHtml(s.company || s.ticker)}</p>${listing ? `<p class="stock-card-ticker">${escapeHtml(listing)}</p>` : ""}</div><p class="stock-verdict stock-verdict-${s.verdict}"><span class="stock-verdict-label">${verdict.label}</span><span class="stock-verdict-note">${escapeHtml(verdict.note)}</span></p></div>
${rows.length ? `<dl class="stock-card-metrics">${rows.map((r) => `<div><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`).join("")}</dl>` : ""}
${s.summary ? `<p class="stock-card-summary">${escapeHtml(s.summary)}</p>` : ""}
</aside>`;
}

function renderNode(node: DocNode, ctx: Ctx): string {
  const used = ctx.ids;
  const inner = () => (node.content ?? []).map((child) => renderNode(child, ctx)).join("");
  switch (node.type) {
    case "doc":
      return inner();
    case "text":
      return renderText(node, ctx);
    case "stockSnapshot":
      return renderSnapshot(node);
    case "paragraph":
      return `<p>${inner()}</p>`;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      let id = slugifyHeading(plain(node)) || "section";
      const seen = used.get(id) ?? 0;
      used.set(id, seen + 1);
      if (seen) id = `${id}-${seen + 1}`;
      if (level <= 3) ctx.headings.push({ id, text: plain(node).trim(), level: level as 2 | 3 });
      const explain = ctx.explain;
      ctx.explain = false;
      const body = inner();
      ctx.explain = explain;
      return `<h${level} id="${id}">${body}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${inner()}</ul>`;
    case "orderedList": {
      const start = Number(node.attrs?.start) || 1;
      return start !== 1 ? `<ol start="${Math.floor(start)}">${inner()}</ol>` : `<ol>${inner()}</ol>`;
    }
    case "listItem":
      return `<li>${inner()}</li>`;
    case "blockquote":
      return `<blockquote>${inner()}</blockquote>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "codeBlock": {
      const language = String(node.attrs?.language ?? "").replace(/[^a-z0-9+#-]/gi, "").toLowerCase();
      const cls = language ? `hljs language-${language}` : "hljs";
      return `<pre><code class="${cls}">${highlight(plain(node), language)}</code></pre>`;
    }
    case "table":
      return `<div class="table-wrap"><table><tbody>${inner()}</tbody></table></div>`;
    case "tableRow":
      return `<tr>${inner()}</tr>`;
    case "tableHeader":
    case "tableCell": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const span = (name: string) => {
        const n = Math.floor(Number(node.attrs?.[name]) || 1);
        return n > 1 && n <= 20 ? ` ${name}="${n}"` : "";
      };
      // a cell holding a single paragraph is written without the <p>, so rows stay compact
      const kids = node.content ?? [];
      const body =
        kids.length === 1 && kids[0].type === "paragraph"
          ? (kids[0].content ?? []).map((c) => renderNode(c, ctx)).join("")
          : inner();
      return `<${tag}${span("colspan")}${span("rowspan")}>${body}</${tag}>`;
    }
    case "image": {
      const src = safeSrc(node.attrs?.src);
      if (!src) return "";
      const alt = escapeHtml(String(node.attrs?.alt ?? ""));
      const caption = String(node.attrs?.caption ?? "").trim();
      return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async">${
        caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""
      }</figure>`;
    }
    default:
      // Unknown blocks keep their text but lose any formatting.
      return node.content ? `<p>${inner()}</p>` : "";
  }
}

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h2", "h3", "h4", "strong", "em", "u", "s", "code", "pre", "a", "ul", "ol", "li",
    "blockquote", "br", "hr", "figure", "figcaption", "img", "span",
    "div", "table", "tbody", "tr", "th", "td", "aside", "dl", "dt", "dd",
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
    img: ["src", "alt", "loading", "decoding"],
    ol: ["start"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    code: ["class"],
    span: ["class", "tabindex", "role"],
    div: ["class"],
    p: ["class"],
    aside: ["class", "aria-label"],
    dl: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedClasses: {
    div: ["table-wrap", "stock-*"],
    p: ["stock-*"],
    aside: ["stock-card"],
    dl: ["stock-card-metrics"],
    code: ["hljs", "language-*"],
    span: ["hljs-*", "term", "term-tip", "stock-*"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

/** Turns a stored post document into safe HTML, and lists its headings for the table of contents. */
export function renderPost(doc: DocNode | null | undefined, options: { explainTerms?: boolean } = {}) {
  const ctx: Ctx = { ids: new Map(), headings: [], terms: new Set(), explain: options.explainTerms ?? true };
  if (!doc || doc.type !== "doc") return { html: "", headings: [] as Heading[] };
  const html = sanitizeHtml(renderNode(doc, ctx), sanitizeOptions);
  return { html, headings: ctx.headings };
}

/** Turns a stored post document into safe HTML. */
export function renderDoc(doc: DocNode | null | undefined, options: { explainTerms?: boolean } = {}): string {
  return renderPost(doc, options).html;
}
