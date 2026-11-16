import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { PostGrid } from "@/components/site/PostGrid";
import { getAllTags, getPublishedPosts } from "@/lib/posts";
import { tagSlug } from "@/lib/format";

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.length ? tags.map((t) => ({ tag: t.slug })) : [{ tag: "__none__" }];
}

async function load(slug: string) {
  const tag = (await getAllTags()).find((t) => t.slug === slug);
  if (!tag) return null;
  const posts = (await getPublishedPosts()).filter((p) => p.tags.some((t) => tagSlug(t) === slug));
  return { tag, posts };
}

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const data = await load((await params).tag);
  if (!data) return {};
  return {
    title: `Posts tagged ${data.tag.tag}`,
    description: `${data.posts.length} ${data.posts.length === 1 ? "post" : "posts"} about ${data.tag.tag}.`,
    alternates: { canonical: `/tags/${data.tag.slug}` },
  };
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const data = await load((await params).tag);
  if (!data) notFound();
  return (
    <PageShell width="max-w-6xl">
      <Link href="/blog" className="text-sm font-medium text-accent-strong hover:underline">
        <span aria-hidden="true">←</span> All posts
      </Link>
      <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{data.tag.tag}</h1>
      <p className="mt-3 text-ink-soft">
        {data.posts.length} {data.posts.length === 1 ? "post" : "posts"}
      </p>
      <div className="mt-10">
        <PostGrid posts={data.posts} />
      </div>
    </PageShell>
  );
}
