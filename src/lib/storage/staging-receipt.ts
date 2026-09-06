import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

export const STAGING_BUCKET = "offer-media-staging";
const TTL = 2 * 60 * 60 * 1000;
export function createStagingReceipt(offerId: number, actorId: string, secret: string, now = Date.now()) {
  const path = `offers/${offerId}/${randomUUID()}`;
  const payload = Buffer.from(JSON.stringify({ offerId, actorId, path, expires: now + TTL })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`offer-media-staging:${payload}`).digest("base64url");
  return { path, receipt: `${payload}.${signature}` };
}
export function verifyStagingReceipt(receipt: string, offerId: number, actorId: string, secret: string, now = Date.now(), cleanup = false): string {
  try {
    if (typeof receipt !== "string" || receipt.length > 2048) throw new Error();
    const parts = receipt.split(".");
    if (parts.length !== 2) throw new Error();
    const signature = createHmac("sha256", secret).update(`offer-media-staging:${parts[0]}`).digest();
    const supplied = Buffer.from(parts[1], "base64url");
    if (supplied.length !== signature.length || !timingSafeEqual(supplied, signature)) throw new Error();
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (data.offerId !== offerId || data.actorId !== actorId || !Number.isFinite(data.expires) || (!cleanup && now >= data.expires)) throw new Error();
    if (typeof data.path !== "string" || !new RegExp(`^offers/${offerId}/[0-9a-f-]{36}$`).test(data.path)) throw new Error();
    return data.path;
  } catch { throw new Error("STAGING_INVALID"); }
}
