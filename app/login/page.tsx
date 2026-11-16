import type { Metadata } from "next";
import { Suspense } from "react";
import { Wordmark } from "@/components/site/SiteHeader";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { LoginForm } from "@/components/admin/LoginForm";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="stage-bg flex min-h-[100svh] flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:pt-16">
        <div className="rise-in w-full max-w-md rounded-3xl border border-line bg-surface p-7 shadow-lift sm:p-9">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">This area is for the author of the blog only.</p>
          {supabaseConfigured ? (
            <Suspense>
              <LoginForm />
            </Suspense>
          ) : (
            <p className="mt-6 rounded-xl bg-accent-soft p-4 text-sm leading-relaxed text-ink">
              Supabase is not connected yet, so there is nothing to sign in to. Follow the setup steps in the README,
              then restart the site.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
