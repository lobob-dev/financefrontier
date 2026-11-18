import { site } from "@/lib/site";

export function LinkedInIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.6 4.79 6v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
    </svg>
  );
}

/** "Written by Eeshan Karra", shown at the end of every post and on the About page. */
export function AuthorCard() {
  return (
    <aside
      aria-label="About the author"
      className="mt-14 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-lg font-semibold text-accent-strong"
        >
          EK
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Written by</p>
          <p className="font-serif text-lg font-semibold text-ink">{site.author}</p>
          <p className="text-sm text-ink-soft">Writer and designer of {site.name}</p>
        </div>
      </div>
      <a
        href={site.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-quiet self-start px-4 py-2 sm:self-auto"
      >
        <LinkedInIcon size={16} /> Connect on LinkedIn
      </a>
    </aside>
  );
}
