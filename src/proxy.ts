import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/en/admin/:path*",
    "/en/partner/:path*",
    "/de/admin/:path*",
    "/de/partner/:path*",
    "/fr/admin/:path*",
    "/fr/partner/:path*",
    "/uk/admin/:path*",
    "/uk/partner/:path*",
    "/es/admin/:path*",
    "/es/partner/:path*",
    "/zh/admin/:path*",
    "/zh/partner/:path*",
  ],
};
