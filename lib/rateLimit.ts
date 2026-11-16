import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { publicClient } from "./supabase/public";

function secret() {
  const s = process.env.RATE_LIMIT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SECRET is not set. Add it to the environment variables (see .env.example).");
  }
  return "development-only-rate-limit-secret";
}

const hash = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

/**
 * Records a login attempt and says whether it may go ahead.
 * Ten attempts per fifteen minutes from one network address, and ten for one email address.
 */
export async function allowLoginAttempt(email: string) {
  const keys = [`ip:${hash(await clientIp())}`, `email:${hash(email.trim().toLowerCase())}`];
  const { data, error } = await publicClient().rpc("register_login_attempt", { p_keys: keys });
  if (error) {
    console.error("Login rate limit check failed:", error.message);
    return false;
  }
  return data === true;
}
