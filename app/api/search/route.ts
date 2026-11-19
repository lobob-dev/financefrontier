import type { NextRequest } from "next/server";
import { searchPosts } from "@/lib/posts";

/** Full-text search over every published post, used by the search box on /blog. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const hits = await searchPosts(q);
  return Response.json(
    { hits },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
}
