import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/:locale/admin/:path*",
    "/:locale/partner/:path*",
  ],
};
