import type { Post } from "./types";
import { d, readingMinutes } from "./content/doc";

/**
 * Three sample posts. They are shown when Supabase is not connected yet,
 * and the same posts are loaded into the database by supabase/seed.sql.
 */
const posts: Post[] = [
  {
    slug: "how-i-screen-for-quality-compounders",
    title: "How I Screen for Quality Compounders",
    excerpt:
      "A good stock screen does not find winners for you. It removes the businesses you should never spend an evening on. Here are the five filters I run before I read a single annual report.",
    date: "2026-11-09",
    tags: ["Stock Picking", "Fundamentals"],
    coverImage: "/covers/compounders.svg",
    coverAlt: "A rising line chart over a soft mint background with a pale sun",
    readingMinutes: 7,
    content: d.doc(
      d.p("This is a sample post so you can see how the book and the reading view feel. Replace it with your own writing from the admin area."),
      d.p("A good stock screen does not find winners for you. It removes the businesses you should never spend an evening on. Most of the market is made up of companies that earn less than their cost of capital, and no amount of clever valuation work turns those into great investments."),
      d.h2("The five filters"),
      d.p("First, return on invested capital above fifteen percent for at least seven of the last ten years. One good year proves nothing. A decade of good years suggests something structural is protecting the business."),
      d.p("Second, revenue that has grown without the share count growing alongside it. Growth that is paid for by issuing new shares belongs to somebody else."),
      d.quote("The screen is a sieve, not a compass. It tells you where not to dig."),
      d.p("Third, debt that could be repaid from three years of free cash flow. Fourth, gross margins that have been stable or rising. Fifth, a business I could explain to a friend in two sentences."),
      d.h2("What happens next"),
      d.p("From several thousand listed companies this usually leaves a few dozen. Those are the ones that earn a slow read of the annual report, and that is where the real work begins."),
    ),
    seoDescription: "",
    series: null,
    author: null,
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
  {
    slug: "reading-a-cash-flow-statement-in-ten-minutes",
    title: "Reading a Cash Flow Statement in Ten Minutes",
    excerpt:
      "Profit is an opinion, cash is a fact. The cash flow statement is the shortest route to seeing whether a company's reported earnings turn into money you could actually spend.",
    date: "2026-10-27",
    tags: ["Analysis", "Beginners"],
    coverImage: "/covers/cash-flow.svg",
    coverAlt: "Blue bars rising from left to right with two flowing lines above them",
    readingMinutes: 6,
    content: d.doc(
      d.p("This is a sample post. It shows how a mid-length article with headings and a quote looks in the reading view."),
      d.p("Profit is an opinion, cash is a fact. The income statement is full of estimates: how long a machine will last, how many customers will pay late, what a brand is worth. The cash flow statement simply records what came in and what went out."),
      d.h2("Start at the bottom of the first section"),
      d.p("Cash from operations is the number to find first. Compare it with net income over five years. If profits keep rising while operating cash stays flat, something is being booked as earned before it has been collected."),
      d.h2("Then subtract what it costs to stand still"),
      d.p("Capital expenditure sits in the investing section. Operating cash minus capital expenditure gives free cash flow, which is the money left for dividends, buybacks, debt repayment and acquisitions."),
      { type: "codeBlock", attrs: { language: "python" }, content: [{ type: "text", text: "def free_cash_flow(operating_cash, capital_expenditure):\n    return operating_cash - capital_expenditure\n\n# figures in millions\nmargin = free_cash_flow(1200, 300) / 4800  # 0.1875, or about 19%" }] },
      d.quote("If a business needs all of its cash just to stay where it is, the owners are working for the machines."),
      d.p("Finally, read the financing section to see where that free cash goes. The pattern over several years tells you more about management than any letter to shareholders."),
    ),
    seoDescription: "",
    series: null,
    author: null,
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
  {
    slug: "margin-of-safety-why-price-still-matters",
    title: "Margin of Safety: Why Price Still Matters",
    excerpt:
      "A wonderful business bought at the wrong price can still be a poor investment. Margin of safety is the simple habit of leaving room for your own mistakes.",
    date: "2026-10-12",
    tags: ["Valuation", "Risk"],
    coverImage: "/covers/margin-of-safety.svg",
    coverAlt: "Two lines on a warm background with a shaded gap between value and price",
    readingMinutes: 5,
    content: d.doc(
      d.p("This is a sample post. Your own posts will appear here automatically, newest first, as soon as you publish them."),
      d.p("A wonderful business bought at the wrong price can still be a poor investment. The quality of the company and the quality of the purchase are two separate questions, and it is easy to answer the first and forget the second."),
      d.h2("Room for error"),
      d.p("Every valuation rests on guesses about the future. Margin of safety means paying noticeably less than your estimate of value, so that the investment can still work out if some of those guesses are wrong."),
      d.quote("You do not need to know a man's exact weight to know that he is heavy."),
      d.p("How wide the margin should be depends on how predictable the business is. A steady consumer brand might deserve a smaller discount than a cyclical manufacturer whose profits swing with the economy."),
    ),
    seoDescription: "",
    series: null,
    author: null,
    updatedAt: "2026-11-16T00:00:00.000Z",
  },
];

export const samplePosts: Post[] = posts.map((p) => ({ ...p, readingMinutes: readingMinutes(p.content) }));
