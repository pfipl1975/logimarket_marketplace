import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAuthApiError } from "@supabase/supabase-js";

export type AuthenticatedIdentity = {
  id: string;
  email: string | null;
};

export type CurrentUserResult =
  | { status: "authenticated"; user: AuthenticatedIdentity }
  | { status: "unauthenticated"; user: null }
  | { status: "unavailable"; user: null };

export function classifySessionError(
  error: unknown
): "unauthenticated" | "unavailable" {
  if (!error) {
    return "unauthenticated";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AuthSessionMissingError"
  ) {
    return "unauthenticated";
  }

  if (isAuthApiError(error)) {
    const unauthenticatedCodes = new Set([
      "session_not_found",
      "session_expired",
      "refresh_token_not_found",
      "bad_jwt",
      "user_not_found",
    ]);

    if (error.code && unauthenticatedCodes.has(error.code)) {
      return "unauthenticated";
    }
  }

  return "unavailable";
}

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createClient();
  
  if (!supabase) {
    return { status: "unavailable", user: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    return { status: classifySessionError(error), user: null };
  }
  
  if (!user) {
    return { status: "unauthenticated", user: null };
  }

  return {
    status: "authenticated",
    user: {
      id: user.id,
      email: user.email || null,
    },
  };
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedIdentity> {
  const result = await getCurrentUser();
  if (result.status === "authenticated") {
    return result.user;
  }
  
  if (result.status === "unavailable") {
    throw new Error("Auth Infrastructure Unavailable");
  }
  
  throw new Error("Unauthorized");
}
