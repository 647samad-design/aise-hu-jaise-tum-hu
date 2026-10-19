import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE = ["/wallet", "/profile", "/tickets", "/admin", "/notifications"];
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

// Keeps the Supabase session cookie fresh on every request and guards private pages.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const redirectKeepingCookies = (to: URL) => {
    const r = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user && matches(path, PRIVATE)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectKeepingCookies(to);
  }

  if (user && matches(path, GUEST_ONLY)) {
    const to = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    to.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next.split("?")[0] : "/";
    to.search = "";
    return redirectKeepingCookies(to);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|icon.svg|offline.html|screenshots/|.well-known/|robots.txt|sitemap.xml|opengraph-image|twitter-image).*)"],
};
