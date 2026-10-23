import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!env) {
    // Not configured: only public pages are reachable; /login explains what is missing.
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with Supabase; getSession() alone would trust the cookie.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.svg|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
