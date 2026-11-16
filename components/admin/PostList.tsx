"use client";

import { useState } from "react";
import Link from "next/link";
import { deletePost, setPublished } from "@/app/admin/actions";
import { useNow } from "./useNow";
import type { AdminPostListItem } from "@/lib/admin/posts";

type Filter = "all" | "draft" | "scheduled" | "published";

function statusOf(post: AdminPostListItem, now: number): Exclude<Filter, "all"> {
  if (post.status === "draft") return "draft";
  return post.publishedAt && new Date(post.publishedAt).getTime() > now ? "scheduled" : "published";
}

const badge: Record<Exclude<Filter, "all">, string> = {
  draft: "bg-bg-soft text-ink-soft",
  scheduled: "bg-sky-soft text-sky",
  published: "bg-accent-soft text-accent-strong",
};

export function PostList({ posts }: { posts: AdminPostListItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const now = useNow();
  const rows = posts.map((p) => ({ ...p, state: statusOf(p, now) }));
  const shown = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const count = (f: Filter) => (f === "all" ? rows.length : rows.filter((r) => r.state === f).length);

  if (!posts.length) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
        No posts yet. Press <strong>New post</strong> to write your first one.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
        {(["all", "draft", "scheduled", "published"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              filter === f ? "bg-ink text-bg" : "bg-surface text-ink-soft ring-1 ring-line hover:text-ink"
            }`}
          >
            {f === "all" ? "All" : `${f}s`} <span className="opacity-60">{count(f)}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        {shown.map((post) => (
          <li key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badge[post.state]}`}>
                  {post.state}
                </span>
                <span className="text-xs text-muted" suppressHydrationWarning>
                  {post.state === "draft"
                    ? `Edited ${new Date(post.updatedAt).toLocaleDateString()}`
                    : `${post.state === "scheduled" ? "Goes live" : "Published"} ${new Date(post.publishedAt!).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}`}
                </span>
              </div>
              <Link
                href={`/admin/posts/${post.id}`}
                className="mt-1 block truncate font-serif text-lg font-semibold text-ink hover:text-accent-strong"
              >
                {post.title || "Untitled draft"}
              </Link>
              {post.tags.length > 0 && <p className="truncate text-sm text-muted">{post.tags.join(" · ")}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/admin/posts/${post.id}`} className="btn-quiet">Edit</Link>
              {post.state === "published" && (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn-quiet">View</a>
              )}
              <form action={setPublished}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="publish" value={post.state === "draft" ? "1" : "0"} />
                <button
                  type="submit"
                  className="btn-quiet"
                  disabled={post.state === "draft" && !post.title}
                  title={post.state === "draft" && !post.title ? "Add a title before publishing" : undefined}
                >
                  {post.state === "draft" ? "Publish" : "Unpublish"}
                </button>
              </form>
              <form
                action={deletePost}
                onSubmit={(e) => {
                  if (!window.confirm(`Delete "${post.title || "Untitled draft"}" for good? This cannot be undone.`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="btn-danger" aria-label={`Delete ${post.title || "untitled draft"}`}>
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
