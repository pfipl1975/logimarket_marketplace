import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

const COOKIE_NAME = "logimarket_admin"

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET)
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex")
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(password, expected)
}

export async function createSession(): Promise<void> {
  const secret = getSecret()
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set")
  // Token payload: issued-at timestamp, signed with HMAC.
  const issued = String(Date.now())
  const token = `${issued}.${sign(issued, secret)}`
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const secret = getSecret()
  if (!secret) return false
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  const [issued, signature] = token.split(".")
  if (!issued || !signature) return false
  if (!safeEqual(signature, sign(issued, secret))) return false
  // Enforce 8 hour validity.
  const age = Date.now() - Number(issued)
  if (Number.isNaN(age) || age < 0 || age > 1000 * 60 * 60 * 8) return false
  return true
}
