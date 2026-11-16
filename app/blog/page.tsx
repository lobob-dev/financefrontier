import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { getPublishedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "All posts" };

/** A plain list of every post. Search and tag filters arrive in the public pages stage. */
export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  return (
    <div className="stage-bg flex min-h-[100svh] flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">All posts</h1>
        <p className="mt-3 text-ink-soft">Every note, newest first.</p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt={post.coverAlt} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
                    {formatDate(post.date)} · {post.readingMinutes} min read
                  </p>
                  <h2 className="mt-2 font-serif text-xl font-semibold leading-snug group-hover:text-accent-strong">{post.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
