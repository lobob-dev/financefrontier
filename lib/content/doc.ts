/**
 * Post content is stored as the editor's JSON document, and turned into HTML
 * by our own renderer. Every piece of text is escaped and every link and image
 * address is checked, so nothing typed into a post can run as code on the page.
 * The result then goes through an allowlist sanitiser as a second line of defence.
 */

export type Mark = { type: string; attrs?: Record<string, unknown> };
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: Mark[];
  text?: string;
};

export const emptyDoc: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

export function isDoc(value: unknown): value is DocNode {
  return !!value && typeof value === "object" && (value as DocNode).type === "doc";
}

/** All the text in a document, in reading order. */
export function docText(node: DocNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  const parts = (node.content ?? []).map(docText);
  const block = ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "image", "tableCell", "tableHeader"].includes(
    node.type,
  );
  const caption = node.type === "image" ? String(node.attrs?.caption ?? "") : "";
  return parts.join(block ? " " : "") + (caption ? ` ${caption}` : "") + (block ? "\n" : "");
}

export function wordCount(doc: DocNode | undefined) {
  return docText(doc).split(/\s+/).filter(Boolean).length;
}

/** About 220 words a minute, never less than one minute. */
export function readingMinutes(doc: DocNode | undefined) {
  return Math.max(1, Math.round(wordCount(doc) / 220));
}

/** Shorthand used by the sample posts. */
export const d = {
  doc: (...content: DocNode[]): DocNode => ({ type: "doc", content }),
  p: (text: string): DocNode => ({ type: "paragraph", content: [{ type: "text", text }] }),
  h2: (text: string): DocNode => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] }),
  quote: (text: string): DocNode => ({ type: "blockquote", content: [d.p(text)] }),
};
