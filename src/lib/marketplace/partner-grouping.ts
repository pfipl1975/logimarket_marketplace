import type { AuthoritativeMarketplaceLine } from "./order-orchestration-types";

export interface PartnerGroup {
  partnerId: number;
  lines: AuthoritativeMarketplaceLine[];
}

export type GroupingResult = 
  | { ok: true; groups: PartnerGroup[] }
  | { ok: false; reason: string };

export function groupLinesByPartner(lines: AuthoritativeMarketplaceLine[]): GroupingResult {
  if (lines.length === 0) {
    return { ok: true, groups: [] };
  }

  const map = new Map<number, AuthoritativeMarketplaceLine[]>();

  for (const line of lines) {
    if (!Number.isSafeInteger(line.partnerId) || line.partnerId <= 0) {
      return { ok: false, reason: "INVALID_PARTNER_IDENTIFIER" };
    }
    
    if (!map.has(line.partnerId)) {
      map.set(line.partnerId, []);
    }
    map.get(line.partnerId)!.push(line);
  }

  // Preserve deterministic group ordering by sorting keys (partner IDs)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);
  const groups: PartnerGroup[] = sortedKeys.map(key => ({
    partnerId: key,
    lines: map.get(key)!,
  }));

  return { ok: true, groups };
}
