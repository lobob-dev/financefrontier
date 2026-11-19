import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2 text-ink sm:gap-2.5" aria-label={`${site.name} home`}>
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent-strong" aria-hidden="true">
        <path d="M4 21h24" />
        <path d="M10.5 21a5.5 5.5 0 0 1 11 0" />
        <path d="M16 11.5V9M9.3 14.3 7.5 12.5M22.7 14.3l1.8-1.8" />
      </svg>
      <span className="whitespace-nowrap font-serif text-base font-semibold tracking-tight sm:text-[1.15rem]">{site.name}</span>
    </Link>
  );
}

export function SiteHeader({ floating = false }: { floating?: boolean }) {
  return (
    <header
      className={
        floating
          ? "pointer-events-none fixed inset-x-0 top-0 z-30"
          : "sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur"
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <div className="pointer-events-auto">
          <Wordmark />
        </div>
        <nav className="pointer-events-auto flex items-center gap-0.5 whitespace-nowrap sm:gap-2" aria-label="Main">
          <Link href="/blog" className="rounded-full px-2.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong sm:px-3.5">
            <span className="sm:hidden">Posts</span>
            <span className="hidden sm:inline">All posts</span>
          </Link>
          <Link href="/track-record" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong md:inline-flex md:px-3.5">
            Track record
          </Link>
          <Link href="/tools" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong lg:inline-flex lg:px-3.5">
            Tools
          </Link>
          {/* on phones, About is in the footer and on the back of the book */}
          <Link href="/about" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong sm:inline-flex sm:px-3.5">
            About
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="ml-1 rounded-full border border-line bg-surface/70 px-3 py-2 sm:px-3.5 text-sm font-semibold text-ink shadow-soft backdrop-blur transition hover:border-accent hover:text-accent-strong"
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            © {site.name} · {site.credit}
          </span>
          <Link href="/about" className="hover:text-accent-strong">About</Link>
          <Link href="/track-record" className="hover:text-accent-strong">Track record</Link>
          <Link href="/tools" className="hover:text-accent-strong">Tools</Link>
          <Link href="/contact" className="hover:text-accent-strong">Contact</Link>
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-accent-strong">
            LinkedIn
          </a>
        </nav>
        <p>{site.disclaimer}</p>
      </div>
    </footer>
  );
}
