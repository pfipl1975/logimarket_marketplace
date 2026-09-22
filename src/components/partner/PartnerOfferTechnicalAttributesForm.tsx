"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { updatePartnerOfferTechnicalAttributes } from "@/app/actions";
import { usePartnerOfferBusy } from "./PartnerOfferBusyContext";
import type { PartnerOfferAttributesEditDto } from "@/lib/partner-offers/attribute-edit-read-model";
import type { PartnerAttributeMutation } from "@/lib/partner-offers/attribute-edit-core";

export function PartnerOfferTechnicalAttributesForm({
  model,
  partnerId,
  locale,
  dict,
}: {
  model: PartnerOfferAttributesEditDto;
  partnerId: number;
  locale: string;
  dict: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { busyDomain, setBusyDomain } = usePartnerOfferBusy();
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(
    model.expectedUpdatedAt,
  );
  const [mutations, setMutations] = useState<
    Record<number, PartnerAttributeMutation["value"]>
  >({});
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setScalarValue = (
    attributeId: number,
    type: "text" | "number" | "boolean" | "date" | "year" | "enum",
    rawValue: string,
  ) => {
    setSaved(false);
    if (rawValue === "") {
      setMutations((current) => ({
        ...current,
        [attributeId]: { type: "clear" },
      }));
      return;
    }
    setMutations((current) => ({
      ...current,
      [attributeId]:
        type === "enum"
          ? { type: "enum", optionId: Number(rawValue) }
          : type === "boolean"
            ? { type: "boolean", value: rawValue === "true" }
            : { type, value: rawValue },
    }));
  };

  const clearValue = (attributeId: number) => {
    setSaved(false);
    setMutations((current) => ({
      ...current,
      [attributeId]: { type: "clear" },
    }));
  };

  const scalarValue = (
    attribute: PartnerOfferAttributesEditDto["attributes"][number],
  ): string => {
    const mutation = mutations[attribute.attributeId];
    if (mutation?.type === "clear") return "";
    if (mutation !== undefined) {
      if (mutation.type === "enum") return String(mutation.optionId);
      if (mutation.type === "multi_enum") return "";
      return String(mutation.value);
    }
    if (attribute.dataType === "text") return attribute.currentValue.text ?? "";
    if (attribute.dataType === "number") {
      return attribute.currentValue.number ?? "";
    }
    if (attribute.dataType === "boolean") {
      return attribute.currentValue.boolean === undefined
        ? ""
        : String(attribute.currentValue.boolean);
    }
    if (attribute.dataType === "date") return attribute.currentValue.date ?? "";
    if (attribute.dataType === "year") {
      return attribute.currentValue.year === undefined
        ? ""
        : String(attribute.currentValue.year);
    }
    if (attribute.dataType === "enum") {
      return attribute.currentValue.optionId === undefined
        ? ""
        : String(attribute.currentValue.optionId);
    }
    return "";
  };

  const activeCurrentOptionIds = (
    attribute: PartnerOfferAttributesEditDto["attributes"][number],
  ) => {
    const activeIds = new Set(attribute.options.map((option) => option.optionId));
    return (attribute.currentValue.optionIds ?? []).filter((optionId) =>
      activeIds.has(optionId),
    );
  };

  const isOptionChecked = (
    attribute: PartnerOfferAttributesEditDto["attributes"][number],
    optionId: number,
  ) => {
    const mutation = mutations[attribute.attributeId];
    if (mutation?.type === "clear") return false;
    if (mutation?.type === "multi_enum") {
      return mutation.optionIds.includes(optionId);
    }
    return activeCurrentOptionIds(attribute).includes(optionId);
  };

  const toggleOption = (
    attribute: PartnerOfferAttributesEditDto["attributes"][number],
    optionId: number,
    checked: boolean,
  ) => {
    setSaved(false);
    setMutations((current) => {
      const currentMutation = current[attribute.attributeId];
      const selected =
        currentMutation?.type === "multi_enum"
          ? [...currentMutation.optionIds]
          : currentMutation?.type === "clear"
            ? []
            : activeCurrentOptionIds(attribute);
      const next = checked
        ? [...new Set([...selected, optionId])]
        : selected.filter((id) => id !== optionId);
      return {
        ...current,
        [attribute.attributeId]:
          next.length === 0
            ? { type: "clear" }
            : { type: "multi_enum", optionIds: next },
      };
    });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const attributes = Object.entries(mutations).map(
      ([attributeId, value]) => ({
        attributeId: Number(attributeId),
        value,
      }),
    );
    if (attributes.length === 0) return;

    setErrorCode(null);
    setSaved(false);
    setBusyDomain("attr");
    startTransition(async () => {
      try {
      const result = await updatePartnerOfferTechnicalAttributes({
        partnerId,
        offerId: model.offerId,
        expectedCategoryId: model.category.id,
        expectedUpdatedAt,
        attributes,
        locale,
      });
      if (!result.ok) {
        setErrorCode(result.code);
        return;
      }
      setExpectedUpdatedAt(result.newUpdatedAt);
      setMutations({});
      setSaved(true);
      router.refresh();
      } finally {
        setBusyDomain(null);
      }
    });
  };

  const conflict =
    errorCode === "OFFER_CONFLICT" || errorCode === "CATEGORY_CONFLICT";
  const validationError =
    errorCode !== null &&
    [
      "INVALID_INPUT",
      "ATTRIBUTE_NOT_ASSIGNED",
      "ATTRIBUTE_NOT_FOUND",
      "ATTRIBUTE_INACTIVE",
      "ATTRIBUTE_TYPE_UNSUPPORTED",
      "ATTRIBUTE_TYPE_MISMATCH",
      "ATTRIBUTE_STORAGE_INCONSISTENT",
      "OPTION_NOT_FOUND",
      "OPTION_WRONG_ATTRIBUTE",
      "OPTION_INACTIVE",
    ].includes(errorCode);

  return (
    <form
      onSubmit={submit}
      className="border border-border-industrial bg-white shadow-soft"
    >
      <fieldset disabled={isPending || (busyDomain !== null && busyDomain !== "attr")}>
      <div className="border-b border-border-industrial p-5 sm:p-8">
        <h2 className="text-lg font-bold text-brand-navy">
          {dict.offerAttributeEditTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.offerAttributeEditDescription}
        </p>
        <p className="mt-3 text-xs font-medium text-brand-navy">
          {dict.offersColumnCategory}: {model.category.name}
        </p>
      </div>

      {model.configurationState === "configuration_inconsistent" && (
        <div className="border-b border-amber-200 bg-amber-50 p-5 sm:px-8">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {dict.offerAttributeEditConfigurationTitle}
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-800">
            {dict.offerAttributeEditConfigurationHint}
          </p>
        </div>
      )}

      {model.configurationState === "no_assignments" ? (
        <div className="p-5 sm:p-8">
          <div className="border border-dashed border-border-industrial bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-brand-navy">
              {dict.offerAttributeEditEmpty}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {dict.offerAttributeEditEmptyHint}
            </p>
          </div>
        </div>
      ) : model.attributes.length > 0 ? (
        <div className="divide-y divide-border-industrial px-5 sm:px-8">
          {model.attributes.map((attribute) => {
            const value = scalarValue(attribute);
            const valueIsSet =
              mutations[attribute.attributeId]?.type !== "clear" &&
              (mutations[attribute.attributeId] !== undefined ||
                attribute.currentValue.hasValue);
            const descriptionId = `partner-attribute-${attribute.attributeId}-description`;

            return (
              <fieldset
                key={attribute.attributeId}
                className="grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8"
                disabled={isPending || !attribute.isConsistent}
              >
                <div>
                  <legend className="text-sm font-semibold text-brand-navy">
                    {attribute.localizedName}
                  </legend>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {attribute.isRequired
                      ? dict.offerAttributeEditRequired
                      : dict.offerAttributeEditOptional}
                    {attribute.unitCode
                      ? ` · ${dict.offerAttributeEditUnit}: ${attribute.unitCode}`
                      : ""}
                  </p>
                  {attribute.localizedDescription && (
                    <p
                      id={descriptionId}
                      className="mt-2 text-xs leading-5 text-muted-foreground"
                    >
                      {attribute.localizedDescription}
                    </p>
                  )}
                  {!attribute.isConsistent && (
                    <p className="mt-2 flex items-start gap-2 text-xs font-medium text-amber-800">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {dict.offerAttributeEditInconsistent}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      {attribute.dataType === "text" && (
                        <input
                          type="text"
                          value={value}
                          aria-describedby={
                            attribute.localizedDescription
                              ? descriptionId
                              : undefined
                          }
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "text",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        />
                      )}
                      {attribute.dataType === "number" && (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "number",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        />
                      )}
                      {attribute.dataType === "boolean" && (
                        <select
                          value={value}
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "boolean",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        >
                          <option value="">{dict.offerAttributeEditUnset}</option>
                          <option value="true">{dict.offerAttributeEditTrue}</option>
                          <option value="false">{dict.offerAttributeEditFalse}</option>
                        </select>
                      )}
                      {attribute.dataType === "date" && (
                        <input
                          type="date"
                          value={value}
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "date",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        />
                      )}
                      {attribute.dataType === "year" && (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={value}
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "year",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        />
                      )}
                      {attribute.dataType === "enum" && (
                        <select
                          value={value}
                          onChange={(event) =>
                            setScalarValue(
                              attribute.attributeId,
                              "enum",
                              event.target.value,
                            )
                          }
                          className="block h-11 w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
                        >
                          <option value="">{dict.offerAttributeEditUnset}</option>
                          {attribute.options.map((option) => (
                            <option key={option.optionId} value={option.optionId}>
                              {option.localizedLabel}
                            </option>
                          ))}
                        </select>
                      )}
                      {attribute.dataType === "multi_enum" && (
                        <div className="grid gap-2 border border-border-industrial p-3 sm:grid-cols-2">
                          {attribute.options.map((option) => (
                            <label
                              key={option.optionId}
                              className="flex min-h-10 items-start gap-3 p-2 text-sm text-brand-navy hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={isOptionChecked(
                                  attribute,
                                  option.optionId,
                                )}
                                onChange={(event) =>
                                  toggleOption(
                                    attribute,
                                    option.optionId,
                                    event.target.checked,
                                  )
                                }
                                className="mt-0.5 size-4 border-border-industrial text-brand-teal focus:ring-brand-teal"
                              />
                              <span>
                                <span className="font-medium">
                                  {option.localizedLabel}
                                </span>
                                {option.localizedDescription && (
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {option.localizedDescription}
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {valueIsSet && attribute.isConsistent && (
                      <button
                        type="button"
                        onClick={() => clearValue(attribute.attributeId)}
                        className="shrink-0 px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        {dict.offerAttributeEditClear}
                      </button>
                    )}
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : null}

      {model.attributes.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-border-industrial bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div aria-live="polite" className="min-h-5 text-sm font-medium">
            {saved && (
              <span className="inline-flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {dict.offerAttributeEditSuccess}
              </span>
            )}
            {errorCode && (
              <span className="inline-flex items-center gap-2 text-red-700">
                <AlertCircle className="size-4" aria-hidden="true" />
                {conflict
                  ? dict.offerAttributeEditConflict
                  : errorCode === "OFFER_NOT_EDITABLE_STATUS" ||
                      errorCode === "OFFER_NOT_FOUND"
                    ? dict.offerAttributeEditNotEditable
                    : errorCode === "ATTRIBUTE_PROVENANCE_LOCKED"
                      ? dict.offerAttributeEditProvenanceLocked
                      : errorCode === "ATTRIBUTE_STORAGE_INCONSISTENT"
                        ? dict.offerAttributeEditConfigurationHint
                        : validationError
                          ? dict.offerAttributeEditValidation
                          : dict.offerAttributeEditError}
              </span>
            )}
            {conflict && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ml-3 text-xs font-semibold text-red-800 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {dict.offerEditRefresh}
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending || Object.keys(mutations).length === 0}
            className="inline-flex min-h-11 items-center justify-center bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 size-4" aria-hidden="true" />
            )}
            {isPending
              ? dict.offerAttributeEditSaving
              : dict.offerAttributeEditSave}
          </button>
        </div>
      )}
    </fieldset>
    </form>
  );
}
