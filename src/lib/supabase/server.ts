import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const config = getSupabasePublicConfig();

  if (!config) {
    // Return a dummy client or null depending on how we want to handle missing env.
    // The requirement states: "Brak env nie może blokować buildu publicznego katalogu."
    // and "Przy próbie użycia auth bez konfiguracji: login zwraca neutralny błąd dostępności".
    // We will return null and let callers handle it gracefully.
    return null;
  }

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
