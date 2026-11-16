import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/env";

/** A client for the admin editor in the browser, used to upload images as the signed-in admin. */
export function browserClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
