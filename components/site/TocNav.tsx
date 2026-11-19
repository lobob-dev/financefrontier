"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/render";

/** The post's headings in the margin, with the section being read highlighted. */
export function TocNav({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      // the last heading that has passed a line a third of the way down the screen
      const line = window.innerHeight * 0.33;
      let current = els[0]?.id ?? "";
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  return (
    <nav aria-label="In this post" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">In this post</p>
      <ol className="space-y-1 border-l border-line">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={`-ml-px block border-l-2 py-1 leading-snug transition-colors ${h.level === 3 ? "pl-6" : "pl-3"} ${
                active === h.id ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
