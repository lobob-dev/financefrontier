import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { AuthorCard } from "@/components/site/AuthorCard";
import { getNeighbours, getPostBySlug, getPublishedPosts } from "@/lib/posts";
import { renderDoc } from "@/lib/content/render";
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
      authors: [site.author],
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
  const { newer, older } = await getNeighbours(slug);
  const html = renderDoc(post.content);

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
    author: { "@type": "Person", name: site.author, url: site.linkedin },
  };

  return (
    <article className="rise-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link href="/" className="text-sm font-medium text-accent-strong hover:underline">
        <span aria-hidden="true">←</span> Back to the book
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
        By {site.author} · <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} min read
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
      <div className="prose-ff mt-10" dangerouslySetInnerHTML={{ __html: html }} />

      <AuthorCard />
      <p className="mt-8 text-sm text-muted">{site.disclaimer}</p>

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
