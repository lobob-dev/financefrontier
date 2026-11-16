import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Post, PostSummary } from "./types";
import { site } from "./site";
import { samplePosts } from "./samplePosts";
import { supabaseConfigured } from "./env";
import { publicClient } from "./supabase/public";
import { isDoc, emptyDoc } from "./content/doc";
import { tagSlug } from "./format";

/**
 * Public reads. Results are cached and shared by every visitor, and refreshed
 * as soon as a post is saved in the admin area (the "posts" tag). Scheduled posts
 * appear within about fifteen minutes of their publish time.
 */

export const DEFAULT_COVER = "/covers/default.svg";

const COLUMNS =
  "slug,title,excerpt,content,cover_image_url,cover_image_alt,tags,seo_description,published_at,reading_minutes,updated_at";

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
