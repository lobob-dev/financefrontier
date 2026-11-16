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
  /** Plain paragraphs for now. The admin editor stage replaces this with rich content. */
  content: { type: "p" | "h2" | "quote"; text: string }[];
};
