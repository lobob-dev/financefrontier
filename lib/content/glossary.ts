/**
 * Plain-English definitions for the finance terms that appear in posts.
 * The first time a post uses one of these words, it gets a dotted underline,
 * and hovering or tapping it shows the definition.
 *
 * To add a term: add an entry below. `match` lists the spellings to look for.
 * Short forms in capitals (like EPS) only match in capitals.
 */

export type Term = { id: string; match: string[]; definition: string };

export const glossary: Term[] = [
  { id: "pe", match: ["P/E", "price-to-earnings", "price to earnings"], definition: "Price-to-earnings ratio: the share price divided by a year's profit per share. A P/E of 20 means you pay $20 for every $1 the company earns." },
  { id: "forward-pe", match: ["forward P/E"], definition: "The P/E ratio worked out with next year's expected profit instead of last year's." },
  { id: "eps", match: ["EPS", "earnings per share"], definition: "Earnings per share: the company's profit divided by the number of shares." },
  { id: "fcf", match: ["free cash flow", "FCF"], definition: "Free cash flow: cash from running the business minus what it spends on equipment and buildings. It is the money left over for owners." },
  { id: "market-cap", match: ["market cap", "market capitalisation", "market capitalization"], definition: "Market capitalisation: the share price times the number of shares. It is what the whole company is worth on the stock market." },
  { id: "moat", match: ["moat", "economic moat"], definition: "A lasting advantage that keeps competitors away, such as a strong brand, a network or low costs." },
  { id: "roic", match: ["ROIC", "return on invested capital"], definition: "Return on invested capital: profit as a percentage of all the money put into the business by shareholders and lenders." },
  { id: "roe", match: ["ROE", "return on equity"], definition: "Return on equity: profit as a percentage of the shareholders' money in the business." },
  { id: "dividend-yield", match: ["dividend yield"], definition: "The yearly dividend divided by the share price. A 4% yield pays $4 a year for every $100 invested." },
  { id: "ebitda", match: ["EBITDA"], definition: "Earnings before interest, tax, depreciation and amortisation: a rough measure of operating profit before accounting and financing costs." },
  { id: "margin-of-safety", match: ["margin of safety"], definition: "Buying well below your estimate of a company's value, so you can still do well if some of your guesses are wrong." },
  { id: "intrinsic-value", match: ["intrinsic value", "fair value"], definition: "An estimate of what a business is really worth, based on the cash it should produce in future, whatever the share price says today." },
  { id: "buyback", match: ["buyback", "buybacks", "share buyback", "share buybacks"], definition: "When a company buys its own shares on the market, so each remaining share owns a bigger slice of the business." },
  { id: "dilution", match: ["dilution", "diluted"], definition: "When a company issues new shares, so each existing share owns a smaller slice of the business." },
  { id: "capex", match: ["capex", "CapEx", "capital expenditure"], definition: "Capital expenditure: money spent on long-lasting things such as data centres, factories and equipment." },
  { id: "small-cap", match: ["small cap", "small caps", "small-cap", "small-caps"], definition: "A company with a small market value, usually under about $2 billion. Often riskier, sometimes overlooked." },
  { id: "large-cap", match: ["large cap", "large caps", "large-cap", "large-caps", "blue chip", "blue-chip"], definition: "A large, established company, usually worth more than about $10 billion on the market." },
  { id: "gross-margin", match: ["gross margin", "gross margins"], definition: "Revenue minus the direct cost of making what was sold, as a percentage of revenue." },
  { id: "operating-margin", match: ["operating margin", "operating margins"], definition: "Profit from day-to-day operations as a percentage of revenue, before interest and tax." },
  { id: "net-margin", match: ["net margin", "net margins", "profit margin"], definition: "Final profit after every cost, interest and tax, as a percentage of revenue." },
  { id: "balance-sheet", match: ["balance sheet"], definition: "A snapshot of what a company owns (assets), what it owes (liabilities) and what is left for shareholders." },
  { id: "cash-flow-statement", match: ["cash flow statement"], definition: "The report showing the cash that actually came in and went out of a business over a period." },
  { id: "pb", match: ["P/B", "price-to-book"], definition: "Price-to-book ratio: the share price compared with the value of the company's net assets per share." },
  { id: "peg", match: ["PEG ratio", "PEG"], definition: "The P/E ratio divided by the expected yearly growth in profit. Around 1 is often seen as fair for a growing company." },
  { id: "debt-to-equity", match: ["debt-to-equity", "debt to equity"], definition: "Total debt divided by shareholders' equity. Higher numbers mean the company relies more on borrowed money." },
  { id: "ttm", match: ["TTM"], definition: "Trailing twelve months: the most recent twelve months of results." },
  { id: "yoy", match: ["YoY", "year-over-year", "year-on-year"], definition: "Year on year: compared with the same period a year earlier." },
  { id: "etf", match: ["ETF", "ETFs"], definition: "Exchange-traded fund: a fund that holds many shares at once and trades on the stock market like a single share." },
  { id: "index-fund", match: ["index fund", "index funds"], definition: "A fund that simply holds every company in an index, such as the ASX 200 or the S&P 500, at very low cost." },
  { id: "compounding", match: ["compounding", "compound interest"], definition: "Earning returns on your earlier returns, so growth speeds up the longer you stay invested." },
  { id: "volatility", match: ["volatility", "volatile"], definition: "How much and how quickly a share price moves up and down." },
  { id: "liquidity", match: ["liquidity"], definition: "How easily something can be turned into cash, or how easily a share can be bought and sold without moving its price." },
  { id: "bull-case", match: ["bull case"], definition: "The optimistic scenario: what happens if things go well." },
  { id: "bear-case", match: ["bear case"], definition: "The pessimistic scenario: what happens if things go badly." },
  { id: "asx", match: ["ASX"], definition: "The Australian Securities Exchange, where Australian companies' shares are traded." },
  { id: "sp500", match: ["S&P 500"], definition: "An index of about 500 of the largest companies listed in the United States." },
  { id: "impairment", match: ["impairment", "impairments", "write-down"], definition: "Cutting the value of an asset in the accounts because it is worth less than previously recorded. It lowers profit without any cash leaving the business." },
  { id: "premium", match: ["NAV premium", "premium to NAV"], definition: "When shares trade for more than the value of what the company actually holds." },
];

type Compiled = { regex: RegExp; byText: Map<string, Term> };
let compiled: Compiled | null = null;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** One regular expression for every spelling, longest first so "forward P/E" wins over "P/E". */
export function glossaryMatcher(): Compiled {
  if (compiled) return compiled;
  const byText = new Map<string, Term>();
  const parts: { text: string; caseSensitive: boolean }[] = [];
  for (const term of glossary) {
    for (const text of term.match) {
      const caseSensitive = /[A-Z]{2}/.test(text) || text.includes("/");
      byText.set(caseSensitive ? text : text.toLowerCase(), term);
      parts.push({ text, caseSensitive });
    }
  }
  parts.sort((a, b) => b.text.length - a.text.length);
  // Case-sensitive spellings are written exactly; the others accept either case for each letter.
  const pattern = parts
    .map(({ text, caseSensitive }) =>
      caseSensitive
        ? escapeRe(text)
        : [...text].map((c) => (/[a-z]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : escapeRe(c))).join(""),
    )
    .join("|");
  compiled = { regex: new RegExp(`(?<![A-Za-z0-9])(?:${pattern})(?![A-Za-z0-9])`, "g"), byText };
  return compiled;
}

export function lookupTerm(found: string): Term | undefined {
  const { byText } = glossaryMatcher();
  return byText.get(found) ?? byText.get(found.toLowerCase());
}
