import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { AuthorCard } from "@/components/site/AuthorCard";
import { getNeighbours, getPostBySlug, getPublishedPosts, getRelated, getSeries } from "@/lib/posts";
import { renderPost } from "@/lib/content/render";
import { getPickForPost } from "@/lib/picks";
import { chartRange, tradingViewSymbol } from "@/lib/content/stock";
import { TradingViewChart } from "@/components/site/TradingViewChart";
import { PostGrid } from "@/components/site/PostGrid";
import { ReadingProgress } from "@/components/site/ReadingProgress";
import { GlossaryTips } from "@/components/site/GlossaryTips";
import { formatDate, tagSlug } from "@/lib/format";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/env";

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.length ? posts.map((post) => ({ slug: post.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const description = post.seoDescription || post.excerpt;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      authors: [post.author ?? site.author],
    },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  // The page frame shows instantly; the article streams in behind a quiet placeholder.
  return (
    <PageShell>
      <Suspense fallback={<div className="h-[70svh]" aria-busy="true" />}>
        <Article params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Article({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const [{ newer, older }, series, related, pick] = await Promise.all([
    getNeighbours(slug),
    getSeries(post.series),
    getRelated(post),
    getPickForPost(slug),
  ]);
  const { html, headings } = renderPost(post.content);
  // A post with a company snapshot gets a live chart straight after the snapshot box.
  const chartSymbol = pick ? tradingViewSymbol(pick.snapshot) : null;
  const cardStart = html.indexOf('<aside class="stock-card"');
  const cardEnd = cardStart === -1 ? -1 : html.indexOf("</aside>", cardStart) + "</aside>".length;
  const [beforeChart, afterChart] = chartSymbol && cardEnd > 0 ? [html.slice(0, cardEnd), html.slice(cardEnd)] : [html, ""];
  const part = series.findIndex((p) => p.slug === post.slug) + 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.date,
    dateModified: post.updatedAt,
    keywords: post.tags.join(", "),
    url: `${siteUrl}/blog/${post.slug}`,
    image: new URL(post.coverImage, siteUrl).toString(),
    publisher: { "@type": "Organization", name: site.name },
    author: post.author ? { "@type": "Person", name: post.author } : { "@type": "Person", name: site.author, url: site.linkedin },
  };

  return (
    <article id="article" className="rise-in">
      <ReadingProgress target="#article" />
      <GlossaryTips />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link href="/" className="text-sm font-medium text-accent-strong hover:underline">
        <span aria-hidden="true">←</span> Back to the book
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
        {post.author ? `Guest post by ${post.author}` : `By ${site.author}`} · <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.12] tracking-tight sm:text-[3.25rem]">
        {post.title}
      </h1>
      {post.tags.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`/tags/${tagSlug(tag)}`}
                className="inline-block rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong hover:brightness-105"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <figure className="mt-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverImage}
          alt={post.coverAlt}
          width={1600}
          height={900}
          fetchPriority="high"
          className="aspect-[16/9] w-full rounded-2xl bg-bg-soft object-cover shadow-soft"
        />
      </figure>
      {series.length > 1 && (
        <p className="mt-8 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm text-ink">
          Part {part} of {series.length} in <strong>{post.series}</strong>.{" "}
          <a href="#series" className="font-semibold text-accent-strong hover:underline">See every part</a>
        </p>
      )}
      {headings.length >= 3 && (
        <details open className="group mt-8 rounded-2xl border border-line bg-surface/70 px-5 py-4">
          <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-[0.14em] text-accent-strong marker:text-accent">
            In this post
          </summary>
          <ol className="mt-3 space-y-1.5 text-[0.95rem]">
            {headings.map((h) => (
              <li key={h.id} className={h.level === 3 ? "pl-5" : ""}>
                <a href={`#${h.id}`} className="text-ink-soft hover:text-accent-strong">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="prose-ff mt-10" dangerouslySetInnerHTML={{ __html: beforeChart }} />
      {pick && chartSymbol && afterChart && (
        <figure className="mt-6">
          <TradingViewChart
            compact
            symbol={chartSymbol}
            range={chartRange(post.date, pick.quote ? new Date(pick.quote.asOf).getTime() : new Date(post.date).getTime() + 365 * 86_400_000)}
            label={pick.snapshot.company || pick.snapshot.ticker}
          />
          <figcaption className="mt-2 text-center text-xs text-muted">
            Live chart of {pick.snapshot.company || pick.snapshot.ticker} since before this post.{" "}
            <Link href="/track-record" className="font-medium text-accent-strong hover:underline">See every call on the track record</Link>
          </figcaption>
        </figure>
      )}
      {afterChart && <div className="prose-ff mt-6" dangerouslySetInnerHTML={{ __html: afterChart }} />}
      {series.length > 1 && (
        <nav id="series" aria-label={`The ${post.series} series`} className="mt-14 scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">Series</p>
          <p className="mt-1 font-serif text-xl font-semibold text-ink">{post.series}</p>
          <ol className="mt-3 space-y-2">
            {series.map((p, i) => (
              <li key={p.slug} className="flex gap-3 text-[0.95rem]">
                <span className="w-14 shrink-0 text-muted">Part {i + 1}</span>
                {p.slug === post.slug ? (
                  <span className="font-semibold text-ink" aria-current="page">{p.title} (this post)</span>
                ) : (
                  <Link href={`/blog/${p.slug}`} className="text-ink-soft hover:text-accent-strong">{p.title}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <AuthorCard guest={post.author} />
      <p className="mt-8 text-sm text-muted">{site.disclaimer}</p>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-14">
          <h2 id="related" className="font-serif text-2xl font-semibold text-ink">You might also like</h2>
          <div className="mt-6">
            <PostGrid posts={related} headingLevel={3} />
          </div>
        </section>
      )}

      {(newer || older) && (
        <nav aria-label="More posts" className="mt-10 grid gap-4 sm:grid-cols-2">
          {older ? (
            <Link href={`/blog/${older.slug}`} className="rounded-2xl border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Previous post</span>
              <span className="mt-1 block font-serif text-lg font-semibold text-ink">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link href={`/blog/${newer.slug}`} className="rounded-2xl border border-line bg-surface p-5 text-right shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Next post</span>
              <span className="mt-1 block font-serif text-lg font-semibold text-ink">{newer.title}</span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
