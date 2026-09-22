import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./env";
import { isProtectedRoute } from "@/lib/auth/route-classification";
import { buildLoginRedirectUrl } from "@/lib/auth/login-redirect";

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
    const loginUrl = buildLoginRedirectUrl(request.nextUrl);
    return createAuthRedirect(loginUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export function createAuthRedirect(url: URL, baseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  
  // Copy cookies
  baseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  
  // Copy specific cache headers
  const headersToCopy = ["Cache-Control", "Expires", "Pragma"];
  headersToCopy.forEach((h) => {
    const val = baseResponse.headers.get(h);
    if (val) redirect.headers.set(h, val);
  });
  
  return redirect;
}

function handleUnconfiguredSupabase(request: NextRequest) {
  const isProtected = isProtectedRoute(request.nextUrl.pathname);
  if (isProtected) {
    const loginUrl = buildLoginRedirectUrl(request.nextUrl);
    
    // Minimal redirect logic for unconfigured
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Cache-Control", "no-store, max-age=0");
    return redirect;
  }
  return NextResponse.next({ request });
}
