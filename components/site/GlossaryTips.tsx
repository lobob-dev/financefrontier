"use client";

import { useEffect } from "react";

/** Nudges a term's explanation sideways when it would spill off the edge of the screen. */
export function GlossaryTips() {
  useEffect(() => {
    const place = (e: Event) => {
      const term = (e.target as HTMLElement | null)?.closest?.(".term") as HTMLElement | null;
      if (!term) return;
      const tip = term.querySelector<HTMLElement>(".term-tip");
      if (!tip) return;
      term.style.setProperty("--tip-shift", "0px");
      const r = tip.getBoundingClientRect();
      const gutter = 12;
      let shift = 0;
      if (r.left < gutter) shift = gutter - r.left;
      else if (r.right > window.innerWidth - gutter) shift = window.innerWidth - gutter - r.right;
      term.style.setProperty("--tip-shift", `${Math.round(shift)}px`);
    };
    document.addEventListener("pointerover", place, { passive: true });
    document.addEventListener("focusin", place);
    return () => {
      document.removeEventListener("pointerover", place);
      document.removeEventListener("focusin", place);
    };
  }, []);
  return null;
}
