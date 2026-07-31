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

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createClient();
  
  if (!supabase) {
    return { status: "unavailable", user: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
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
