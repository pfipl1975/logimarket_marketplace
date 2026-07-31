import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedIdentity = {
  id: string;
  email: string | null;
};

export type CurrentUserResult =
  | { status: "authenticated"; user: AuthenticatedIdentity }
  | { status: "unauthenticated"; user: null }
  | { status: "unavailable"; user: null };

export function classifySessionError(error: any): "unauthenticated" | "unavailable" {
  if (!error) return "unauthenticated";
  
  if (error.name === "AuthSessionMissingError") {
    return "unauthenticated";
  }
  
  // Other known Supabase auth errors that mean no valid session (like expired, invalid token)
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return "unauthenticated";
  }

  // Network errors, server errors (500), etc.
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
