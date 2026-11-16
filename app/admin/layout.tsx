import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/site/SiteHeader";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent-strong">
              Admin
            </span>
          </div>
          <nav aria-label="Admin" className="flex items-center gap-1 sm:gap-2">
            <Link href="/admin" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-accent-soft hover:text-accent-strong sm:inline-flex">
              Posts
            </Link>
            <Link href="/" className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-accent-soft hover:text-accent-strong">
              View site
            </Link>
            <ThemeToggle />
            <form action={signOut}>
              <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-accent-soft hover:text-accent-strong">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <Suspense fallback={<div className="p-10 text-sm text-muted" aria-busy="true">Loading…</div>}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

/** Nothing inside the admin area renders until the admin account is confirmed. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <main className="flex-1">{children}</main>;
}
