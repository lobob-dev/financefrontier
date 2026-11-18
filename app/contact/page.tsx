import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { site } from "@/lib/site";
import { LinkedInIcon } from "@/components/site/AuthorCard";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to get in touch with ${site.name}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell>
      <div className="rise-in">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Contact</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Get in touch</h1>
        <div className="prose-ff mt-8">
          <p>
            Questions, corrections and ideas for future posts are all welcome. Email is the best way to reach me, and
            I read everything, though I cannot promise to reply to every message.
          </p>
          <p>Please note that I cannot give personal investment advice.</p>
        </div>
        <a
          href={`mailto:${site.contactEmail}`}
          className="mt-10 flex w-fit items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent-strong" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m4 7 8 6 8-6" />
          </svg>
          <span>
            <span className="block text-sm text-muted">Email</span>
            <span className="font-medium text-ink">{site.contactEmail}</span>
          </span>
        </a>
        <a
          href={site.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-fit items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="text-[#0A66C2] dark:text-[#70b5f9]">
            <LinkedInIcon size={22} />
          </span>
          <span>
            <span className="block text-sm text-muted">LinkedIn</span>
            <span className="font-medium text-ink">{site.author}</span>
          </span>
        </a>
      </div>
    </PageShell>
  );
}
