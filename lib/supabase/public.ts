import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * A client with no signed-in user, for reading published posts.
 * It never touches cookies, so its results can be cached and shared by every visitor.
 */
export function publicClient() {
  client ??= createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
