import type { DocNode } from "./content/doc";

export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date string */
  date: string;
  tags: string[];
  coverImage: string;
  coverAlt: string;
  readingMinutes: number;
};

export type Post = PostSummary & {
  /** The editor's JSON document. */
  content: DocNode;
  seoDescription: string;
  /** ISO date string */
  updatedAt: string;
  /** The series this post belongs to, if any. */
  series: string | null;
  /** A guest writer's name; null for the site's own author. */
  author: string | null;
};

export type PostStatus = "draft" | "published";

/** A row of the posts table as the admin area sees it. */
export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: DocNode;
  coverImageUrl: string | null;
  coverImageAlt: string;
  tags: string[];
  seoDescription: string;
  series: string | null;
  author: string | null;
  status: PostStatus;
  publishedAt: string | null;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
};
