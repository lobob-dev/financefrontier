import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";

/** Where the sign-in link in the email lands. It swaps the one-time code for a session. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next") ?? "/admin";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  const supabase = await serverClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) return fail("link");

  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return fail("denied");
  }
  return NextResponse.redirect(new URL(next, request.url));
}
