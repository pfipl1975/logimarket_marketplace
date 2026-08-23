import { eq, inArray, sql, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export type AdminAttributeMutation = {
  attributeId: number;
  value:
    | { type: "text"; value: string }
    | { type: "number"; value: string }
    | { type: "boolean"; value: boolean }
    | { type: "date"; value: string }
    | { type: "year"; value: string }
    | { type: "enum"; optionId: number }
    | { type: "multi_enum"; optionIds: number[] }
    | { type: "clear" };
};

export type AdminOfferAttributesEditInput = {
  offerId: number;
  expectedUpdatedAt: string | null;
  attributes: AdminAttributeMutation[];
};

export type AdminOfferAttributesMutationResult =
  | { ok: true; code: "ATTRIBUTES_UPDATED"; newUpdatedAt: string }
  | { ok: true; code: "ATTRIBUTES_UNCHANGED"; newUpdatedAt: string | null }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "OFFER_NOT_FOUND"
        | "OFFER_CONFLICT"
        | "OFFER_NOT_EDITABLE_STATUS"
        | "ATTRIBUTE_NOT_ASSIGNED"
        | "ATTRIBUTE_INACTIVE"
        | "ATTRIBUTE_TYPE_MISMATCH"
        | "OPTION_NOT_FOUND"
        | "OPTION_WRONG_ATTRIBUTE"
        | "OPTION_INACTIVE"
        | "SYSTEM_ERROR"
        | "ATTRIBUTE_PROVENANCE_LOCKED";
    };

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function parseMutation(val: unknown): AdminAttributeMutation["value"] | null {
  if (!isObject(val)) return null;
  const t = val.type;
  if (t === "text" && typeof val.value === "string")
    return { type: "text", value: val.value };
  if (t === "number" && typeof val.value === "string")
    return { type: "number", value: val.value };
  if (t === "boolean" && typeof val.value === "boolean")
    return { type: "boolean", value: val.value };
  if (t === "date" && typeof val.value === "string")
    return { type: "date", value: val.value };
  if (t === "year" && typeof val.value === "string")
    return { type: "year", value: val.value };
  if (
    t === "enum" &&
    typeof val.optionId === "number" &&
    Number.isSafeInteger(val.optionId) &&
    val.optionId > 0
  )
    return { type: "enum", optionId: val.optionId };
  if (t === "multi_enum" && Array.isArray(val.optionIds)) {
    const ids: number[] = [];
    const seen = new Set<number>();
    for (const id of val.optionIds) {
      if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0)
        return null;
      if (seen.has(id)) return null;
      seen.add(id);
      ids.push(id);
    }
    return { type: "multi_enum", optionIds: ids };
  }
  if (t === "clear") return { type: "clear" };
  return null;
}

export function parseAdminOfferAttributesEditInput(
  raw: unknown,
): AdminOfferAttributesEditInput | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.offerId !== "number" ||
    !Number.isSafeInteger(raw.offerId) ||
    raw.offerId <= 0
  )
    return null;

  if (raw.expectedUpdatedAt !== null) {
    if (typeof raw.expectedUpdatedAt !== "string") return null;
    const d = new Date(raw.expectedUpdatedAt);
    if (isNaN(d.getTime()) || d.toISOString() !== raw.expectedUpdatedAt)
      return null;
  }

  if (!Array.isArray(raw.attributes)) return null;

  const attributes: AdminAttributeMutation[] = [];
  const seenIds = new Set<number>();

  for (const item of raw.attributes) {
    if (!isObject(item)) return null;
    if (
      typeof item.attributeId !== "number" ||
      !Number.isSafeInteger(item.attributeId) ||
      item.attributeId <= 0
    )
      return null;
    if (seenIds.has(item.attributeId)) return null;
    seenIds.add(item.attributeId);

    const mut = parseMutation(item.value);
    if (!mut) return null;
    attributes.push({ attributeId: item.attributeId, value: mut });
  }

  return {
    offerId: raw.offerId,
    expectedUpdatedAt: raw.expectedUpdatedAt,
    attributes,
  };
}

