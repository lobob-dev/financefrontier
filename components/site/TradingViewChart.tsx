"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./useTheme";

type Props = {
  /** TradingView symbol, e.g. NASDAQ:MSFT or ASX:CBA */
  symbol: string;
  /** How far back the chart starts, e.g. 6M or 12M */
  range: string;
  label: string;
};

/**
 * A live TradingView chart. It only loads when scrolled near, so a page with
 * many charts stays quick, and it redraws when the site switches between light and dark.
 */
export function TradingViewChart({ symbol, range, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

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

  useEffect(() => {
    const el = box.current;
    if (!el || !visible) return;
    el.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      range,
      timezone: "Australia/Sydney",
      theme,
      style: "3",
      locale: "en",
      backgroundColor: theme === "dark" ? "rgba(24, 41, 51, 1)" : "rgba(255, 255, 255, 1)",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(22, 35, 45, 0.06)",
      hide_side_toolbar: true,
      hide_top_toolbar: true,
      hide_volume: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    el.append(widget, script);
  }, [visible, symbol, range, theme]);

  return (
    <div
      ref={box}
      className="tradingview-widget-container h-[340px] w-full overflow-hidden rounded-xl bg-bg-soft sm:h-[400px]"
      role="img"
      aria-label={`Live price chart for ${label}`}
    >
      <div className="grid h-full place-items-center text-sm text-muted">Loading the live chart…</div>
    </div>
  );
}
