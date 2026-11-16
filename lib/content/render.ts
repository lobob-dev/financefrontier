import sanitizeHtml from "sanitize-html";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";
import type { DocNode, Mark } from "./doc";

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

function renderText(node: DocNode) {
  let html = escapeHtml(node.text ?? "");
  const marks: Mark[] = node.marks ?? [];
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

function renderNode(node: DocNode, used: Map<string, number>): string {
  const inner = () => (node.content ?? []).map((child) => renderNode(child, used)).join("");
  switch (node.type) {
    case "doc":
      return inner();
    case "text":
      return renderText(node);
    case "paragraph":
      return `<p>${inner()}</p>`;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      let id = slugifyHeading(plain(node)) || "section";
      const seen = used.get(id) ?? 0;
      used.set(id, seen + 1);
      if (seen) id = `${id}-${seen + 1}`;
      return `<h${level} id="${id}">${inner()}</h${level}>`;
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
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
    img: ["src", "alt", "loading", "decoding"],
    ol: ["start"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    code: ["class"],
    span: ["class"],
  },
  allowedClasses: {
    code: ["hljs", "language-*"],
    span: ["hljs-*"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

/** Turns a stored post document into safe HTML. */
export function renderDoc(doc: DocNode | null | undefined): string {
  if (!doc || doc.type !== "doc") return "";
  return sanitizeHtml(renderNode(doc, new Map()), sanitizeOptions);
}