export async function executeAdminOfferAttributesMutation(
  db: NodePgDatabase<typeof schema>,
  input: AdminOfferAttributesEditInput,
): Promise<AdminOfferAttributesMutationResult> {
  try {
    return await db.transaction(async (tx) => {
      const offerRows = await tx
        .select()
        .from(schema.offers)
        .where(eq(schema.offers.id, input.offerId))
        .for("update"); // lock the row

      if (offerRows.length === 0) return { ok: false, code: "OFFER_NOT_FOUND" };
      const offer = offerRows[0];

      if (
        !["draft", "published", "archived"].includes(offer.publicationStatus)
      ) {
        return { ok: false, code: "OFFER_NOT_EDITABLE_STATUS" };
      }

      const currentUpdatedAt = offer.updatedAt
        ? offer.updatedAt.toISOString()
        : null;
      if (input.expectedUpdatedAt !== currentUpdatedAt) {
        return { ok: false, code: "OFFER_CONFLICT" };
      }

      if (input.attributes.length === 0) {
        return {
          ok: true,
          code: "ATTRIBUTES_UNCHANGED",
          newUpdatedAt: currentUpdatedAt,
        };
      }

      const submittedAttrIds = input.attributes.map((a) => a.attributeId);

      const assignments = await tx
        .select()
        .from(schema.categoryAttributeAssignments)
        .where(
          eq(schema.categoryAttributeAssignments.categoryId, offer.categoryId),
        );

      const assignedAttrIds = new Set(
        assignments.map((a) => a.attributeDefinitionId),
      );

      const definitions = await tx
        .select()
        .from(schema.attributeDefinitions)
        .where(inArray(schema.attributeDefinitions.id, submittedAttrIds));

      const defById = new Map(definitions.map((d) => [d.id, d]));

      // 1. Fetch current OAV/OAOV *BEFORE* option validation!
      const currentOavRows = await tx
        .select()
        .from(schema.offerAttributeValues)
        .where(
          and(
            eq(schema.offerAttributeValues.offerId, offer.id),
            inArray(schema.offerAttributeValues.attributeId, submittedAttrIds),
          ),
        );

      const currentOaovRows = await tx
        .select()
        .from(schema.offerAttributeOptionValues)
        .where(
          and(
            eq(schema.offerAttributeOptionValues.offerId, offer.id),
            inArray(
              schema.offerAttributeOptionValues.attributeId,
              submittedAttrIds,
            ),
          ),
        );

      // 2. Extract options involved in mutation
      const optionIdsToCheck = new Set<number>();
      for (const m of input.attributes) {
        if (m.value.type === "enum") optionIdsToCheck.add(m.value.optionId);
        if (m.value.type === "multi_enum")
          m.value.optionIds.forEach((id) => optionIdsToCheck.add(id));
      }
      // Also add currently persisted inactive options for multi_enum so we can verify them
      for (const r of currentOaovRows) {
        optionIdsToCheck.add(r.optionId);
      }
      for (const r of currentOavRows) {
        if (r.optionId !== null) optionIdsToCheck.add(r.optionId);
      }

      const options =
        optionIdsToCheck.size > 0
          ? await tx
              .select()
              .from(schema.controlledOptionValues)
              .where(
                inArray(
                  schema.controlledOptionValues.id,
                  Array.from(optionIdsToCheck),
                ),
              )
          : [];

      const optById = new Map(options.map((o) => [o.id, o]));

      type NormalizedMutation = {
        attributeId: number;
        value:
          | { type: "clear" }
          | { type: "text"; value: string }
          | { type: "number"; value: string }
          | { type: "boolean"; value: boolean }
          | { type: "date"; value: Date }
          | { type: "year"; value: number }
          | { type: "enum"; optionId: number }
          | { type: "multi_enum"; optionIds: number[] };
      };

      const normalizedAttributes: NormalizedMutation[] = [];

      for (const mut of input.attributes) {
        if (!assignedAttrIds.has(mut.attributeId)) {
          return { ok: false, code: "ATTRIBUTE_NOT_ASSIGNED" };
        }
        const def = defById.get(mut.attributeId);
        if (!def) return { ok: false, code: "SYSTEM_ERROR" };

        if (mut.value.type !== "clear" && mut.value.type !== def.dataType) {
          return { ok: false, code: "ATTRIBUTE_TYPE_MISMATCH" };
        }

        // authoritative inactive check applies to ALL operations including "clear"
        if (!def.isActive) {
          return { ok: false, code: "ATTRIBUTE_INACTIVE" };
        }

        let normalizedValue: NormalizedMutation["value"];

        if (mut.value.type === "clear") {
          normalizedValue = { type: "clear" };
        } else if (mut.value.type === "text") {
          const text = mut.value.value.trim();
          if (!text) return { ok: false, code: "INVALID_INPUT" };
          normalizedValue = { type: "text", value: text };
        } else if (mut.value.type === "number") {
          const n = mut.value.value.trim();
          if (!/^-?\d+(\.\d+)?$/.test(n))
            return { ok: false, code: "INVALID_INPUT" };
          normalizedValue = { type: "number", value: n };
          } else if (mut.value.type === "boolean") {
            normalizedValue = { type: "boolean", value: mut.value.value };
        } else if (mut.value.type === "date") {
          const d = mut.value.value;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
            return { ok: false, code: "INVALID_INPUT" };
          const [y, m, day] = d.split("-").map(Number);
          const dateObj = new Date(y, m - 1, day);
          if (
            dateObj.getFullYear() !== y ||
            dateObj.getMonth() !== m - 1 ||
            dateObj.getDate() !== day
          )
            return { ok: false, code: "INVALID_INPUT" };
          // store as Date object at UTC midnight
          normalizedValue = {
            type: "date",
            value: new Date(`${d}T00:00:00.000Z`),
          };
        } else if (mut.value.type === "year") {
          const yStr = mut.value.value;
          if (!/^(0|-?[1-9]\d*)$/.test(yStr))
            return { ok: false, code: "INVALID_INPUT" }; // Canonical
          const yBig = BigInt(yStr);
          if (yBig < BigInt("-2147483648") || yBig > BigInt("2147483647"))
            return { ok: false, code: "INVALID_INPUT" };
          normalizedValue = { type: "year", value: Number(yBig) };
        } else if (mut.value.type === "enum") {
          const optId = mut.value.optionId;
          const o = optById.get(optId);
          if (!o) return { ok: false, code: "OPTION_NOT_FOUND" };
          if (o.attributeId !== mut.attributeId)
            return { ok: false, code: "OPTION_WRONG_ATTRIBUTE" };

          const currentRow = currentOavRows.find(
            (r) => r.attributeId === mut.attributeId,
          );
          const isCurrentlySelected = currentRow?.optionId === optId;

          if (!o.isActive && !isCurrentlySelected) {
            return { ok: false, code: "OPTION_INACTIVE" };
          }
          normalizedValue = { type: "enum", optionId: optId };
        } else if (mut.value.type === "multi_enum") {
          const currOaov = currentOaovRows
            .filter((r) => r.attributeId === mut.attributeId)
            .map((r) => r.optionId);
          const currentlySelectedSet = new Set(currOaov);

          for (const id of mut.value.optionIds) {
            const o = optById.get(id);
            if (!o) return { ok: false, code: "OPTION_NOT_FOUND" };
            if (o.attributeId !== mut.attributeId)
              return { ok: false, code: "OPTION_WRONG_ATTRIBUTE" };
            if (!o.isActive && !currentlySelectedSet.has(id)) {
              return { ok: false, code: "OPTION_INACTIVE" };
            }
          }

          // Preserve any currently selected inactive options that the client might have omitted
          const preservedInactive = currOaov.filter((id) => {
            const o = optById.get(id);
            return o && !o.isActive;
          });

          // Client submitted options + preserved inactive options
          const finalIds = [
            ...new Set([...mut.value.optionIds, ...preservedInactive]),
          ].sort();

          normalizedValue = { type: "multi_enum", optionIds: finalIds };
        } else {
          return { ok: false, code: "SYSTEM_ERROR" };
        }

        normalizedAttributes.push({
          attributeId: mut.attributeId,
          value: normalizedValue,
        });
      }

      let hasChanges = false;

      const oavToInsert: (typeof schema.offerAttributeValues.$inferInsert)[] =
        [];
      const oavToUpdate: {
        id: number;
        updates: Partial<typeof schema.offerAttributeValues.$inferInsert>;
      }[] = [];
      const oavToDelete: number[] = []; // store primary keys

      const oaovToInsert: (typeof schema.offerAttributeOptionValues.$inferInsert)[] =
        [];
      const oaovToDelete: number[] = []; // store primary keys

      for (const mut of normalizedAttributes) {
        const def = defById.get(mut.attributeId)!;
        if (def.dataType === "multi_enum") {
          const currRows = currentOaovRows.filter(
            (r) => r.attributeId === mut.attributeId,
          );
          const currIds = currRows.map((r) => r.optionId);

          if (mut.value.type === "clear") {
            if (currRows.length > 0) {
              hasChanges = true;
              currRows.forEach((r) => oaovToDelete.push(r.id));
            }
          } else if (mut.value.type === "multi_enum") {
            const newIds = mut.value.optionIds;
            const toDeleteRows = currRows.filter(
              (r) => !newIds.includes(r.optionId),
            );
            const toAddIds = newIds.filter((id) => !currIds.includes(id));

            if (toDeleteRows.length > 0 || toAddIds.length > 0)
              hasChanges = true;

            toDeleteRows.forEach((r) => oaovToDelete.push(r.id));
            toAddIds.forEach((id) =>
              oaovToInsert.push({
                offerId: offer.id,
                attributeId: mut.attributeId,
                optionId: id,
              }),
            );
          }
        } else {
          const existingRow = currentOavRows.find(
            (r) => r.attributeId === mut.attributeId,
          );
          if (mut.value.type === "clear") {
            if (existingRow) {
              hasChanges = true;
              oavToDelete.push(existingRow.id);
            }
          } else {
            const v = mut.value;
            const valObj: typeof schema.offerAttributeValues.$inferInsert = {
              offerId: offer.id,
              attributeId: mut.attributeId,
              valueText: null,
              valueNumber: null,
              valueBoolean: null,
              valueDate: null,
              valueYear: null,
              optionId: null,
            };

            if (v.type === "text") valObj.valueText = v.value;
            if (v.type === "number") valObj.valueNumber = v.value;
            if (v.type === "boolean") valObj.valueBoolean = v.value;
            if (v.type === "date") valObj.valueDate = v.value;
            if (v.type === "year") valObj.valueYear = v.value;
            if (v.type === "enum") valObj.optionId = v.optionId;

            if (!existingRow) {
              hasChanges = true;
              oavToInsert.push(valObj);
            } else {
              let changed = false;
              if (existingRow.valueText !== valObj.valueText) changed = true;
              if (existingRow.valueNumber !== valObj.valueNumber)
                changed = true;
              if (existingRow.valueBoolean !== valObj.valueBoolean)
                changed = true;
              if (existingRow.valueYear !== valObj.valueYear) changed = true;
              if (existingRow.optionId !== valObj.optionId) changed = true;

              if (
                existingRow.valueDate?.getTime() !== valObj.valueDate?.getTime()
              ) {
                changed = true;
              }

              if (changed) {
                hasChanges = true;
                oavToUpdate.push({ id: existingRow.id, updates: valObj });
              }
            }
          }
        }
      }

      if (oavToDelete.length > 0 || oaovToDelete.length > 0) {
        const checkRes = (await tx.execute(
          sql`SELECT to_regclass('public.migration_oav_targets') AS has_oav, to_regclass('public.migration_oaov_targets') AS has_oaov`
        )) as unknown as { rows?: { has_oav: string | null; has_oaov: string | null }[] };
        const rows = checkRes.rows || checkRes;
        const row = Array.isArray(rows) ? rows[0] : undefined;
        const hasOav = !!row?.has_oav;
        const hasOaov = !!row?.has_oaov;

        if (hasOav !== hasOaov) {
          return { ok: false, code: "SYSTEM_ERROR" };
        }

        if (hasOav && hasOaov) {
          if (oavToDelete.length > 0) {
            const lockedOav = await tx
              .select({ id: schema.migrationOavTargets.id })
              .from(schema.migrationOavTargets)
              .where(
                inArray(schema.migrationOavTargets.targetRowIdCurrent, oavToDelete),
              )
              .limit(1);
            if (lockedOav.length > 0)
              return { ok: false, code: "ATTRIBUTE_PROVENANCE_LOCKED" };
          }

          if (oaovToDelete.length > 0) {
            const lockedOaov = await tx
              .select({ id: schema.migrationOaovTargets.id })
              .from(schema.migrationOaovTargets)
              .where(
                inArray(
                  schema.migrationOaovTargets.targetRowIdCurrent,
                  oaovToDelete,
                ),
              )
              .limit(1);
            if (lockedOaov.length > 0)
              return { ok: false, code: "ATTRIBUTE_PROVENANCE_LOCKED" };
          }
        }
      }

      if (!hasChanges) {
        return {
          ok: true,
          code: "ATTRIBUTES_UNCHANGED",
          newUpdatedAt: currentUpdatedAt,
        };
      }

      if (oavToDelete.length > 0) {
        await tx
          .delete(schema.offerAttributeValues)
          .where(inArray(schema.offerAttributeValues.id, oavToDelete));
      }
      if (oaovToDelete.length > 0) {
        await tx
          .delete(schema.offerAttributeOptionValues)
          .where(inArray(schema.offerAttributeOptionValues.id, oaovToDelete));
      }

      if (oavToInsert.length > 0) {
        await tx.insert(schema.offerAttributeValues).values(oavToInsert);
      }
      for (const update of oavToUpdate) {
        await tx
          .update(schema.offerAttributeValues)
          .set(update.updates)
          .where(eq(schema.offerAttributeValues.id, update.id));
      }

      if (oaovToInsert.length > 0) {
        await tx.insert(schema.offerAttributeOptionValues).values(oaovToInsert);
      }

      const updatedOffer = await tx
        .update(schema.offers)
        .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.offers.id, offer.id))
        .returning({ updatedAt: schema.offers.updatedAt });

      return {
        ok: true,
        code: "ATTRIBUTES_UPDATED",
        newUpdatedAt: updatedOffer[0].updatedAt!.toISOString(),
      };
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[offer-attributes-edit] execution failed.", { errorName });
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}