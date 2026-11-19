import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Post, PostSummary } from "./types";
import { site } from "./site";
import { samplePosts } from "./samplePosts";
import { supabaseConfigured } from "./env";
import { publicClient } from "./supabase/public";
import { isDoc, emptyDoc, docText } from "./content/doc";
import { tagSlug } from "./format";

/**
 * Public reads. Results are cached and shared by every visitor, and refreshed
 * as soon as a post is saved in the admin area (the "posts" tag). Scheduled posts
 * appear within about fifteen minutes of their publish time.
 */

export const DEFAULT_COVER = "/covers/default.svg";

const COLUMNS =
  "slug,title,excerpt,content,cover_image_url,cover_image_alt,tags,seo_description,published_at,reading_minutes,updated_at,series,author";

type PublicRow = {
  slug: string;
  title: string;
  excerpt: string;
  content: unknown;
  cover_image_url: string | null;
  cover_image_alt: string;
  tags: string[];
  seo_description: string;
  published_at: string;
  reading_minutes: number;
  updated_at: string;
  series: string | null;
  author: string | null;
};

function rowToPost(row: PublicRow): Post {
  return {
    slug: row.slug,
    title: row.title || "Untitled",
    excerpt: row.excerpt,
    date: row.published_at,
    tags: row.tags ?? [],
    coverImage: row.cover_image_url || DEFAULT_COVER,
    coverAlt: row.cover_image_url ? row.cover_image_alt : "",
    readingMinutes: row.reading_minutes,
    content: isDoc(row.content) ? row.content : emptyDoc,
    seoDescription: row.seo_description,
    updatedAt: row.updated_at,
    series: row.series ?? null,
    author: row.author || null,
  };
}

export function toSummary(post: Post): PostSummary {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    tags: post.tags,
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    readingMinutes: post.readingMinutes,
  };
}

const byNewest = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1);

async function loadPublishedPosts(): Promise<Post[]> {
  "use cache";
  cacheTag("posts");
  cacheLife("posts");
  if (!supabaseConfigured) return [...samplePosts].sort(byNewest);
  // Row level security only returns published posts whose publish time has passed.
  const { data, error } = await publicClient()
    .from("posts")
    .select(COLUMNS)
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return (data as PublicRow[]).map(rowToPost);
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  return (await loadPublishedPosts()).map(toSummary);
}

/** Every published post with its full content, for the RSS feed. */
export async function getPublishedPostsWithContent(): Promise<Post[]> {
  return loadPublishedPosts();
}

/** The newest posts, which become the pages of the book. */
export async function getBookPosts(): Promise<PostSummary[]> {
  return (await getPublishedPosts()).slice(0, site.bookPostLimit);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return (await loadPublishedPosts()).find((p) => p.slug === slug) ?? null;
}

/** The posts either side of this one, for the links at the end of an article. */
export async function getNeighbours(slug: string) {
  const posts = await getPublishedPosts();
  const i = posts.findIndex((p) => p.slug === slug);
  return {
    newer: i > 0 ? posts[i - 1] : null,
    older: i >= 0 && i < posts.length - 1 ? posts[i + 1] : null,
  };
}

export async function getAllTags(): Promise<{ tag: string; slug: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const post of await getPublishedPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, slug: tagSlug(tag), count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The other parts of a series, oldest first. */
export async function getSeries(name: string | null): Promise<PostSummary[]> {
  if (!name) return [];
  const posts = (await loadPublishedPosts()).filter((p) => p.series === name);
  return posts.sort((a, b) => (a.date < b.date ? -1 : 1)).map(toSummary);
}

/** Up to three posts that share the most tags with this one, then the newest. */
export async function getRelated(post: Post, count = 3): Promise<PostSummary[]> {
  const others = (await loadPublishedPosts()).filter(
    (p) => p.slug !== post.slug && (!post.series || p.series !== post.series),
  );
  const tags = new Set(post.tags);
  return others
    .map((p) => ({ p, score: p.tags.filter((t) => tags.has(t)).length }))
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, count)
    .map(({ p }) => toSummary(p));
}

export type SearchHit = { slug: string; snippet: string };

/** Searches titles, excerpts, tags and the full text of every published post. */
export async function searchPosts(query: string): Promise<SearchHit[]> {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1).slice(0, 8);
  if (!words.length) return [];
  const hits: (SearchHit & { score: number })[] = [];
  for (const post of await loadPublishedPosts()) {
    const head = norm(`${post.title} ${post.excerpt} ${post.tags.join(" ")} ${post.series ?? ""}`);
    const body = docText(post.content).replace(/\s+/g, " ");
    const bodyNorm = norm(body);
    if (!words.every((w) => head.includes(w) || bodyNorm.includes(w))) continue;
    let snippet = "";
    const inBody = words.find((w) => !head.includes(w) && bodyNorm.includes(w)) ?? words.find((w) => bodyNorm.includes(w));
    if (inBody) {
      const at = bodyNorm.indexOf(inBody);
      const start = Math.max(0, body.lastIndexOf(" ", Math.max(0, at - 60)));
      const end = body.indexOf(" ", Math.min(body.length, at + 110));
      snippet = `${start > 0 ? "…" : ""}${body.slice(start, end === -1 ? undefined : end).trim()}${end !== -1 ? "…" : ""}`;
    }
    const score = words.reduce((n, w) => n + (norm(post.title).includes(w) ? 3 : head.includes(w) ? 2 : 1), 0);
    hits.push({ slug: post.slug, snippet, score });
  }
  return hits.sort((a, b) => b.score - a.score).map(({ slug, snippet }) => ({ slug, snippet }));
}
