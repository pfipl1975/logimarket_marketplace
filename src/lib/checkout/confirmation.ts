import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { computeLineMinorUnits, parseDecimalToMinorUnits } from "./money";

const TTL = 15 * 60 * 1000;
const MAX_TOKEN = 131072;
const id = z.number().int().positive().safe();
const amount = z.string().regex(/^[1-9]\d{0,49}$/);
const lineSchema = z.object({
  id, offerId: id, partnerId: id, quantity: z.number().int().min(1).max(999),
  unit: amount, sum: amount,
}).strict();
const snapshotSchema = z.object({
  v: z.literal(1), iat: z.number().int().nonnegative().safe(), exp: z.number().int().positive().safe(),
  nonce: z.string().uuid(), binding: z.string().regex(/^[a-f0-9]{64}$/),
  currency: z.literal("PLN"), lines: z.array(lineSchema).min(1).max(1000), total: amount,
}).strict();
export type ConfirmationLine = z.infer<typeof lineSchema>;
export type CheckoutConfirmation = z.infer<typeof snapshotSchema>;
export type ConfirmationContext = { authUserId: string; buyerOrganizationId: number; sessionHash: string };

/** Provision with 32 CSPRNG bytes encoded as 64 lowercase hex characters. Never log the value. */
function key(secret = process.env.CHECKOUT_CONFIRMATION_SECRET): Buffer {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || new Set(secret.match(/../g)).size < 16) {
    throw new Error("CHECKOUT_CONFIRMATION_CONFIGURATION_INVALID");
  }
  return Buffer.from(secret, "hex");
}
function binding(context: ConfirmationContext, secret: Buffer) {
  if (!context.authUserId || !context.sessionHash || !Number.isSafeInteger(context.buyerOrganizationId) || context.buyerOrganizationId < 1) {
    throw new Error("CHECKOUT_CONFIRMATION_CONTEXT_INVALID");
  }
  // The public token contains only a purpose-separated MAC, never an auth ID or raw session cookie.
  return createHmac("sha256", secret).update("checkout-context:v1:" + JSON.stringify([
    context.authUserId, context.buyerOrganizationId, context.sessionHash,
  ])).digest("hex");
}
export function confirmationLine(row: { id: number; offerId: number; partnerId: number; quantity: number; price: string | null }): ConfirmationLine {
  const unit = parseDecimalToMinorUnits(row.price);
  return lineSchema.parse({ id: row.id, offerId: row.offerId, partnerId: row.partnerId,
    quantity: row.quantity, unit: unit.toString(), sum: computeLineMinorUnits(unit, row.quantity).toString() });
}
export function canonicalLines(lines: ConfirmationLine[]): ConfirmationLine[] {
  const result = lines.map(line => lineSchema.parse(line)).sort((a, b) => a.id - b.id);
  if (!result.length || result.length > 1000 || new Set(result.map(line => line.id)).size !== result.length) throw new Error("CHECKOUT_CONFIRMATION_LINES_INVALID");
  for (const line of result) if (BigInt(line.sum) !== BigInt(line.unit) * BigInt(line.quantity)) throw new Error("CHECKOUT_CONFIRMATION_SUM_INVALID");
  return result;
}
function canonical(snapshot: CheckoutConfirmation) {
  return JSON.stringify({ v: snapshot.v, iat: snapshot.iat, exp: snapshot.exp, nonce: snapshot.nonce,
    binding: snapshot.binding, currency: snapshot.currency, lines: canonicalLines(snapshot.lines), total: snapshot.total });
}
export function issueCheckoutConfirmation(lines: ConfirmationLine[], context: ConfirmationContext, secret?: string, now = Date.now()): string {
  const secretKey = key(secret);
  const ordered = canonicalLines(lines);
  const snapshot = snapshotSchema.parse({ v: 1, iat: now, exp: now + TTL, nonce: randomUUID(),
    binding: binding(context, secretKey), currency: "PLN", lines: ordered,
    total: ordered.reduce((sum, line) => sum + BigInt(line.sum), BigInt(0)).toString() });
  const payload = Buffer.from(canonical(snapshot)).toString("base64url");
  const signature = createHmac("sha256", secretKey).update("checkout-confirmation:v1:" + payload).digest("base64url");
  const token = payload + "." + signature;
  if (token.length > MAX_TOKEN) throw new Error("CHECKOUT_CONFIRMATION_TOO_LARGE");
  return token;
}
export function verifyCheckoutConfirmation(token: unknown, context: ConfirmationContext, secret?: string, now = Date.now()): CheckoutConfirmation | null {
  const secretKey = key(secret); // Missing configuration fails closed, even for malformed input.
  try {
    if (typeof token !== "string" || token.length > MAX_TOKEN) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
    const bytes = Buffer.from(parts[0], "base64url");
    if (bytes.toString("base64url") !== parts[0]) return null;
    const snapshot = snapshotSchema.parse(JSON.parse(bytes.toString("utf8")));
    if (canonical(snapshot) !== bytes.toString("utf8")) return null;
    const supplied = Buffer.from(parts[1], "base64url");
    const expected = createHmac("sha256", secretKey).update("checkout-confirmation:v1:" + parts[0]).digest();
    if (supplied.length !== expected.length || supplied.toString("base64url") !== parts[1] || !timingSafeEqual(supplied, expected)) return null;
    if (snapshot.iat > now || snapshot.exp <= now || snapshot.exp - snapshot.iat !== TTL) return null;
    if (!timingSafeEqual(Buffer.from(snapshot.binding, "hex"), Buffer.from(binding(context, secretKey), "hex"))) return null;
    if (snapshot.total !== snapshot.lines.reduce((sum, line) => sum + BigInt(line.sum), BigInt(0)).toString()) return null;
    return snapshot;
  } catch { return null; }
}
export function matchesCheckoutConfirmation(snapshot: CheckoutConfirmation, lines: ConfirmationLine[]): boolean {
  return JSON.stringify(snapshot.lines) === JSON.stringify(canonicalLines(lines));
}
