import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

const SUPPORTED_DATA_TYPES = [
  "text",
  "number",
  "boolean",
  "date",
  "year",
  "enum",
  "multi_enum",
] as const;

export type PartnerAttributeDataType = (typeof SUPPORTED_DATA_TYPES)[number];

export type PartnerAttributeMutation = {
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

export type PartnerOfferAttributesEditInput = {
  partnerId: number;
  offerId: number;
  expectedCategoryId: number;
  expectedUpdatedAt: string | null;
  attributes: PartnerAttributeMutation[];
};

export type PartnerOfferAttributesMutationResult =
  | {
      ok: true;
      code: "ATTRIBUTES_UPDATED" | "ATTRIBUTES_UNCHANGED";
      changed: boolean;
      newUpdatedAt: string | null;
    }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "OFFER_NOT_FOUND"
        | "OFFER_NOT_EDITABLE_STATUS"
        | "OFFER_CONFLICT"
        | "CATEGORY_CONFLICT"
        | "ATTRIBUTE_NOT_ASSIGNED"
        | "ATTRIBUTE_NOT_FOUND"
        | "ATTRIBUTE_INACTIVE"
        | "ATTRIBUTE_TYPE_UNSUPPORTED"
        | "ATTRIBUTE_TYPE_MISMATCH"
        | "ATTRIBUTE_STORAGE_INCONSISTENT"
        | "OPTION_NOT_FOUND"
        | "OPTION_WRONG_ATTRIBUTE"
        | "OPTION_INACTIVE"
        | "ATTRIBUTE_PROVENANCE_LOCKED"
        | "SYSTEM_ERROR";
    };

type CurrentOffer = {
  id: number;
  partnerId: number;
  categoryId: number;
  publicationStatus: string;
  updatedAt: Date | string | null;
};

type AttributeAssignment = {
  attributeDefinitionId: number;
};

type AttributeDefinition = {
  id: number;
  dataType: string;
  isActive: boolean;
};

type ControlledOption = {
  id: number;
  attributeId: number;
  isActive: boolean;
};

type ScalarRow = {
  id: number;
  attributeId: number;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueDate: Date | string | null;
  valueYear: number | null;
  optionId: number | null;
};

type MultiRow = {
  id: number;
  attributeId: number;
  optionId: number;
};

type ScalarSlots = {
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueYear: number | null;
  optionId: number | null;
};

export function isCanonicalPartnerAttributeStorageShape(
  dataType: PartnerAttributeDataType,
  scalarRows: readonly Pick<ScalarRow, keyof ScalarSlots>[],
  multiRowCount: number,
): boolean {
  if (dataType === "multi_enum") return scalarRows.length === 0;
  if (multiRowCount > 0 || scalarRows.length > 1) return false;
  if (scalarRows.length === 0) return true;

  const expectedSlot: keyof ScalarSlots =
    dataType === "text"
      ? "valueText"
      : dataType === "number"
        ? "valueNumber"
        : dataType === "boolean"
          ? "valueBoolean"
          : dataType === "date"
            ? "valueDate"
            : dataType === "year"
              ? "valueYear"
              : "optionId";
  const row = scalarRows[0];
  const slots: Array<keyof ScalarSlots> = [
    "valueText",
    "valueNumber",
    "valueBoolean",
    "valueDate",
    "valueYear",
    "optionId",
  ];
  return slots.every((slot) =>
    slot === expectedSlot ? row[slot] !== null : row[slot] === null,
  );
}

export type PartnerOfferAttributesMutationState = {
  offer: CurrentOffer | null;
  assignments: AttributeAssignment[];
  definitions: AttributeDefinition[];
  options: ControlledOption[];
  scalarRows: ScalarRow[];
  multiRows: MultiRow[];
};

export type PartnerOfferAttributesMutationPlan = {
  scalarDeletes: number[];
  scalarInserts: Array<{
    offerId: number;
    attributeId: number;
  } & ScalarSlots>;
  scalarUpdates: Array<{ id: number; value: ScalarSlots }>;
  multiDeletes: number[];
  multiInserts: Array<{
    offerId: number;
    attributeId: number;
    optionId: number;
  }>;
};

