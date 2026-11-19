/** The company snapshot box that can sit at the top of a stock post. */

export const VERDICTS = {
  buy: { label: "Buy", note: "I would buy at today's price." },
  hold: { label: "Hold", note: "Worth keeping, not worth adding to." },
  watch: { label: "Watch", note: "Interesting, but not at this price." },
  avoid: { label: "Avoid", note: "I would stay away." },
} as const;

export type Verdict = keyof typeof VERDICTS;

export const EXCHANGES = ["NASDAQ", "NYSE", "ASX", "LSE", "TSX", "Other"] as const;
export type Exchange = (typeof EXCHANGES)[number];

export type Metric = { label: string; value: string };

export type StockSnapshot = {
  company: string;
  ticker: string;
  exchange: Exchange;
  verdict: Verdict;
  /** Share price when the post was written, as typed, e.g. "370.17". */
  price: string;
  currency: string;
  summary: string;
  metrics: Metric[];
};

export const emptySnapshot: StockSnapshot = {
  company: "",
  ticker: "",
  exchange: "NASDAQ",
  verdict: "watch",
  price: "",
  currency: "USD",
  summary: "",
  metrics: [
    { label: "Market cap", value: "" },
    { label: "P/E", value: "" },
    { label: "Dividend yield", value: "" },
  ],
};

/** Cleans whatever is stored in a post, so the page never trusts its shape. */
export function readSnapshot(attrs: Record<string, unknown> | undefined): StockSnapshot {
  const a = attrs ?? {};
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const exchange = EXCHANGES.includes(a.exchange as Exchange) ? (a.exchange as Exchange) : "Other";
  const verdict = (Object.keys(VERDICTS) as Verdict[]).includes(a.verdict as Verdict) ? (a.verdict as Verdict) : "watch";
  const metrics = Array.isArray(a.metrics)
    ? (a.metrics as unknown[])
        .slice(0, 6)
        .map((m) => ({ label: str((m as Metric)?.label, 40), value: str((m as Metric)?.value, 40) }))
    : [];
  return {
    company: str(a.company, 80),
    ticker: str(a.ticker, 12).toUpperCase(),
    exchange,
    verdict,
    price: str(a.price, 20),
    currency: str(a.currency, 3).toUpperCase() || "USD",
    summary: str(a.summary, 280),
    metrics,
  };
}

/** The symbol Yahoo Finance uses, e.g. BRK.B on NYSE is BRK-B and UOS on the ASX is UOS.AX. */
export function quoteSymbol(s: Pick<StockSnapshot, "ticker" | "exchange">) {
  const t = s.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(t)) return null;
  switch (s.exchange) {
    case "ASX":
      return `${t}.AX`;
    case "LSE":
      return `${t}.L`;
    case "TSX":
      return `${t}.TO`;
    case "Other":
      return t;
    default:
      return t.replace(/\./g, "-");
  }
}

export function parsePrice(price: string) {
  const n = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const SYMBOLS: Record<string, string> = { USD: "US$", AUD: "A$", GBP: "£", EUR: "€", CAD: "C$", GBX: "" };

export function formatMoney(value: number | null, currency: string) {
  if (value === null) return "—";
  if (currency === "GBX" || currency === "GBp") return `${value.toFixed(1)}p`;
  const digits = value < 1 ? 3 : 2;
  return `${SYMBOLS[currency] ?? `${currency} `}${value.toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function hasSnapshotContent(s: StockSnapshot) {
  return !!(s.company || s.ticker);
}

/** The symbol TradingView uses, e.g. NASDAQ:MSFT, NYSE:BRK.B or ASX:CBA. */
export function tradingViewSymbol(s: Pick<StockSnapshot, "ticker" | "exchange">) {
  const t = s.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(t)) return null;
  return s.exchange === "Other" ? t : `${s.exchange}:${t}`;
}

/** A chart range that reaches back past the date of the call. Worked out in the browser, where the clock is live. */
export function chartRange(sinceIso: string, now = Date.now()) {
  const days = (now - new Date(sinceIso).getTime()) / 86_400_000;
  if (days <= 85) return "3M";
  if (days <= 175) return "6M";
  if (days <= 360) return "12M";
  return "60M";
}
