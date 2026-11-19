import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { getPicks, type Pick } from "@/lib/picks";
import { VERDICTS, formatMoney, tradingViewSymbol, type Verdict } from "@/lib/content/stock";
import { TradingViewChart } from "@/components/site/TradingViewChart";
import { CountUp } from "@/components/site/CountUp";
import { Sparkline } from "@/components/site/Sparkline";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track record",
  description: `Every company ${site.author} has written about on ${site.name}, and how its share price has moved since.`,
  alternates: { canonical: "/track-record" },
};

const verdictStyle: Record<Verdict, string> = {
  buy: "bg-[#12a77c] text-white",
  hold: "bg-[#2f86c5] text-white",
  watch: "bg-[#e9b949] text-[#2b2205]",
  avoid: "bg-[#d9634c] text-white",
};

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const up = value >= 0;
  return (
    <span className={`whitespace-nowrap font-semibold ${up ? "text-accent-strong" : "text-[#d9634c]"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/** Points ahead of or behind the market, marked right or wrong for the verdict given. */
function VsMarket({ pick, inline = false }: { pick: Pick; inline?: boolean }) {
  if (pick.vsMarket === null) return <span className="text-muted">—</span>;
  const v = pick.vsMarket;
  if (inline) {
    return (
      <span className="text-ink-soft">
        <span className={`font-semibold ${pick.ahead ? "text-accent-strong" : "text-[#d9634c]"}`}>
          {v >= 0 ? "+" : "−"}
          {Math.abs(v).toFixed(1)} pts
        </span>{" "}
        vs {pick.benchmark.name} · {pick.ahead ? "right call" : "wrong call"}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap">
      <span className={`font-semibold ${pick.ahead ? "text-accent-strong" : "text-[#d9634c]"}`}>
        {v >= 0 ? "+" : "−"}
        {Math.abs(v).toFixed(1)} pts
      </span>
      <span className="block text-xs text-muted">
        {pick.benchmark.name} {pick.benchmark.change !== null && `${pick.benchmark.change >= 0 ? "+" : "−"}${Math.abs(pick.benchmark.change).toFixed(1)}%`} ·{" "}
        {pick.ahead ? "right call" : "wrong call"}
      </span>
    </span>
  );
}

const chartId = (p: Pick) => `chart-${p.post.slug}-${p.snapshot.ticker}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default async function TrackRecordPage() {
  const picks = await getPicks();
  const priced = picks.filter((p): p is Pick & { change: number } => p.change !== null);
  const buys = priced.filter((p) => p.snapshot.verdict === "buy");
  const judged = picks.filter((p) => p.ahead !== null);
  const ahead = judged.filter((p) => p.ahead).length;
  const buyAverage = buys.length ? average(buys.map((p) => p.change)) : null;
  const asOf = picks.map((p) => p.quote?.asOf).filter(Boolean).sort().at(-1);

  return (
    <PageShell width="max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Accountability</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Track record</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Every company I have given a verdict on, the share price when I wrote about it, and where it is now. The good
        calls and the bad ones stay up.
      </p>

      {picks.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
          No picks yet. They appear here as soon as a post with a company snapshot is published.
        </p>
      ) : (
        <>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Companies covered</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink"><CountUp value={picks.length} /></dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Average move of Buy calls</dt>
              <dd className={`mt-1 text-2xl font-semibold ${(buyAverage ?? 0) >= 0 ? "text-accent-strong" : "text-[#d9634c]"}`}>
                {buyAverage === null ? "—" : <CountUp value={buyAverage} decimals={1} prefix={buyAverage >= 0 ? "▲ " : "▼ −"} suffix="%" />}
              </dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Calls ahead of the market</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink">
                {judged.length ? (
                  <>
                    <CountUp value={ahead} /> <span className="text-base font-medium text-muted">of {judged.length}</span>
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          {/* phones and tablets: one card per call */}
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:hidden">
            {picks.map((p, i) => (
              <li key={`${p.post.slug}-${p.snapshot.ticker}`} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{p.snapshot.company || p.snapshot.ticker}</p>
                    <p className="text-xs text-muted">
                      {[p.snapshot.exchange !== "Other" ? p.snapshot.exchange : "", p.snapshot.ticker].filter(Boolean).join(": ")} · {formatDate(p.post.date)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${verdictStyle[p.snapshot.verdict]}`}>
                    {VERDICTS[p.snapshot.verdict].label}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-sm tabular-nums text-ink-soft">
                    <p>
                      {formatMoney(p.priceThen, p.snapshot.currency)} <span aria-hidden="true">→</span>{" "}
                      {p.quote ? formatMoney(p.quote.price, p.quote.currency) : "—"}
                    </p>
                    <p className="mt-0.5 text-base"><Change value={p.change} /></p>
                  </div>
                  <Sparkline values={p.trend} up={(p.change ?? 0) >= 0} delay={i * 70} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <VsMarket pick={p} inline />
                  <span className="flex shrink-0 gap-3">
                    <Link href={`/blog/${p.post.slug}`} className="font-medium text-accent-strong hover:underline">Post</Link>
                    {tradingViewSymbol(p.snapshot) && (
                      <a href={`#${chartId(p)}`} className="font-medium text-accent-strong hover:underline">Chart ↓</a>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft xl:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">Every pick with its price then and now</caption>
              <thead className="bg-bg-soft text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Company</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verdict</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Written</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Price then</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Price now</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Price since the call</span></th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Since</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Vs market</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">Chart</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {picks.map((p, i) => (
                  <tr key={`${p.post.slug}-${p.snapshot.ticker}`}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{p.snapshot.company || p.snapshot.ticker}</span>
                      <span className="text-xs text-muted">
                        {[p.snapshot.exchange !== "Other" ? p.snapshot.exchange : "", p.snapshot.ticker].filter(Boolean).join(": ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${verdictStyle[p.snapshot.verdict]}`}>
                        {VERDICTS[p.snapshot.verdict].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/blog/${p.post.slug}`} className="line-clamp-2 font-medium text-ink-soft hover:text-accent-strong">
                        {p.post.title}
                      </Link>
                      <span className="text-xs text-muted">{formatDate(p.post.date)}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.priceThen, p.snapshot.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.quote ? formatMoney(p.quote.price, p.quote.currency) : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <Sparkline values={p.trend} up={(p.change ?? 0) >= 0} delay={i * 70} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Change value={p.change} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <VsMarket pick={p} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tradingViewSymbol(p.snapshot) && (
                        <a href={`#${chartId(p)}`} className="whitespace-nowrap text-xs font-semibold text-accent-strong hover:underline">
                          Chart <span aria-hidden="true">↓</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section aria-labelledby="charts" className="mt-16">
            <h2 id="charts" className="font-serif text-3xl font-semibold tracking-tight">Live charts</h2>
            <p className="mt-2 text-ink-soft">
              Each chart reaches back past the date of the call, so you can see the move since. Drag or scroll inside a chart to explore. Charts by TradingView; US prices can be up to 15 minutes delayed.
            </p>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {picks.map((p) => {
                const symbol = tradingViewSymbol(p.snapshot);
                if (!symbol) return null;
                const name = p.snapshot.company || p.snapshot.ticker;
                return (
                  <article
                    key={chartId(p)}
                    id={chartId(p)}
                    className="scroll-mt-24 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl font-semibold text-ink">{name}</h3>
                        <p className="text-xs text-muted">{symbol}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${verdictStyle[p.snapshot.verdict]}`}>
                          {VERDICTS[p.snapshot.verdict].label}
                        </span>
                        <p className="mt-1 text-sm"><Change value={p.change} /></p>
                        {p.vsMarket !== null && (
                          <p className="text-xs text-muted">
                            {p.vsMarket >= 0 ? "+" : "−"}
                            {Math.abs(p.vsMarket).toFixed(1)} pts vs {p.benchmark.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      Called on {formatDate(p.post.date)} at {formatMoney(p.priceThen, p.snapshot.currency)}
                      {p.quote ? `, now ${formatMoney(p.quote.price, p.quote.currency)}` : ""}.{" "}
                      <Link href={`/blog/${p.post.slug}`} className="font-medium text-accent-strong hover:underline">Read the post</Link>
                    </p>
                    <div className="mt-4">
                      <TradingViewChart
                        symbol={symbol}
                        since={p.post.date}
                        label={name}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            Current prices come from Yahoo Finance and are refreshed every few hours{asOf ? `, last on ${formatDate(asOf)}` : ""}. Moves
            are share price only and leave out dividends. Each call is compared with the S&P 500 (or the ASX 200 for
            Australian shares) over the same period: a Buy or Hold call is right when the share beats the market, and a
            Watch or Avoid call is right when it falls behind. {site.disclaimer} Past performance is no guide to the future.
          </p>
        </>
      )}
    </PageShell>
  );
}
