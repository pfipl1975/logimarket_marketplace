import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { accountLocale, accountPath } from "@/lib/auth/account-paths";
import { trustedAccountCallbackUrl } from "@/lib/auth/account-origin";
import { accountLandingPath } from "@/lib/buyer-account/paths";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const allowed = new Set(["code", "flow", "locale", "next", "sb_flow_id"]);
  const locale = accountLocale(params.get("locale"));
  const login = accountPath(locale, "login");
  const trusted = trustedAccountCallbackUrl({});
  const origin = trusted ? new URL(trusted).origin : null;
  const redirectResponse = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin ?? "https://www.logimarket.eu"), { status: 303 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  };
  const failure = () => redirectResponse(`${login}?authError=1`);
  const code = params.get("code");
  const flow = params.get("flow");
  if (!origin || !code || params.getAll("code").length !== 1 || code.length > 2048 ||
      (flow !== "signup" && flow !== "recovery") ||
      [...params.keys()].some((key) => !allowed.has(key) || params.getAll(key).length !== 1) ||
      (params.get("sb_flow_id")?.length ?? 0) > 256) {
    return failure();
  }
  const supabase = await createClient();
  if (!supabase) return failure();
  try {
    const flowId = params.get("sb_flow_id");
    const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) return failure();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return failure();
    if (flow === "recovery") {
      (await cookies()).set("lm-recovery-user", user.id, {
        httpOnly: true, secure: new URL(origin).protocol === "https:", sameSite: "lax", path: "/", maxAge: 15 * 60,
      });
    }
    const path = flow === "recovery" ? accountPath(locale, "reset-password") : accountLandingPath(params.get("next"), locale);
    return redirectResponse(path);
  } catch {
    return failure();
  }
}
