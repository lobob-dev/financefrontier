"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { LinkedInIcon } from "./AuthorCard";

/**
 * A LinkedIn button in the bottom-right corner of every public page.
 * On phones it slides away while you scroll down, so it never sits on top of what you are reading,
 * and comes back when you scroll up or stop.
 */
export function LinkedInBadge() {
  const [away, setAway] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (window.innerWidth < 640) setAway(y > last && y > 120);
      last = y;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAway(false), 1200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <a
      href={site.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${site.author} on LinkedIn`}
      className={`fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-[#0A66C2] p-3 text-sm font-semibold text-white shadow-lift transition duration-300 hover:-translate-y-0.5 hover:brightness-110 sm:bottom-6 sm:right-6 sm:py-2.5 sm:pl-3 sm:pr-4 ${
        away ? "pointer-events-none translate-y-24 opacity-0" : ""
      }`}
    >
      <LinkedInIcon size={18} />
      <span className="hidden sm:inline">LinkedIn</span>
    </a>
  );
}
