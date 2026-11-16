import type { MetadataRoute } from "next";
import { getAllTags, getPublishedPostsWithContent } from "@/lib/posts";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([getPublishedPostsWithContent(), getAllTags()]);
  const latest = posts[0]?.updatedAt;
  return [
    { url: `${siteUrl}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
    ...posts.map((p) => ({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...tags.map((t) => ({ url: `${siteUrl}/tags/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
