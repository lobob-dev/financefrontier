"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { isDoc, readingMinutes, type DocNode } from "@/lib/content/doc";
import { safeSrc } from "@/lib/content/render";
import { slugify } from "@/lib/format";
import { rowToAdminPost, type PostRow } from "@/lib/admin/posts";
import type { AdminPost } from "@/lib/types";

export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: DocNode;
  coverImageUrl: string | null;
  coverImageAlt: string;
  tags: string[];
  seoDescription: string;
};

export type SaveResult = { ok: true; post: AdminPost } | { ok: false; error: string };

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function clean(input: PostInput): { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
  const title = String(input.title ?? "").trim().slice(0, 200);
  const slug = slugify(String(input.slug ?? "")) || slugify(title);
  if (!slug) return { ok: false, error: "Give the post a title or a web address first." };
  if (!isDoc(input.content)) return { ok: false, error: "The post content could not be read." };
  if (JSON.stringify(input.content).length > 1_500_000) {
    return { ok: false, error: "This post is too long to save in one piece." };
  }
  const cover = input.coverImageUrl ? safeSrc(input.coverImageUrl) : null;
  if (input.coverImageUrl && !cover) return { ok: false, error: "The cover image address is not valid." };
  const tags = [
    ...new Set(
      (input.tags ?? [])
        .map((t) => String(t).trim().replace(/\s+/g, " ").slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 12);

  return {
    ok: true,
    row: {
      title,
      slug,
      excerpt: String(input.excerpt ?? "").trim().slice(0, 600),
      content: input.content,
      cover_image_url: cover,
      cover_image_alt: String(input.coverImageAlt ?? "").trim().slice(0, 300),
      tags,
      seo_description: String(input.seoDescription ?? "").trim().slice(0, 300),
      reading_minutes: Math.min(600, readingMinutes(input.content)),
    },
  };
}

function friendly(message: string) {
  if (/posts_slug_key|duplicate key/i.test(message)) return "Another post already uses that web address. Change the slug.";
  if (/row-level security/i.test(message)) return "Your account is not allowed to change posts.";
  return "The post could not be saved. Please try again.";
}

/** Creates an empty draft and opens it in the editor. */
export async function createPost() {
  await requireAdmin();
  const supabase = await serverClient();
  const slug = `untitled-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase.from("posts").insert({ slug, title: "" }).select("id").single();
  if (error) throw new Error(friendly(error.message));
  redirect(`/admin/posts/${data.id}`);
}

/** Autosave and the Save button both call this. */
export async function savePost(id: string, input: PostInput): Promise<SaveResult> {
  await requireAdmin();
  if (!isId(id)) return { ok: false, error: "Unknown post." };
  const cleaned = clean(input);
  if (!cleaned.ok) return cleaned;
  const supabase = await serverClient();
  const { data, error } = await supabase.from("posts").update(cleaned.row).eq("id", id).select("*").single();
  if (error) return { ok: false, error: friendly(error.message) };
  const post = rowToAdminPost(data as PostRow);
  if (post.status === "published") updateTag("posts");
  return { ok: true, post };
}

/** Publishes now, or at a future time when `publishAt` is given. */
export async function publishPost(id: string, input: PostInput, publishAt: string | null): Promise<SaveResult> {
  await requireAdmin();
  if (!isId(id)) return { ok: false, error: "Unknown post." };
  const cleaned = clean(input);
  if (!cleaned.ok) return cleaned;
  if (!String(cleaned.row.title)) return { ok: false, error: "Add a title before publishing." };
  if (String(cleaned.row.slug).startsWith("untitled-")) {
    cleaned.row.slug = slugify(String(cleaned.row.title));
  }
  let when = new Date();
  if (publishAt) {
    when = new Date(publishAt);
    if (Number.isNaN(when.getTime())) return { ok: false, error: "That publish date is not valid." };
  }
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ ...cleaned.row, status: "published", published_at: when.toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag("posts");
  return { ok: true, post: rowToAdminPost(data as PostRow) };
}

export async function unpublishPost(id: string): Promise<SaveResult> {
  await requireAdmin();
  if (!isId(id)) return { ok: false, error: "Unknown post." };
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ status: "draft" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag("posts");
  return { ok: true, post: rowToAdminPost(data as PostRow) };
}

/** Used by the buttons in the post list. */
export async function setPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  const supabase = await serverClient();
  if (formData.get("publish") === "1") {
    const { data } = await supabase.from("posts").select("title,published_at").eq("id", id).single();
    if (!data?.title) return;
    await supabase
      .from("posts")
      .update({ status: "published", published_at: data.published_at ?? new Date().toISOString() })
      .eq("id", id);
  } else {
    await supabase.from("posts").update({ status: "draft" }).eq("id", id);
  }
  updateTag("posts");
  refresh();
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  const supabase = await serverClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(friendly(error.message));
  updateTag("posts");
  if (formData.get("from") === "editor") redirect("/admin");
  refresh();
}
