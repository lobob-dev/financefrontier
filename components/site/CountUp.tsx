"use client";

import { useEffect, useRef } from "react";

/**
 * A number that counts up from zero the first time it scrolls into view.
 * The finished number is in the page from the start, for search engines and
 * for visitors who prefer less motion.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const text = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("counted");
      return;
    }
    let frame = 0;
    const run = () => {
      node.classList.add("counted");
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1100);
        const eased = 1 - (1 - t) ** 3;
        node.textContent = text(value * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    });
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, prefix, suffix]);

  return (
    <span ref={el} className="countup tabular-nums">
      {text(value)}
    </span>
  );
}
