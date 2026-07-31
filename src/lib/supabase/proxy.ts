import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./env";
import { getHomePath } from "@/lib/i18n/paths";
import { type Locale } from "@/lib/i18n/config";
import { isProtectedRoute, getLocaleFromPath } from "@/lib/auth/route-classification";

export async function updateSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  
  if (!config) {
    return handleUnconfiguredSupabase(request);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Proxy używa: supabase.auth.getUser() do odświeżenia ciasteczek
  // Zgodnie z oficjalną dokumentacją Next.js / Supabase to jedyny sposób na bezpieczne odświeżenie.
  // Zastępuje koncepcyjne `getClaims()`.
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = isProtectedRoute(request.nextUrl.pathname);
  if (isProtected && !user) {
    const locale = getLocaleFromPath(request.nextUrl.pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = locale === "pl" ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

function handleUnconfiguredSupabase(request: NextRequest) {
  const isProtected = isProtectedRoute(request.nextUrl.pathname);
  if (isProtected) {
    const locale = getLocaleFromPath(request.nextUrl.pathname);
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = getHomePath(locale as Locale);
    return NextResponse.redirect(homeUrl);
  }
  return NextResponse.next({ request });
}
