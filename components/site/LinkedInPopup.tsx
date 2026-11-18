"use client";

import { useCallback, useEffect, useState } from "react";
import { site } from "@/lib/site";
import { LinkedInIcon } from "./AuthorCard";

const KEY = "ff-linkedin-dismissed";
const QUIET_DAYS = 30;
const DELAY_MS = 6000;

/**
 * A small card inviting readers to connect on LinkedIn. It appears a few seconds
 * after the page opens, and once closed it stays away for a month on that device.
 */
export function LinkedInPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(KEY)) || 0;
    } catch {}
    if (Date.now() - dismissedAt < QUIET_DAYS * 86_400_000) return;
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Connect on LinkedIn"
      className="rise-in fixed inset-x-4 top-20 z-40 rounded-2xl border border-line bg-surface/95 p-4 shadow-lift backdrop-blur sm:left-auto sm:right-6 sm:w-80"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-bg-soft hover:text-ink"
      >
        <span aria-hidden="true" className="text-lg leading-none">×</span>
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0A66C2] text-white">
          <LinkedInIcon size={20} />
        </span>
        <div>
          <p className="font-semibold text-ink">Enjoying {site.name}?</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
            I&apos;m {site.author}. Connect with me on LinkedIn for new posts and stock ideas.
          </p>
        </div>
      </div>
      <a
        href={site.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onClick={close}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <LinkedInIcon size={15} /> Connect on LinkedIn
      </a>
    </div>
  );
}
