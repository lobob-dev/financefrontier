"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./useTheme";
import { chartRange } from "@/lib/content/stock";

type Props = {
  /** TradingView symbol, e.g. NASDAQ:MSFT or ASX:CBA */
  symbol: string;
  /** The date of the call; the chart reaches back past it. */
  since: string;
  label: string;
  /** Smaller height for use inside a post. */
  compact?: boolean;
};

/** A box holding a TradingView widget. It loads once `enabled` is true and redraws when the theme changes. */
function Widget({ enabled, config, className, label }: { enabled: boolean; config: Record<string, unknown>; className: string; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const key = JSON.stringify(config);
  useEffect(() => {
    const el = box.current;
    if (!el || !enabled) return;
    el.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    const { since, ...rest } = JSON.parse(key) as { since?: string } & Record<string, unknown>;
    script.innerHTML = JSON.stringify({
      autosize: true,
      interval: "D",
      timezone: "Australia/Sydney",
      theme,
      style: "3",
      locale: "en",
      backgroundColor: theme === "dark" ? "rgba(24, 41, 51, 1)" : "rgba(255, 255, 255, 1)",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(22, 35, 45, 0.06)",
      hide_side_toolbar: true,
      hide_volume: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      ...rest,
      ...(since ? { range: chartRange(since) } : {}),
    });
    el.append(widget, script);
    return () => {
      el.innerHTML = "";
    };
  }, [enabled, key, theme]);
  return (
    <div ref={box} className={`tradingview-widget-container ${className}`} role={label ? "img" : undefined} aria-label={label}>
      <div className="grid h-full place-items-center text-sm text-muted">Loading the live chart…</div>
    </div>
  );
}

/**
 * A live TradingView chart. It only loads when scrolled near, so a page with
 * many charts stays quick. The Expand button opens a large version with more tools.
 */
export function TradingViewChart({ symbol, since, label, compact = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box}>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur transition hover:text-accent-strong"
          aria-label={`Expand the ${label} chart`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Expand
        </button>
      </div>
      <Widget
        enabled={visible}
        config={{ symbol, since, hide_top_toolbar: true }}
        label={`Live price chart for ${label}`}
        className={`w-full overflow-hidden rounded-xl bg-bg-soft ${compact ? "h-[300px] sm:h-[360px]" : "h-[340px] sm:h-[400px]"}`}
      />
      {expanded && <ExpandedChart symbol={symbol} since={since} label={label} onClose={() => setExpanded(false)} />}
    </div>
  );
}

function ExpandedChart({ symbol, since, label, onClose }: Omit<Props, "compact"> & { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} chart`}
      className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="font-serif text-lg font-semibold text-ink">
            {label} <span className="font-sans text-sm font-normal text-muted">{symbol}</span>
          </p>
          <button ref={closeRef} type="button" onClick={onClose} className="btn-quiet">
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <Widget enabled config={{ symbol, since, hide_top_toolbar: false }} className="min-h-0 flex-1" />
      </div>
    </div>,
    document.body,
  );
}
