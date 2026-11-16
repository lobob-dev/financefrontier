"use server";

import { redirect } from "next/navigation";
import { siteUrl, supabaseConfigured } from "@/lib/env";
import { isAdminEmail } from "@/lib/auth";
import { allowLoginAttempt } from "@/lib/rateLimit";
import { serverClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; message?: string; email?: string };

const TOO_MANY = "Too many attempts. Please wait fifteen minutes and try again.";
const WRONG = "That email and password did not work.";

function readEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : "";
}

/** Bots fill in every field, including the hidden "website" one that people never see. */
const isBot = (formData: FormData) => String(formData.get("website") ?? "") !== "";

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!supabaseConfigured) return { error: "Supabase is not connected yet. See the README." };
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (isBot(formData)) return { error: WRONG, email };
  if (!email || !password || password.length > 200) return { error: "Enter your email and password.", email };
  if (!(await allowLoginAttempt(email))) return { error: TOO_MANY, email };
  // Only the admin account may sign in at all. Everyone else gets the same answer as a wrong password.
  if (!isAdminEmail(email)) return { error: WRONG, email };

  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: WRONG, email };
  redirect("/admin");
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!supabaseConfigured) return { error: "Supabase is not connected yet. See the README." };
  const email = readEmail(formData);
  const sent = {
    message: "If that address belongs to the admin, a sign-in link is on its way. It works once and expires in an hour.",
    email,
  };
  if (isBot(formData)) return sent;
  if (!email) return { error: "Enter a valid email address.", email };
  if (!(await allowLoginAttempt(email))) return { error: TOO_MANY, email };
  if (!isAdminEmail(email)) return sent;

  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/confirm?next=/admin` },
  });
  if (error) {
    console.error("Magic link failed:", error.message);
    return { error: "The sign-in link could not be sent. Please try again in a minute.", email };
  }
  return sent;
}

export async function signOut() {
  if (supabaseConfigured) {
    const supabase = await serverClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
