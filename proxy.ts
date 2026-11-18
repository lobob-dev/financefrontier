import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before admin and login pages. It refreshes the Supabase session cookie
 * and sends anyone who is not signed in from /admin to /login. The admin pages
 * still check the account themselves, and the database checks it again.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  if (!url || !key) {
    return isAdminPath ? NextResponse.redirect(new URL("/login", request.url)) : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (request.nextUrl.pathname === "/login" && data?.claims) {
    const toAdmin = NextResponse.redirect(new URL("/admin", request.url));
    for (const cookie of response.cookies.getAll()) toAdmin.cookies.set(cookie);
    return toAdmin;
  }
  if (isAdminPath && !data?.claims) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/auth/:path*"],
};
