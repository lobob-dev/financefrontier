import { ogCard, ogSize } from "@/lib/og/card";
import { getPostBySlug } from "@/lib/posts";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

export const alt = `A post on ${site.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return ogCard({
    title: post?.title ?? site.name,
    kicker: post ? `${formatDate(post.date)} · ${post.readingMinutes} min read` : site.tagline,
  });
}
