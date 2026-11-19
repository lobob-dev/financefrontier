import Link from "next/link";
import type { PostSummary } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function PostGrid({
  posts,
  headingLevel = 2,
  snippets,
}: {
  posts: PostSummary[];
  headingLevel?: 2 | 3;
  /** Matching text from inside each post, shown under the title when searching. */
  snippets?: Map<string, string>;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={`/blog/${post.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.coverAlt}
              loading="lazy"
              decoding="async"
              width={1600}
              height={1000}
              className="aspect-[16/10] w-full bg-bg-soft object-cover"
            />
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
                <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
              </p>
              <H className="mt-2 font-serif text-xl font-semibold leading-snug text-ink group-hover:text-accent-strong">
                {post.title}
              </H>
              {snippets?.get(post.slug) ? (
                <p className="mt-2 line-clamp-3 rounded-lg bg-accent-soft/60 px-2.5 py-1.5 text-sm leading-relaxed text-ink-soft">
                  {snippets.get(post.slug)}
                </p>
              ) : (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
              )}
              {post.tags.length > 0 && (
                <p className="mt-auto pt-4 text-xs font-medium text-muted">{post.tags.join(" · ")}</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
