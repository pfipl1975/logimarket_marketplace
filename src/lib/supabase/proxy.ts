import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./env";
import { isProtectedRoute, getLocaleFromPath } from "@/lib/auth/route-classification";
import { getSafeRedirectUrl } from "@/lib/auth/safe-redirect";

export async function updateSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  
  if (!config) {
    return handleUnconfiguredSupabase(request);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value as string);
          });
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  const isProtected = isProtectedRoute(request.nextUrl.pathname);
  if (isProtected && !claims) {
    const locale = getLocaleFromPath(request.nextUrl.pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = locale === "pl" ? "/login" : `/${locale}/login`;
    loginUrl.searchParams.set("next", encodeURIComponent(getSafeRedirectUrl(request.nextUrl.pathname, locale)));
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

function handleUnconfiguredSupabase(request: NextRequest) {
  const isProtected = isProtectedRoute(request.nextUrl.pathname);
  if (isProtected) {
    const locale = getLocaleFromPath(request.nextUrl.pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = locale === "pl" ? "/login" : `/${locale}/login`;
    loginUrl.searchParams.set("next", encodeURIComponent(getSafeRedirectUrl(request.nextUrl.pathname, locale)));
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next({ request });
}
