import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/PageShell";
import { PostGrid } from "@/components/site/PostGrid";
import { BlogBrowser } from "@/components/site/BlogBrowser";
import { getAllTags, getPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "All posts",
  description: `Every post on ${site.name}, newest first. Search by topic or browse by tag.`,
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getAllTags()]);
  return (
    <PageShell width="max-w-6xl">
      <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">All posts</h1>
      <p className="mt-3 text-ink-soft">Every note, newest first.</p>
      {/* The full list is in the first paint for readers and search engines; the filters wake up after. */}
      <Suspense fallback={<div className="mt-[8.5rem]"><PostGrid posts={posts} /></div>}>
        <BlogBrowser posts={posts} tags={tags} />
      </Suspense>
    </PageShell>
  );
}
