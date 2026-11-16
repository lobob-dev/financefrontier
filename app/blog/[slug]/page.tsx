import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { getPostBySlug, getPublishedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/format";

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  // The page frame shows instantly; the article streams in behind a quiet placeholder.
  return (
    <div className="stage-bg flex min-h-[100svh] flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <Suspense fallback={<div className="h-[70svh]" aria-busy="true" />}>
          <Article params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Article({
  params,
}: {
  params: PageProps<"/blog/[slug]">["params"];
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="rise-in">
      <Link
        href="/"
        className="text-sm font-medium text-accent-strong hover:underline"
      >
        <span aria-hidden="true">←</span> Back to the book
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
        {formatDate(post.date)} · {post.readingMinutes} min read
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.12] tracking-tight sm:text-[3.25rem]">
        {post.title}
      </h1>
      <ul className="mt-5 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong"
          >
            {tag}
          </li>
        ))}
      </ul>
      <figure className="mt-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverImage}
          alt={post.coverAlt}
          className="aspect-[16/9] w-full rounded-2xl object-cover shadow-soft"
        />
      </figure>
      <div className="mt-10 space-y-6 text-[1.09rem] leading-[1.8] text-ink-soft">
        {post.content.map((block, i) =>
          block.type === "h2" ? (
            <h2
              key={i}
              className="pt-4 font-serif text-2xl font-semibold text-ink sm:text-[1.75rem]"
            >
              {block.text}
            </h2>
          ) : block.type === "quote" ? (
            <blockquote
              key={i}
              className="border-l-[3px] border-accent pl-5 font-serif text-xl italic leading-relaxed text-ink"
            >
              {block.text}
            </blockquote>
          ) : (
            <p key={i}>{block.text}</p>
          ),
        )}
      </div>
    </article>
  );
}
