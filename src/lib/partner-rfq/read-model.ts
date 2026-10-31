import "server-only";
import { db } from "@/lib/db";
import { requirePartnerCommercialAccess } from "@/lib/auth/partner-commercial-access";
import { getPartnerRfqDetailCore, getPartnerRfqListCore } from "./read-model-core";
import { parsePartnerRfqId, parsePartnerRfqQuery } from "./query";

export async function getPartnerRfqList(partnerId: number, rawQuery: unknown) {
  await requirePartnerCommercialAccess(partnerId);
  const query = parsePartnerRfqQuery(rawQuery);
  return { query, ...await getPartnerRfqListCore(db, partnerId, query) };
}

export async function getPartnerRfqDetail(partnerId: number, rawId: unknown) {
  await requirePartnerCommercialAccess(partnerId);
  const rfqId = parsePartnerRfqId(rawId);
  return rfqId === null ? null : getPartnerRfqDetailCore(db, partnerId, rfqId);
}