type PlannedResult =
  | PartnerOfferAttributesMutationResult
  | {
      ok: true;
      code: "EXECUTE_MUTATION";
      changed: true;
      plan: PartnerOfferAttributesMutationPlan;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseMutationValue(
  raw: unknown,
): PartnerAttributeMutation["value"] | null {
  if (!isObject(raw) || !hasOnlyKeys(raw, ["type", "value", "optionId", "optionIds"])) {
    return null;
  }

  if (raw.type === "clear") {
    return Object.keys(raw).length === 1 ? { type: "clear" } : null;
  }
  if (
    (raw.type === "text" ||
      raw.type === "number" ||
      raw.type === "date" ||
      raw.type === "year") &&
    typeof raw.value === "string" &&
    Object.keys(raw).length === 2
  ) {
    return { type: raw.type, value: raw.value };
  }
  if (
    raw.type === "boolean" &&
    typeof raw.value === "boolean" &&
    Object.keys(raw).length === 2
  ) {
    return { type: "boolean", value: raw.value };
  }
  if (
    raw.type === "enum" &&
    isPositiveInteger(raw.optionId) &&
    Object.keys(raw).length === 2
  ) {
    return { type: "enum", optionId: raw.optionId };
  }
  if (
    raw.type === "multi_enum" &&
    Array.isArray(raw.optionIds) &&
    Object.keys(raw).length === 2
  ) {
    const optionIds: number[] = [];
    const seen = new Set<number>();
    for (const optionId of raw.optionIds) {
      if (!isPositiveInteger(optionId) || seen.has(optionId)) return null;
      seen.add(optionId);
      optionIds.push(optionId);
    }
    return { type: "multi_enum", optionIds };
  }
  return null;
}

export function parsePartnerOfferAttributesEditInput(
  raw: unknown,
):
  | { ok: true; data: PartnerOfferAttributesEditInput }
  | { ok: false; code: "INVALID_INPUT" } {
  if (
    !isObject(raw) ||
    !hasOnlyKeys(raw, [
      "partnerId",
      "offerId",
      "expectedCategoryId",
      "expectedUpdatedAt",
      "attributes",
      "locale",
    ]) ||
    !isPositiveInteger(raw.partnerId) ||
    !isPositiveInteger(raw.offerId) ||
    !isPositiveInteger(raw.expectedCategoryId) ||
    !Array.isArray(raw.attributes)
  ) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (raw.locale !== undefined && typeof raw.locale !== "string") {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (raw.expectedUpdatedAt !== null) {
    if (typeof raw.expectedUpdatedAt !== "string") {
      return { ok: false, code: "INVALID_INPUT" };
    }
    const parsed = new Date(raw.expectedUpdatedAt);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString() !== raw.expectedUpdatedAt
    ) {
      return { ok: false, code: "INVALID_INPUT" };
    }
  }

  const attributes: PartnerAttributeMutation[] = [];
  const seenAttributeIds = new Set<number>();
  for (const rawMutation of raw.attributes) {
    if (
      !isObject(rawMutation) ||
      !hasOnlyKeys(rawMutation, ["attributeId", "value"]) ||
      !isPositiveInteger(rawMutation.attributeId) ||
      seenAttributeIds.has(rawMutation.attributeId)
    ) {
      return { ok: false, code: "INVALID_INPUT" };
    }
    const value = parseMutationValue(rawMutation.value);
    if (value === null) return { ok: false, code: "INVALID_INPUT" };
    seenAttributeIds.add(rawMutation.attributeId);
    attributes.push({ attributeId: rawMutation.attributeId, value });
  }

  return {
    ok: true,
    data: {
      partnerId: raw.partnerId,
      offerId: raw.offerId,
      expectedCategoryId: raw.expectedCategoryId,
      expectedUpdatedAt: raw.expectedUpdatedAt,
      attributes,
    },
  };
}

function isSupportedDataType(value: string): value is PartnerAttributeDataType {
  return (SUPPORTED_DATA_TYPES as readonly string[]).includes(value);
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateKey(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function emptySlots(): ScalarSlots {
  return {
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    valueYear: null,
    optionId: null,
  };
}

function equalSlots(row: ScalarRow, value: ScalarSlots): boolean {
  return (
    row.valueText === value.valueText &&
    row.valueNumber === value.valueNumber &&
    row.valueBoolean === value.valueBoolean &&
    toDateKey(row.valueDate) === toDateKey(value.valueDate) &&
    row.valueYear === value.valueYear &&
    row.optionId === value.optionId
  );
}

function normalizeDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeYear(value: string): number | null {
  if (!/^(0|-?[1-9]\d*)$/.test(value)) return null;
  const parsed = BigInt(value);
  if (
    parsed < BigInt("-2147483648") ||
    parsed > BigInt("2147483647")
  ) {
    return null;
  }
  return Number(parsed);
}

export function planPartnerOfferAttributesMutation(
  input: PartnerOfferAttributesEditInput,
  state: PartnerOfferAttributesMutationState,
): PlannedResult {
  const offer = state.offer;
  if (offer === null || offer.id !== input.offerId || offer.partnerId !== input.partnerId) {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }
  if (offer.publicationStatus === "deleted") {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }
  if (offer.publicationStatus !== "draft") {
    return { ok: false, code: "OFFER_NOT_EDITABLE_STATUS" };
  }
  if (offer.categoryId !== input.expectedCategoryId) {
    return { ok: false, code: "CATEGORY_CONFLICT" };
  }

  const currentUpdatedAt = toIso(offer.updatedAt);
  if (currentUpdatedAt !== input.expectedUpdatedAt) {
    return { ok: false, code: "OFFER_CONFLICT" };
  }
  if (input.attributes.length === 0) {
    return {
      ok: true,
      code: "ATTRIBUTES_UNCHANGED",
      changed: false,
      newUpdatedAt: currentUpdatedAt,
    };
  }

  const assignedIds = new Set(
    state.assignments.map((assignment) => assignment.attributeDefinitionId),
  );
  const definitions = new Map(
    state.definitions.map((definition) => [definition.id, definition]),
  );
  const options = new Map(state.options.map((option) => [option.id, option]));
  const plan: PartnerOfferAttributesMutationPlan = {
    scalarDeletes: [],
    scalarInserts: [],
    scalarUpdates: [],
    multiDeletes: [],
    multiInserts: [],
  };

  for (const mutation of input.attributes) {
    if (!assignedIds.has(mutation.attributeId)) {
      return { ok: false, code: "ATTRIBUTE_NOT_ASSIGNED" };
    }
    const definition = definitions.get(mutation.attributeId);
    if (definition === undefined) {
      return { ok: false, code: "ATTRIBUTE_NOT_FOUND" };
    }
    if (!definition.isActive) {
      return { ok: false, code: "ATTRIBUTE_INACTIVE" };
    }
    if (!isSupportedDataType(definition.dataType)) {
      return { ok: false, code: "ATTRIBUTE_TYPE_UNSUPPORTED" };
    }

    const currentScalarRows = state.scalarRows.filter(
      (row) => row.attributeId === mutation.attributeId,
    );
    const currentMultiRows = state.multiRows.filter(
      (row) => row.attributeId === mutation.attributeId,
    );
    if (
      !isCanonicalPartnerAttributeStorageShape(
        definition.dataType,
        currentScalarRows,
        currentMultiRows.length,
      )
    ) {
      return { ok: false, code: "ATTRIBUTE_STORAGE_INCONSISTENT" };
    }

    if (definition.dataType === "enum" || definition.dataType === "multi_enum") {
      const persistedOptionIds =
        definition.dataType === "enum"
          ? currentScalarRows.map((row) => row.optionId).filter((id): id is number => id !== null)
          : currentMultiRows.map((row) => row.optionId);

      for (const optionId of persistedOptionIds) {
        const option = options.get(optionId);
        if (option === undefined) return { ok: false, code: "OPTION_NOT_FOUND" };
        if (option.attributeId !== mutation.attributeId) {
          return { ok: false, code: "OPTION_WRONG_ATTRIBUTE" };
        }
        if (!option.isActive) return { ok: false, code: "OPTION_INACTIVE" };
      }
    }

    let normalizedValue = mutation.value;
    if (
      (normalizedValue.type === "text" ||
        normalizedValue.type === "number" ||
        normalizedValue.type === "date" ||
        normalizedValue.type === "year") &&
      normalizedValue.value.trim() === ""
    ) {
      normalizedValue = { type: "clear" };
    }
    if (
      normalizedValue.type === "multi_enum" &&
      normalizedValue.optionIds.length === 0
    ) {
      normalizedValue = { type: "clear" };
    }
    if (
      normalizedValue.type !== "clear" &&
      normalizedValue.type !== definition.dataType
    ) {
      return { ok: false, code: "ATTRIBUTE_TYPE_MISMATCH" };
    }

    if (definition.dataType === "multi_enum") {
      const currentRows = currentMultiRows;
      const currentIds = new Set(currentRows.map((row) => row.optionId));
      const nextIds =
        normalizedValue.type === "multi_enum"
          ? [...normalizedValue.optionIds].sort((left, right) => left - right)
          : [];

      for (const optionId of nextIds) {
        const option = options.get(optionId);
        if (option === undefined) return { ok: false, code: "OPTION_NOT_FOUND" };
        if (option.attributeId !== mutation.attributeId) {
          return { ok: false, code: "OPTION_WRONG_ATTRIBUTE" };
        }
        if (!option.isActive) return { ok: false, code: "OPTION_INACTIVE" };
      }

      for (const row of currentRows) {
        if (!nextIds.includes(row.optionId)) plan.multiDeletes.push(row.id);
      }
      for (const optionId of nextIds) {
        if (!currentIds.has(optionId)) {
          plan.multiInserts.push({
            offerId: offer.id,
            attributeId: mutation.attributeId,
            optionId,
          });
        }
      }
      continue;
    }

    const currentRow = currentScalarRows[0];
    if (normalizedValue.type === "clear") {
      if (currentRow !== undefined) plan.scalarDeletes.push(currentRow.id);
      continue;
    }

    const slots = emptySlots();
    if (normalizedValue.type === "text") {
      slots.valueText = normalizedValue.value.trim();
    } else if (normalizedValue.type === "number") {
      const value = normalizedValue.value.trim();
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        return { ok: false, code: "INVALID_INPUT" };
      }
      slots.valueNumber = value;
    } else if (normalizedValue.type === "boolean") {
      slots.valueBoolean = normalizedValue.value;
    } else if (normalizedValue.type === "date") {
      const date = normalizeDate(normalizedValue.value);
      if (date === null) return { ok: false, code: "INVALID_INPUT" };
      slots.valueDate = date;
    } else if (normalizedValue.type === "year") {
      const year = normalizeYear(normalizedValue.value);
      if (year === null) return { ok: false, code: "INVALID_INPUT" };
      slots.valueYear = year;
    } else if (normalizedValue.type === "enum") {
      const option = options.get(normalizedValue.optionId);
      if (option === undefined) return { ok: false, code: "OPTION_NOT_FOUND" };
      if (option.attributeId !== mutation.attributeId) {
        return { ok: false, code: "OPTION_WRONG_ATTRIBUTE" };
      }
      if (!option.isActive) return { ok: false, code: "OPTION_INACTIVE" };
      slots.optionId = normalizedValue.optionId;
    } else {
      return { ok: false, code: "ATTRIBUTE_TYPE_MISMATCH" };
    }

    if (currentRow === undefined) {
      plan.scalarInserts.push({
        offerId: offer.id,
        attributeId: mutation.attributeId,
        ...slots,
      });
    } else if (!equalSlots(currentRow, slots)) {
      plan.scalarUpdates.push({ id: currentRow.id, value: slots });
    }
  }

  const changed =
    plan.scalarDeletes.length > 0 ||
    plan.scalarInserts.length > 0 ||
    plan.scalarUpdates.length > 0 ||
    plan.multiDeletes.length > 0 ||
    plan.multiInserts.length > 0;
  if (!changed) {
    return {
      ok: true,
      code: "ATTRIBUTES_UNCHANGED",
      changed: false,
      newUpdatedAt: currentUpdatedAt,
    };
  }
  return { ok: true, code: "EXECUTE_MUTATION", changed: true, plan };
}

export async function executePartnerOfferAttributesMutation(
  db: NodePgDatabase<typeof schema>,
  input: PartnerOfferAttributesEditInput,
): Promise<PartnerOfferAttributesMutationResult> {
  try {
    return await db.transaction(async (tx) => {
      const offerRows = await tx
        .select({
          id: schema.offers.id,
          partnerId: schema.offers.partnerId,
          categoryId: schema.offers.categoryId,
          publicationStatus: schema.offers.publicationStatus,
          updatedAt: schema.offers.updatedAt,
        })
        .from(schema.offers)
        .where(eq(schema.offers.id, input.offerId))
        .for("update");

      const submittedAttributeIds = input.attributes.map(
        (mutation) => mutation.attributeId,
      );
      const offer = offerRows[0] ?? null;
      const categoryId = offer?.categoryId ?? input.expectedCategoryId;

      const assignments = await tx
        .select({
          attributeDefinitionId:
            schema.categoryAttributeAssignments.attributeDefinitionId,
        })
        .from(schema.categoryAttributeAssignments)
        .where(eq(schema.categoryAttributeAssignments.categoryId, categoryId));

      const definitions =
        submittedAttributeIds.length > 0
          ? await tx
              .select({
                id: schema.attributeDefinitions.id,
                dataType: schema.attributeDefinitions.dataType,
                isActive: schema.attributeDefinitions.isActive,
              })
              .from(schema.attributeDefinitions)
              .where(
                inArray(schema.attributeDefinitions.id, submittedAttributeIds),
              )
          : [];

      const scalarRows =
        offer !== null && submittedAttributeIds.length > 0
          ? await tx
              .select({
                id: schema.offerAttributeValues.id,
                attributeId: schema.offerAttributeValues.attributeId,
                valueText: schema.offerAttributeValues.valueText,
                valueNumber: schema.offerAttributeValues.valueNumber,
                valueBoolean: schema.offerAttributeValues.valueBoolean,
                valueDate: schema.offerAttributeValues.valueDate,
                valueYear: schema.offerAttributeValues.valueYear,
                optionId: schema.offerAttributeValues.optionId,
              })
              .from(schema.offerAttributeValues)
              .where(
                and(
                  eq(schema.offerAttributeValues.offerId, offer.id),
                  inArray(
                    schema.offerAttributeValues.attributeId,
                    submittedAttributeIds,
                  ),
                ),
              )
          : [];

      const multiRows =
        offer !== null && submittedAttributeIds.length > 0
          ? await tx
              .select({
                id: schema.offerAttributeOptionValues.id,
                attributeId: schema.offerAttributeOptionValues.attributeId,
                optionId: schema.offerAttributeOptionValues.optionId,
              })
              .from(schema.offerAttributeOptionValues)
              .where(
                and(
                  eq(schema.offerAttributeOptionValues.offerId, offer.id),
                  inArray(
                    schema.offerAttributeOptionValues.attributeId,
                    submittedAttributeIds,
                  ),
                ),
              )
          : [];

      const submittedOptionIds = input.attributes.flatMap((mutation) => {
        if (mutation.value.type === "enum") return [mutation.value.optionId];
        if (mutation.value.type === "multi_enum") return mutation.value.optionIds;
        return [];
      });
      const persistedOptionIds: number[] = [];
      for (const row of scalarRows) {
        if (row.optionId !== null) persistedOptionIds.push(row.optionId);
      }
      for (const row of multiRows) {
        persistedOptionIds.push(row.optionId);
      }
      const allOptionIdsToFetch = Array.from(new Set([...submittedOptionIds, ...persistedOptionIds]));

      const options =
        allOptionIdsToFetch.length > 0
          ? await tx
              .select({
                id: schema.controlledOptionValues.id,
                attributeId: schema.controlledOptionValues.attributeId,
                isActive: schema.controlledOptionValues.isActive,
              })
              .from(schema.controlledOptionValues)
              .where(
                inArray(schema.controlledOptionValues.id, allOptionIdsToFetch),
              )
          : [];

      const planned = planPartnerOfferAttributesMutation(input, {
        offer,
        assignments,
        definitions,
        options,
        scalarRows,
        multiRows,
      });
      if (planned.code !== "EXECUTE_MUTATION") {
        return planned as PartnerOfferAttributesMutationResult;
      }

      if (
        planned.plan.scalarDeletes.length > 0 ||
        planned.plan.multiDeletes.length > 0
      ) {
        const registryResult = (await tx.execute(
          sql`SELECT to_regclass('public.migration_oav_targets') AS has_oav, to_regclass('public.migration_oaov_targets') AS has_oaov`,
        )) as unknown as {
          rows?: Array<{ has_oav: string | null; has_oaov: string | null }>;
        };
        const registryRow = registryResult.rows?.[0];
        const hasOavRegistry = Boolean(registryRow?.has_oav);
        const hasOaovRegistry = Boolean(registryRow?.has_oaov);
        if (hasOavRegistry !== hasOaovRegistry) {
          return { ok: false, code: "SYSTEM_ERROR" };
        }
        if (hasOavRegistry && hasOaovRegistry) {
          if (planned.plan.scalarDeletes.length > 0) {
            const locked = await tx
              .select({ id: schema.migrationOavTargets.id })
              .from(schema.migrationOavTargets)
              .where(
                inArray(
                  schema.migrationOavTargets.targetRowIdCurrent,
                  planned.plan.scalarDeletes,
                ),
              )
              .limit(1);
            if (locked.length > 0) {
              return { ok: false, code: "ATTRIBUTE_PROVENANCE_LOCKED" };
            }
          }
          if (planned.plan.multiDeletes.length > 0) {
            const locked = await tx
              .select({ id: schema.migrationOaovTargets.id })
              .from(schema.migrationOaovTargets)
              .where(
                inArray(
                  schema.migrationOaovTargets.targetRowIdCurrent,
                  planned.plan.multiDeletes,
                ),
              )
              .limit(1);
            if (locked.length > 0) {
              return { ok: false, code: "ATTRIBUTE_PROVENANCE_LOCKED" };
            }
          }
        }
      }

      if (planned.plan.scalarDeletes.length > 0) {
        await tx
          .delete(schema.offerAttributeValues)
          .where(
            inArray(
              schema.offerAttributeValues.id,
              planned.plan.scalarDeletes,
            ),
          );
      }
      if (planned.plan.multiDeletes.length > 0) {
        await tx
          .delete(schema.offerAttributeOptionValues)
          .where(
            inArray(
              schema.offerAttributeOptionValues.id,
              planned.plan.multiDeletes,
            ),
          );
      }
      if (planned.plan.scalarInserts.length > 0) {
        await tx
          .insert(schema.offerAttributeValues)
          .values(planned.plan.scalarInserts);
      }
      for (const update of planned.plan.scalarUpdates) {
        await tx
          .update(schema.offerAttributeValues)
          .set({ ...update.value, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(schema.offerAttributeValues.id, update.id));
      }
      if (planned.plan.multiInserts.length > 0) {
        await tx
          .insert(schema.offerAttributeOptionValues)
          .values(planned.plan.multiInserts);
      }

      const updatedOffer = await tx
        .update(schema.offers)
        .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(
          and(
            eq(schema.offers.id, offer!.id),
            eq(schema.offers.partnerId, input.partnerId),
            eq(schema.offers.categoryId, input.expectedCategoryId),
            eq(schema.offers.publicationStatus, "draft"),
          ),
        )
        .returning({ updatedAt: schema.offers.updatedAt });
      if (updatedOffer.length !== 1) throw new Error("VERSION_MARKER_FAILED");

      return {
        ok: true,
        code: "ATTRIBUTES_UPDATED",
        changed: true,
        newUpdatedAt: toIso(updatedOffer[0].updatedAt),
      };
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[partner-offer-attributes] stage=execution", { errorName });
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
