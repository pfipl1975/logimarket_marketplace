import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function getExistingSessionHash(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session_hash")?.value ?? null;
}

export async function getOrCreateSessionHash(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("session_hash")?.value;
  if (existing) return existing;

  const hash = randomBytes(32).toString("hex");

  cookieStore.set("session_hash", hash, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });

  return hash;
}

/**
 * @deprecated Use getOrCreateSessionHash() for mutations or getExistingSessionHash() for reads.
 */
export async function getSessionHash(): Promise<string> {
  return getOrCreateSessionHash();
}
