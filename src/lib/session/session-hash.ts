import { cookies } from "next/headers";

export async function getSessionHash(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("session_hash")?.value;
  if (existing) return existing;
  const { randomBytes } = require("crypto");
  const hash = randomBytes(32).toString("hex");
  cookieStore.set("session_hash", hash, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return hash;
}
