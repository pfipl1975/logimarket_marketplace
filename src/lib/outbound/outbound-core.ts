import { createHmac } from "crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export function isPgInt4(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1 && value <= 2147483647;
}

export function parseOutboundOfferId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  if (String(value) !== raw) return null;
  return value;
}

export function parseOutboundDestination(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractClientIp(headers: Headers): string | null {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const ip = vercel.split(",")[0].trim();
    if (ip) return ip.toLowerCase();
  }
  
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip.toLowerCase();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const ip = realIp.trim();
    if (ip) return ip.toLowerCase();
  }
  
  return null;
}

export function isValidOutboundTrackingSecret(
  secret: string | undefined
): secret is string {
  return (
    typeof secret === "string" &&
    secret.length >= 32 &&
    secret.trim().length > 0
  );
}

export function hashClientIp(ip: string | null, secret: string): string {
  if (!isValidOutboundTrackingSecret(secret)) {
    throw new Error("INVALID_TRACKING_SECRET");
  }
  const normalized = ip || "unknown";
  const message = `logimarket-outbound-ip:v1:${normalized}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

export async function recordOutboundClick(
  db: NodePgDatabase<typeof schema>,
  offerId: number,
  partnerId: number,
  sessionHash: string,
  ipHash: string
): Promise<void> {
  if (!isPgInt4(offerId) || !isPgInt4(partnerId)) {
    console.error("[outbound] stage=tracking result=schema_limit");
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO clicks (
        offer_id,
        partner_id,
        clicked_at,
        session_hash,
        ip_hash,
        is_unique_24h
      )
      SELECT
        ${offerId},
        ${partnerId},
        CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
        ${sessionHash},
        ${ipHash},
        NOT EXISTS (
          SELECT 1
          FROM clicks
          WHERE offer_id = ${offerId}
            AND session_hash = ${sessionHash}
            AND clicked_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '24 HOURS'
        )
    `);
  } catch (error) {
    console.error(`[outbound] stage=tracking errorName=${error instanceof Error ? error.name : "Unknown"}`);
  }
}
