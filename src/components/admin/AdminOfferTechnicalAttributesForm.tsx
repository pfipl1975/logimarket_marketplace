"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAdminOfferTechnicalAttributes } from "@/app/actions";
import type { AdminAttributeEditViewModel } from "@/lib/admin/offer-attributes-edit-read-model";
import type { AdminAttributeMutation } from "@/lib/admin/offer-attributes-edit-core";
import { Loader2, AlertCircle } from "lucide-react";

export interface AdminOfferTechnicalAttributesFormProps {
  offerId: number;
  expectedUpdatedAt: string | null;
  attributes: AdminAttributeEditViewModel[];
  labels: {
    title: string;
    description: string;
    save: string;
    saving: string;
    success: string;
    error: string;
    conflict: string;
    empty: string;
    required: string;
    clear: string;
    orphanWarning: string;
    provenanceLocked: string;
    inactiveWarning: string;
    trueLabel: string;
    falseLabel: string;
    unsetLabel: string;
    inactiveOptionLabel: string;
  };
}

export function AdminOfferTechnicalAttributesForm({
  offerId,
  expectedUpdatedAt,
  attributes,
  labels,
}: AdminOfferTechnicalAttributesFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [mutations, setMutations] = useState<
    Record<number, AdminAttributeMutation["value"]>
  >({});

  const handleScalarChange = (
    attributeId: number,
    type: "text" | "number" | "boolean" | "date" | "year" | "enum",
    raw: string,
  ) => {
    if (raw === "") {
      handleClear(attributeId);
      return;
    }
    let value: string | boolean | number = raw;
    if (type === "boolean") value = raw === "true";
    if (type === "enum") value = parseInt(raw, 10);

    setMutations((prev) => ({
      ...prev,
      [attributeId]:
        type === "enum"
          ? { type: "enum", optionId: value as number }
          : ({
              type,
              value: value as string | boolean,
            } as import("@/lib/admin/offer-attributes-edit-core").AdminAttributeMutation["value"]),
    }));
  };

  const handleMultiEnumToggle = (
    attributeId: number,
    optionId: number,
    checked: boolean,
    currentStoredIds: number[],
  ) => {
    setMutations((prev) => {
      const prevMut = prev[attributeId];
      let ids =
        prevMut?.type === "multi_enum"
          ? [...prevMut.optionIds]
          : [...currentStoredIds];

      if (checked && !ids.includes(optionId)) ids.push(optionId);
      if (!checked) ids = ids.filter((id) => id !== optionId);

      if (ids.length === 0) {
        return { ...prev, [attributeId]: { type: "clear" } };
      }
      return { ...prev, [attributeId]: { type: "multi_enum", optionIds: ids } };
    });
  };

  const handleClear = (attributeId: number) => {
    setMutations((prev) => ({ ...prev, [attributeId]: { type: "clear" } }));
  };

  const getScalarValue = (attr: AdminAttributeEditViewModel) => {
    const m = mutations[attr.attributeId];
    if (m?.type === "clear") return "";
    if (m) {
      if (m.type === "enum") return m.optionId.toString();
      if (m.type === "multi_enum") return "";
      return m.value.toString();
    }

    if (attr.dataType === "enum" && attr.currentValue.optionId)
      return attr.currentValue.optionId.toString();
    if (attr.dataType === "text" && attr.currentValue.text !== undefined)
      return attr.currentValue.text;
    if (attr.dataType === "number" && attr.currentValue.number !== undefined)
      return attr.currentValue.number;
    if (attr.dataType === "boolean" && attr.currentValue.boolean !== undefined)
      return attr.currentValue.boolean.toString();
    if (attr.dataType === "date" && attr.currentValue.date !== undefined)
      return attr.currentValue.date;
    if (attr.dataType === "year" && attr.currentValue.year !== undefined)
      return attr.currentValue.year.toString();
    return "";
  };

  const getMultiEnumChecked = (
    attr: AdminAttributeEditViewModel,
    optionId: number,
  ) => {
    const m = mutations[attr.attributeId];
    if (m?.type === "clear") return false;
    if (m?.type === "multi_enum") return m.optionIds.includes(optionId);
    return (attr.currentValue.optionIds || []).includes(optionId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(mutations).length === 0) return;

    setIsPending(true);
    setErrorCode(null);

    const payloadAttrs = Object.entries(mutations).map(([id, val]) => ({
      attributeId: parseInt(id, 10),
      value: val,
    }));

    const result = await updateAdminOfferTechnicalAttributes({
      offerId,
      expectedUpdatedAt,
      attributes: payloadAttrs,
    });

    setIsPending(false);

    if (!result.ok) {
      setErrorCode(result.code);
    } else {
      router.refresh();
      setMutations({});
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#d9dde2] bg-white shadow-sm overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-[#d9dde2]">
        <h3 className="text-lg font-semibold text-[#141c2c]">{labels.title}</h3>
        <p className="mt-1 text-sm text-[#5a6472]">{labels.description}</p>
      </div>

      <div className="p-6 space-y-6">
        {attributes.length === 0 && (
          <p className="text-sm text-[#5a6472] italic">{labels.empty}</p>
        )}

        {attributes.map((attr) => {
          const val = getScalarValue(attr);
          const isClear =
            mutations[attr.attributeId]?.type === "clear" ||
            (!mutations[attr.attributeId] && !attr.currentValue.hasValue);
          const readOnly = attr.isOrphan || !attr.isAttributeActive;

          return (
            <div
              key={attr.attributeId}
              className={`space-y-2 pb-4 border-b border-[#f0f2f5] last:border-0 last:pb-0 ${readOnly ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#141c2c] flex items-center gap-2">
                  {attr.localizedName}
                  {attr.isRequiredIndicator && (
                    <span className="text-[#147487] text-xs">
                      ({labels.required})
                    </span>
                  )}
                </label>
                {!isClear && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleClear(attr.attributeId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {labels.clear}
                  </button>
                )}
              </div>

              {attr.localizedDescription && (
                <p className="text-xs text-[#5a6472]">
                  {attr.localizedDescription}
                </p>
              )}

              {attr.isOrphan && (
                <div className="flex gap-2 items-center text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4" /> {labels.orphanWarning}
                </div>
              )}
              {!attr.isAttributeActive && (
                <div className="flex gap-2 items-center text-xs text-red-700 bg-red-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4" /> {labels.inactiveWarning}
                </div>
              )}

              {/* INPUTS */}
              {!readOnly ? (
                <div className="flex items-center gap-2 max-w-xl">
                  {attr.dataType === "text" && (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "text",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                  {attr.dataType === "number" && (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "number",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                  {attr.dataType === "date" && (
                    <input
                      type="date"
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "date",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                  {attr.dataType === "year" && (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "year",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                  {attr.dataType === "boolean" && (
                    <select
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "boolean",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{labels.unsetLabel}</option>
                      <option value="true">{labels.trueLabel}</option>
                      <option value="false">{labels.falseLabel}</option>
                    </select>
                  )}
                  {attr.dataType === "enum" && (
                    <select
                      value={val}
                      onChange={(e) =>
                        handleScalarChange(
                          attr.attributeId,
                          "enum",
                          e.target.value,
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{labels.unsetLabel}</option>
                      {attr.options.map((opt) => (
                        <option
                          key={opt.optionId}
                          value={opt.optionId}
                          disabled={
                            !opt.isActive && val !== opt.optionId.toString()
                          }
                        >
                          {opt.localizedLabel}{" "}
                          {!opt.isActive
                            ? `(${labels.inactiveOptionLabel})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {attr.dataType === "multi_enum" && (
                    <div className="flex flex-col gap-2 p-2 border border-[#d9dde2] rounded-md max-h-48 overflow-y-auto w-full">
                      {attr.options.map((opt) => {
                        const checked = getMultiEnumChecked(attr, opt.optionId);
                        const isDisabled = !opt.isActive;
                        return (
                          <label
                            key={opt.optionId}
                            className={`flex items-center gap-2 text-sm ${isDisabled ? "opacity-50" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isDisabled}
                              onChange={(e) => {
                                // Double safeguard
                                if (isDisabled) return;
                                handleMultiEnumToggle(
                                  attr.attributeId,
                                  opt.optionId,
                                  e.target.checked,
                                  attr.currentValue.optionIds || [],
                                );
                              }}
                            />
                            {opt.localizedLabel}{" "}
                            {!opt.isActive
                              ? `(${labels.inactiveOptionLabel})`
                              : ""}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {attr.unitCode && (
                    <span className="text-sm font-medium text-[#5a6472]">
                      {attr.unitCode}
                    </span>
                  )}
                </div>
              ) : (
                <div className="max-w-xl">
                  {/* Read-only historical presentation */}
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 border border-gray-200 min-h-[40px] flex items-center">
                    {attr.dataType === "multi_enum"
                      ? (attr.currentValue.optionIds || [])
                          .map(
                            (id) =>
                              attr.options.find((o) => o.optionId === id)
                                ?.localizedLabel ?? id,
                          )
                          .join(", ")
                      : attr.dataType === "enum"
                        ? (attr.options.find(
                            (o) => o.optionId === attr.currentValue.optionId,
                          )?.localizedLabel ?? attr.currentValue.optionId)
                        : val}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[#f8f9fa] border-t border-[#d9dde2] px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-red-600 font-medium">
          {errorCode === "OFFER_CONFLICT" && labels.conflict}
          {errorCode === "ATTRIBUTE_PROVENANCE_LOCKED" && labels.provenanceLocked}
          {errorCode && errorCode !== "OFFER_CONFLICT" && errorCode !== "ATTRIBUTE_PROVENANCE_LOCKED" && labels.error}
        </div>
        <button
          type="submit"
          disabled={isPending || Object.keys(mutations).length === 0}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#147487] px-8 text-sm font-medium text-white transition-colors hover:bg-[#115b6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147487] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
