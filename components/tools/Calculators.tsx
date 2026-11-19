"use client";

import { useMemo, useState } from "react";
import { EXCHANGES } from "@/lib/content/stock";

const money = (n: number, digits = 0) =>
  Number.isFinite(n)
    ? `$${n.toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
    : "—";
const pct = (n: number, digits = 1) => (Number.isFinite(n) ? `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%` : "—");
const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

function Field({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  hint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
        {prefix && <span className="pl-3 text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          type={type}
          inputMode={type === "text" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[0.95rem] text-ink outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Result({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-bg-soft px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold ${tone === "good" ? "text-accent-strong" : tone === "bad" ? "text-[#d9634c]" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function Card({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <h2 id={`${id}-title`} className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fair value: a simple discounted cash flow model per share
// ---------------------------------------------------------------------------

export function FairValueCalculator() {
  const [fcf, setFcf] = useState("5.00");
  const [g1, setG1] = useState("10");
  const [g2, setG2] = useState("6");
  const [rate, setRate] = useState("10");
  const [multiple, setMultiple] = useState("15");
  const [price, setPrice] = useState("80");
  const [safety, setSafety] = useState("25");

  const r = useMemo(() => {
    const c0 = num(fcf);
    const a = num(g1) / 100;
    const b = num(g2) / 100;
    const d = num(rate) / 100;
    const m = num(multiple);
    if (![c0, a, b, d, m].every(Number.isFinite) || d <= -1) return null;
    let cash = c0;
    let present = 0;
    for (let year = 1; year <= 10; year++) {
      cash *= 1 + (year <= 5 ? a : b);
      present += cash / (1 + d) ** year;
    }
    const terminal = (cash * m) / (1 + d) ** 10;
    const value = present + terminal;
    const buyBelow = value * (1 - num(safety) / 100);
    const p = num(price);
    return { value, buyBelow, gap: Number.isFinite(p) && p > 0 ? (value / p - 1) * 100 : NaN, terminalShare: terminal / value };
  }, [fcf, g1, g2, rate, multiple, price, safety]);

  return (
    <Card
      id="fair-value"
      title="Fair value calculator"
      intro="Estimate what one share is worth from the cash the business should produce over the next ten years. Small changes to growth or the discount rate move the answer a lot, which is exactly why a margin of safety matters."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fv-fcf" label="Free cash flow per share today" prefix="$" value={fcf} onChange={setFcf} hint="Or earnings per share, if free cash flow is hard to find." />
          <Field id="fv-price" label="Current share price" prefix="$" value={price} onChange={setPrice} />
          <Field id="fv-g1" label="Growth, years 1 to 5" suffix="% a year" value={g1} onChange={setG1} />
          <Field id="fv-g2" label="Growth, years 6 to 10" suffix="% a year" value={g2} onChange={setG2} />
          <Field id="fv-rate" label="Discount rate" suffix="%" value={rate} onChange={setRate} hint="The yearly return you want. 8 to 12% is common." />
          <Field id="fv-multiple" label="Exit multiple after year 10" suffix="× cash flow" value={multiple} onChange={setMultiple} hint="What the market might pay for the business then." />
          <Field id="fv-safety" label="Margin of safety" suffix="%" value={safety} onChange={setSafety} hint="How far below fair value you want to buy." />
        </div>
        <div className="space-y-3" aria-live="polite">
          <Result label="Estimated fair value" value={r ? money(r.value, 2) : "—"} />
          <Result label="Buy below" value={r ? money(r.buyBelow, 2) : "—"} />
          <Result
            label="Compared with today's price"
            value={r && Number.isFinite(r.gap) ? `${pct(r.gap)} ${r.gap >= 0 ? "upside" : "downside"}` : "—"}
            tone={r && Number.isFinite(r.gap) ? (r.gap >= 0 ? "good" : "bad") : undefined}
          />
          {r && (
            <p className="text-xs leading-relaxed text-muted">
              {Math.round(r.terminalShare * 100)}% of this value comes from the exit multiple after year 10, so treat it as
              a rough guide, not a precise answer.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// What would $1,000 have become: real prices with dividends reinvested
// ---------------------------------------------------------------------------

type Series = { t: number; close: number }[];
type HistoryResult = { symbol: string; currency: string; stock: Series; market: { name: string; points: Series } | null };

function LineChart({ stock, market, amount }: { stock: Series; market: Series | null; amount: number }) {
  const W = 640;
  const H = 220;
  const t0 = stock[0].t;
  const t1 = stock.at(-1)!.t;
  const scale = (s: Series) => s.map((p) => ({ t: p.t, v: (amount * p.close) / s[0].close }));
  const a = scale(stock);
  const b = market ? scale(market) : [];
  const all = [...a, ...b].map((p) => p.v);
  const lo = Math.min(...all, amount) * 0.95;
  const hi = Math.max(...all, amount) * 1.05;
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = (s: { t: number; v: number }[]) => s.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Value of the investment over time">
      <line x1="0" x2={W} y1={y(amount)} y2={y(amount)} stroke="currentColor" className="text-line" strokeDasharray="4 6" />
      {b.length > 1 && <path d={path(b)} fill="none" stroke="currentColor" className="text-muted" strokeWidth="2" />}
      <path d={path(a)} fill="none" stroke="currentColor" className="text-accent" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function GrowthCalculator() {
  const [ticker, setTicker] = useState("MSFT");
  const [exchange, setExchange] = useState<string>("NASDAQ");
  const [from, setFrom] = useState("2016-01-01");
  const [amount, setAmount] = useState("1000");
  const [state, setState] = useState<{ loading: boolean; error?: string; data?: HistoryResult; amount?: number }>({ loading: false });

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const a = num(amount);
    if (!ticker.trim() || !from || !(a > 0)) {
      setState({ loading: false, error: "Fill in the ticker, the date and an amount." });
      return;
    }
    setState({ loading: true });
    try {
      const res = await fetch(`/api/history?ticker=${encodeURIComponent(ticker.trim())}&exchange=${exchange}&from=${from}`);
      const data = await res.json();
      if (!res.ok) setState({ loading: false, error: data.error ?? "Prices could not be loaded." });
      else setState({ loading: false, data, amount: a });
    } catch {
      setState({ loading: false, error: "Prices could not be loaded. Please try again." });
    }
  }

  const d = state.data;
  const summary = useMemo(() => {
    if (!d || !state.amount || d.stock.length < 2) return null;
    const first = d.stock[0];
    const last = d.stock.at(-1)!;
    const years = (last.t - first.t) / (365.25 * 86400_000);
    const value = (state.amount * last.close) / first.close;
    const m = d.market?.points;
    const marketValue = m && m.length > 1 ? (state.amount * m.at(-1)!.close) / m[0].close : NaN;
    return {
      value,
      total: (value / state.amount - 1) * 100,
      yearly: years > 0.9 ? ((value / state.amount) ** (1 / years) - 1) * 100 : NaN,
      marketValue,
      years,
      startDate: new Date(first.t).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
    };
  }, [d, state.amount]);

  return (
    <Card
      id="what-if"
      title="What would $1,000 have become?"
      intro="Pick a share and a start date to see what an investment would be worth today, with dividends reinvested, next to the same amount in the market index."
    >
      <form onSubmit={run} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field id="wi-ticker" label="Ticker" value={ticker} onChange={(v) => setTicker(v.toUpperCase())} />
        <div>
          <label htmlFor="wi-exchange" className="label">Exchange</label>
          <select id="wi-exchange" className="field" value={exchange} onChange={(e) => setExchange(e.target.value)}>
            {EXCHANGES.filter((x) => x !== "Other").map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>
        <Field id="wi-from" label="Invested on" type="date" value={from} onChange={setFrom} />
        <Field id="wi-amount" label="Amount" prefix="$" value={amount} onChange={setAmount} />
        <button type="submit" className="btn-primary h-[46px] px-6" disabled={state.loading}>
          {state.loading ? "Loading…" : "Show me"}
        </button>
      </form>

      <div aria-live="polite" className="mt-6">
        {state.error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-ink">{state.error}</p>}
        {d && summary && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-line bg-bg p-4">
              <LineChart stock={d.stock} market={d.market?.points ?? null} amount={state.amount!} />
              <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                <span><span className="mr-1 inline-block h-0.5 w-4 bg-accent align-middle" />{d.symbol}</span>
                {d.market && <span><span className="mr-1 inline-block h-0.5 w-4 bg-muted align-middle" />{d.market.name}</span>}
                <span>Prices in {d.currency}, from {summary.startDate}</span>
              </p>
            </div>
            <div className="space-y-3">
              <Result label="Worth today" value={money(summary.value)} tone={summary.total >= 0 ? "good" : "bad"} />
              <Result label="Total return" value={pct(summary.total, 0)} tone={summary.total >= 0 ? "good" : "bad"} />
              {Number.isFinite(summary.yearly) && <Result label="Per year" value={pct(summary.yearly)} />}
              {Number.isFinite(summary.marketValue) && (
                <Result label={`Same amount in the ${d.market!.name}`} value={money(summary.marketValue)} />
              )}
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">Prices from Yahoo Finance. Ignores tax, fees and exchange rates.</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dividend income
// ---------------------------------------------------------------------------

export function DividendCalculator() {
  const [start, setStart] = useState("10000");
  const [monthly, setMonthly] = useState("200");
  const [yieldPct, setYield] = useState("4");
  const [divGrowth, setDivGrowth] = useState("5");
  const [priceGrowth, setPriceGrowth] = useState("4");
  const [years, setYears] = useState("20");
  const [reinvest, setReinvest] = useState(true);

  const r = useMemo(() => {
    const s = num(start);
    const m = num(monthly);
    const y = num(yieldPct) / 100;
    const dg = num(divGrowth) / 100;
    const pg = num(priceGrowth) / 100;
    const n = Math.min(60, Math.max(1, Math.round(num(years))));
    if (![s, m, y, dg, pg].every(Number.isFinite) || !Number.isFinite(n)) return null;
    // Model a holding of units: the price grows each year, and so does the dividend paid per unit.
    let price = 1;
    let dividendPerUnit = y;
    let units = s;
    let paidOut = 0;
    const income: number[] = [];
    for (let year = 1; year <= n; year++) {
      units += (m * 12) / price;
      const paid = units * dividendPerUnit;
      income.push(paid);
      if (reinvest) units += paid / price;
      else paidOut += paid;
      price *= 1 + pg;
      dividendPerUnit *= 1 + dg;
    }
    const contributed = s + m * 12 * n;
    return { value: units * price, finalIncome: income.at(-1)!, totalIncome: income.reduce((a, b) => a + b, 0), paidOut, contributed, income, n };
  }, [start, monthly, yieldPct, divGrowth, priceGrowth, years, reinvest]);

  const max = r ? Math.max(...r.income) : 1;

  return (
    <Card
      id="dividends"
      title="Dividend income calculator"
      intro="See how a portfolio of dividend-paying shares could grow, and how much yearly income it might produce, when dividends rise over time and you keep adding to it."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="dv-start" label="Starting amount" prefix="$" value={start} onChange={setStart} />
            <Field id="dv-monthly" label="Added each month" prefix="$" value={monthly} onChange={setMonthly} />
            <Field id="dv-yield" label="Dividend yield" suffix="%" value={yieldPct} onChange={setYield} hint="The ASX 200 has averaged about 4%." />
            <Field id="dv-growth" label="Dividend growth" suffix="% a year" value={divGrowth} onChange={setDivGrowth} />
            <Field id="dv-price" label="Share price growth" suffix="% a year" value={priceGrowth} onChange={setPriceGrowth} />
            <Field id="dv-years" label="Years" value={years} onChange={setYears} />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} className="h-4 w-4 accent-[var(--accent-strong)]" />
            Reinvest dividends
          </label>
          {r && (
            <div className="mt-6" aria-hidden="true">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Dividend income each year</p>
              <div className="flex h-32 items-end gap-[2px]">
                {r.income.map((v, i) => (
                  <div key={i} className="flex-1 rounded-t bg-accent/80" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={`Year ${i + 1}: ${money(v)}`} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>Year 1</span>
                <span>Year {r.n}</span>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3" aria-live="polite">
          <Result label={`Income in year ${r?.n ?? ""}`} value={r ? `${money(r.finalIncome)} a year` : "—"} tone="good" />
          <Result label="Portfolio value" value={r ? money(r.value) : "—"} />
          <Result label="Total dividends received" value={r ? money(r.totalIncome) : "—"} />
          <Result label="You put in" value={r ? money(r.contributed) : "—"} />
          <p className="text-xs leading-relaxed text-muted">Ignores tax, franking credits, fees and inflation. Real returns vary from year to year.</p>
        </div>
      </div>
    </Card>
  );
}
