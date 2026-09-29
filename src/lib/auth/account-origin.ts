import { siteOrigin } from "@/lib/seo/urls";

/** Only deployment configuration may supply email redirect origins. */
export function trustedAccountCallbackUrl(params: Record<string, string>): string | null {
  try {
    const origin = new URL(siteOrigin);
    if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") return null;
    if (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "localhost")) return null;
    const callback = new URL("/auth/callback", origin);
    for (const [key, value] of Object.entries(params)) callback.searchParams.set(key, value);
    return callback.toString();
  } catch {
    return null;
  }
}
