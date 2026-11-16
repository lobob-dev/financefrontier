import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseConfigured } from "./env";
import { serverClient } from "./supabase/server";

/**
 * Who may use the admin area. The database keeps its own list (the admins table),
 * and row level security checks that list on every write, so both have to agree.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "eeshankarra@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

export type Admin = { id: string; email: string };

/** The signed-in admin, or null. The session is checked with Supabase Auth, not just read from the cookie. */
export async function getAdmin(): Promise<Admin | null> {
  // Always checked per request, never prerendered or prefetched ahead of time.
  await connection();
  if (!supabaseConfigured) return null;
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isAdminEmail(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email!.toLowerCase() };
}

/** Use at the top of every admin page and admin action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}
