import "server-only";
import { requireAdmin } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { emptyDoc, isDoc } from "@/lib/content/doc";
import type { AdminPost } from "@/lib/types";

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: unknown;
  cover_image_url: string | null;
  cover_image_alt: string;
  tags: string[];
  seo_description: string;
  status: "draft" | "published";
  published_at: string | null;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
};

export function rowToAdminPost(row: PostRow): AdminPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: isDoc(row.content) ? row.content : emptyDoc,
    coverImageUrl: row.cover_image_url,
    coverImageAlt: row.cover_image_alt,
    tags: row.tags ?? [],
    seoDescription: row.seo_description,
    status: row.status,
    publishedAt: row.published_at,
    readingMinutes: row.reading_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AdminPostListItem = Pick<
  AdminPost,
  "id" | "slug" | "title" | "status" | "publishedAt" | "updatedAt" | "tags" | "readingMinutes"
>;

/** Every post, drafts included. Row level security also checks the admin. */
export async function listAllPosts(): Promise<AdminPostListItem[]> {
  await requireAdmin();
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,status,published_at,updated_at,tags,reading_minutes")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    tags: r.tags ?? [],
    readingMinutes: r.reading_minutes,
  }));
}

export async function getPostForEditing(id: string): Promise<AdminPost | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await serverClient();
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToAdminPost(data as PostRow) : null;
}

/** Tags already used on any post, to suggest while typing. */
export async function listKnownTags(): Promise<string[]> {
  await requireAdmin();
  const supabase = await serverClient();
  const { data } = await supabase.from("posts").select("tags");
  const set = new Set<string>();
  for (const row of data ?? []) for (const t of row.tags ?? []) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}
