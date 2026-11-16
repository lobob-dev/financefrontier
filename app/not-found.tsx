import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="rise-in py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Page not found</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">This page is not in the book</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          It may have moved, or the address may have a typo. The latest posts are all on the home page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary px-5 py-2.5">Open the book</Link>
          <Link href="/blog" className="btn-quiet px-5 py-2.5">All posts</Link>
        </div>
      </div>
    </PageShell>
  );
}
