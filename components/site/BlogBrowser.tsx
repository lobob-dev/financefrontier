"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PostSummary } from "@/lib/types";
import { PostGrid } from "./PostGrid";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Search and tag filters for the post list. The choices are kept in the address so they can be shared. */
export function BlogBrowser({ posts, tags }: { posts: PostSummary[]; tags: { tag: string; count: number }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "");

  const sync = (q: string, t: string) => {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (t) next.set("tag", t);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Results from the full-text search, which also looks inside the posts.
  const [found, setFound] = useState<{ query: string; hits: Map<string, string> } | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = (await res.json()) as { hits: { slug: string; snippet: string }[] };
        setFound({ query: trimmed, hits: new Map(data.hits.map((h) => [h.slug, h.snippet])) });
      } catch {
        // offline or cancelled: the quick search below still works
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const full = found && found.query === trimmed && trimmed.length >= 2 ? found.hits : null;

  const shown = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    const list = posts.filter((p) => {
      if (tag && !p.tags.includes(tag)) return false;
      if (!words.length) return true;
      if (full) return full.has(p.slug);
      const hay = norm(`${p.title} ${p.excerpt} ${p.tags.join(" ")}`);
      return words.every((w) => hay.includes(w));
    });
    if (full) {
      const order = [...full.keys()];
      list.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
    }
    return list;
  }, [posts, query, tag, full]);

  return (
    <div>
      <div className="mt-8 flex flex-col gap-4">
        <div className="relative max-w-md">
          <label htmlFor="search" className="sr-only">Search posts</label>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              sync(e.target.value, tag);
            }}
            placeholder="Search every post, e.g. buyback or ASX"
            className="field rounded-full pl-10"
          />
        </div>
        {tags.length > 0 && (
          <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
            {[{ tag: "", count: posts.length }, ...tags].map((t) => {
              const active = tag === t.tag;
              return (
                <button
                  key={t.tag || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setTag(t.tag);
                    sync(query, t.tag);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    active ? "bg-accent-strong text-on-accent" : "bg-surface text-ink-soft ring-1 ring-line hover:text-accent-strong"
                  }`}
                >
                  {t.tag || "All"} <span className="opacity-60">{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {shown.length === 1 ? "1 post" : `${shown.length} posts`} shown
      </p>
      <div className="mt-10">
        {shown.length ? (
          <PostGrid posts={shown} snippets={full ?? undefined} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
            No posts match that search.
          </p>
        )}
      </div>
    </div>
  );
}
