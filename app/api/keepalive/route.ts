import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { publicClient } from "@/lib/supabase/public";
import { supabaseConfigured } from "@/lib/env";

/**
 * Called once a day by Vercel Cron (see vercel.json). A small database read stops
 * the free Supabase project from pausing after a quiet week, and the cache refresh
 * makes sure scheduled posts are never missed.
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (supabaseConfigured) {
    const { error } = await publicClient().from("posts").select("id", { head: true, count: "exact" }).limit(1);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  revalidateTag("posts", "max");
  return Response.json({ ok: true });
}
