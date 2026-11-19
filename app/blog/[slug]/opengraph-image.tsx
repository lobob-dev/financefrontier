import { ogCard, ogPickCard, ogSize } from "@/lib/og/card";
import { getPostBySlug } from "@/lib/posts";
import { getPickForPost } from "@/lib/picks";
import { VERDICTS } from "@/lib/content/stock";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

export const alt = `A post on ${site.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, pick] = await Promise.all([getPostBySlug(slug), getPickForPost(slug)]);
  if (post && pick) {
    const s = pick.snapshot;
    return ogPickCard({
      title: post.title.replace(/^[^:]+:\s*/, ""),
      company: s.company || s.ticker,
      listing: [s.exchange !== "Other" ? s.exchange : "", s.ticker].filter(Boolean).join(": "),
      verdict: s.verdict,
      verdictLabel: VERDICTS[s.verdict].label,
      change: pick.change,
      since: formatDate(post.date),
      vsMarket:
        pick.vsMarket === null
          ? null
          : `${pick.vsMarket >= 0 ? "+" : "−"}${Math.abs(pick.vsMarket).toFixed(1)} points vs the ${pick.benchmark.name}`,
    });
  }
  return ogCard({
    title: post?.title ?? site.name,
    kicker: post ? `${formatDate(post.date)} · ${post.readingMinutes} min read` : site.tagline,
  });
}
