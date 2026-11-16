import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: site.about,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell>
      <div className="rise-in">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">About</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          About {site.name}
        </h1>
        <div className="prose-ff mt-8">
          <p>{site.about}</p>
          <p>
            New posts appear first in the book on the home page, and every post is listed on the{" "}
            <Link href="/blog">all posts</Link> page, where you can search and browse by tag. You can also follow
            along with the <a href="/rss.xml">RSS feed</a>.
          </p>
          <blockquote>
            <p>{site.disclaimer}</p>
          </blockquote>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/contact" className="btn-primary px-5 py-2.5">Get in touch</Link>
          <Link href="/blog" className="btn-quiet px-5 py-2.5">Read the posts</Link>
        </div>
      </div>
    </PageShell>
  );
}
