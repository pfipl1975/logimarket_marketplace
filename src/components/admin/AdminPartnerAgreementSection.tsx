"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registerPartnerAgreementEvidenceAction,
  invalidatePartnerAgreementEvidenceAction,
} from "@/app/actions";
import {
  parseLocalDatetimeToUtcIso,
  type RecordedEvidenceDto,
} from "@/lib/legal/partner-agreement-core";
import {
  FileCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

export type AdminPartnerAgreementSectionProps = {
  partnerId: number;
  agreementEvidence: {
    hasActiveVersion: boolean;
    activeVersion: {
      id: number;
      version: string;
      agreementType: string;
      canonicalTemplateHashSha256: string;
      effectiveFrom: string | null;
      publishedAt: string | null;
    } | null;
    hasRecordedEvidence: boolean;
    evidence: RecordedEvidenceDto[];
  };
  dictionary: {
    agreementSection: string;
    agreementNoActiveVersion: string;
    agreementActiveVersionLabel: string;
    agreementNoEvidence: string;
    agreementStatusAccepted: string;
    agreementStatusInvalidated: string;
    agreementVersionLabel: string;
    agreementSignedAtLabel: string;
    agreementSignatoryLabel: string;
    agreementRoleLabel: string;
    agreementEmailLabel: string;
    agreementExecutionMethodLabel: string;
    agreementExecutionMethodPlatform: string;
    agreementExecutionMethodQualified: string;
    agreementExecutionMethodAdvanced: string;
    agreementAdminLabel: string;
    agreementSha256FormatTitle: string;
    agreementReasonRequired: string;
    agreementRegisterErrorDefault: string;
    agreementInvalidateErrorDefault: string;
    agreementErrorUnauthorized?: string;
    agreementErrorValidation?: string;
    agreementErrorFutureDate?: string;
    agreementErrorBeforeEffectiveFrom?: string;
    agreementErrorBeforePublishedAt?: string;
    agreementErrorAfterEffectiveTo?: string;
    agreementErrorDuplicateTx?: string;
    agreementErrorVersionNotActive?: string;
    agreementErrorPartnerNotFound?: string;
    agreementErrorAlreadyInvalidated?: string;
    agreementErrorSystem?: string;
    agreementPlatformLabel: string;
    agreementExternalTxLabel: string;
    agreementSha256Label: string;
    agreementRecordedAtLabel: string;
    agreementRecordedByLabel: string;
    agreementInvalidatedAtLabel: string;
    agreementInvalidatedByLabel: string;
    agreementInvalidationReasonLabel: string;
    agreementInvalidateAction: string;
    agreementInvalidateDialogTitle: string;
    agreementInvalidateDialogDescription: string;
    agreementInvalidateReasonPlaceholder: string;
    agreementInvalidateConfirmAction: string;
    agreementCancelAction: string;
    agreementRegisterSection: string;
    agreementRegisterRequiresActiveVersion: string;
    agreementSignatoryNamePlaceholder: string;
    agreementSignatoryRolePlaceholder: string;
    agreementSignatoryEmailPlaceholder: string;
    agreementExternalPlatformPlaceholder: string;
    agreementExternalTxPlaceholder: string;
    agreementSha256Placeholder: string;
    agreementRegisterSubmitAction: string;
    agreementRegisterSuccess: string;
    agreementInvalidateSuccess: string;
  };
  locale: string;
  emptyValue: string;
};

export function AdminPartnerAgreementSection({
  partnerId,
  agreementEvidence,
  dictionary,
  locale,
  emptyValue,
}: AdminPartnerAgreementSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Registration form state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    signedAt: "",
    signatoryName: "",
    signatoryRole: "",
    signatoryEmail: "",
    executionMethod: "platform_documentary_electronic",
    externalPlatform: "",
    externalTransactionId: "",
    signedPdfSha256: "",
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  // Invalidation state
  const [invalidatingEvidenceId, setInvalidatingEvidenceId] = useState<number | null>(null);
  const [invalidationReason, setInvalidationReason] = useState("");
  const [invalidationError, setInvalidationError] = useState<string | null>(null);
  const [invalidationSuccess, setInvalidationSuccess] = useState<string | null>(null);

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return emptyValue;
    return new Date(isoStr).toLocaleString(locale);
  };

  const getErrorMessage = (code: string | undefined, fallback: string) => {
    switch (code) {
      case "UNAUTHORIZED_ADMIN":
        return dictionary.agreementErrorUnauthorized || fallback;
      case "VALIDATION_ERROR":
        return dictionary.agreementErrorValidation || fallback;
      case "INVALID_SIGNED_AT_FUTURE":
        return dictionary.agreementErrorFutureDate || fallback;
      case "SIGNED_AT_BEFORE_EFFECTIVE_FROM":
        return dictionary.agreementErrorBeforeEffectiveFrom || fallback;
      case "SIGNED_AT_BEFORE_PUBLISHED_AT":
        return dictionary.agreementErrorBeforePublishedAt || fallback;
      case "SIGNED_AT_AFTER_EFFECTIVE_TO":
        return dictionary.agreementErrorAfterEffectiveTo || fallback;
      case "DUPLICATE_EXTERNAL_TRANSACTION":
        return dictionary.agreementErrorDuplicateTx || fallback;
      case "AGREEMENT_VERSION_NOT_ACTIVE":
      case "AGREEMENT_VERSION_NOT_FOUND":
      case "INVALID_AGREEMENT_TYPE":
        return dictionary.agreementErrorVersionNotActive || fallback;
      case "PARTNER_NOT_FOUND":
        return dictionary.agreementErrorPartnerNotFound || fallback;
      case "ALREADY_INVALIDATED":
        return dictionary.agreementErrorAlreadyInvalidated || fallback;
      case "SYSTEM_ERROR":
        return dictionary.agreementErrorSystem || fallback;
      default:
        return fallback;
    }
  };

  const getExecutionMethodLabel = (method: string) => {
    switch (method) {
      case "qualified_electronic_signature":
        return dictionary.agreementExecutionMethodQualified;
      case "advanced_electronic_signature":
        return dictionary.agreementExecutionMethodAdvanced;
      case "platform_documentary_electronic":
      default:
        return dictionary.agreementExecutionMethodPlatform;
    }
  };

  const handleRegisterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
    setRegisterError(null);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!agreementEvidence.activeVersion) {
      setRegisterError(dictionary.agreementRegisterRequiresActiveVersion);
      return;
    }

    const signedAtUtc = parseLocalDatetimeToUtcIso(registerForm.signedAt);
    if (!signedAtUtc) {
      setRegisterError(dictionary.agreementErrorValidation || dictionary.agreementRegisterErrorDefault);
      return;
    }

    setRegisterError(null);
    setRegisterSuccess(null);

    startTransition(async () => {
      const payload = {
        partnerId,
        agreementVersionId: agreementEvidence.activeVersion!.id,
        signedAt: signedAtUtc,
        signatoryName: registerForm.signatoryName.trim(),
        signatoryRole: registerForm.signatoryRole.trim(),
        signatoryEmail: registerForm.signatoryEmail.trim().toLowerCase(),
        executionMethod: registerForm.executionMethod as
          | "platform_documentary_electronic"
          | "qualified_electronic_signature"
          | "advanced_electronic_signature",
        externalPlatform: registerForm.externalPlatform.trim(),
        externalTransactionId: registerForm.externalTransactionId.trim(),
        signedPdfSha256: registerForm.signedPdfSha256.trim().toLowerCase(),
      };

      const res = await registerPartnerAgreementEvidenceAction(payload);
      if (res.ok) {
        setRegisterSuccess(dictionary.agreementRegisterSuccess);
        setRegisterForm({
          signedAt: "",
          signatoryName: "",
          signatoryRole: "",
          signatoryEmail: "",
          executionMethod: "platform_documentary_electronic",
          externalPlatform: "",
          externalTransactionId: "",
          signedPdfSha256: "",
        });
        setShowRegisterForm(false);
        router.refresh();
      } else {
        setRegisterError(getErrorMessage(res.code, res.message || dictionary.agreementRegisterErrorDefault));
      }
    });
  };

  const handleInvalidateSubmit = (evidenceId: number) => {
    if (isPending) return;
    if (!invalidationReason.trim()) {
      setInvalidationError(dictionary.agreementReasonRequired);
      return;
    }

    setInvalidationError(null);
    setInvalidationSuccess(null);

    startTransition(async () => {
      const res = await invalidatePartnerAgreementEvidenceAction({
        executionEvidenceId: evidenceId,
        reason: invalidationReason.trim(),
      });

      if (res.ok) {
        setInvalidationSuccess(dictionary.agreementInvalidateSuccess);
        setInvalidatingEvidenceId(null);
        setInvalidationReason("");
        router.refresh();
      } else {
        setInvalidationError(getErrorMessage(res.code, res.message || dictionary.agreementInvalidateErrorDefault));
      }
    });
  };

  const activeVersion = agreementEvidence.activeVersion;

  return (
    <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden h-fit sm:col-span-2">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-brand-teal" />
          <h2 className="font-medium text-brand-navy">{dictionary.agreementSection}</h2>
        </div>
        {activeVersion && (
          <button
            type="button"
            onClick={() => {
              setShowRegisterForm((prev) => !prev);
              setRegisterError(null);
              setRegisterSuccess(null);
            }}
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-industrial border border-brand-teal text-brand-teal hover:bg-brand-teal/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          >
            {showRegisterForm ? dictionary.agreementCancelAction : dictionary.agreementRegisterSection}
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Active Version Callout */}
        {!activeVersion ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-industrial text-amber-900 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{dictionary.agreementNoActiveVersion}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {dictionary.agreementRegisterRequiresActiveVersion}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-brand-light-gray/20 border border-border-industrial rounded-industrial text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-brand-navy">
                {dictionary.agreementActiveVersionLabel}:{" "}
              </span>
              <span className="font-mono font-medium text-brand-navy bg-white px-2 py-0.5 border border-border-industrial rounded text-xs">
                {activeVersion.version}
              </span>
              <div className="text-xs text-muted-foreground mt-1 font-mono break-all">
                {dictionary.agreementSha256Label}: {activeVersion.canonicalTemplateHashSha256}
              </div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(activeVersion.publishedAt)}
            </div>
          </div>
        )}

        {/* Global Action Feedbacks */}
        {registerSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{registerSuccess}</span>
          </div>
        )}
        {invalidationSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{invalidationSuccess}</span>
          </div>
        )}

        {/* Registration Form (Collapsible / Active) */}
        {showRegisterForm && activeVersion && (
          <form
            onSubmit={handleRegisterSubmit}
            className="p-5 border border-border-industrial rounded-industrial bg-brand-light-gray/10 space-y-4"
          >
            <h3 className="text-sm font-semibold text-brand-navy">
              {dictionary.agreementRegisterSection}
            </h3>

            {registerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{registerError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementSignedAtLabel} *
                </label>
                <input
                  type="datetime-local"
                  name="signedAt"
                  value={registerForm.signedAt}
                  onChange={handleRegisterChange}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementExecutionMethodLabel} *
                </label>
                <select
                  name="executionMethod"
                  value={registerForm.executionMethod}
                  onChange={handleRegisterChange}
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                >
                  <option value="platform_documentary_electronic">
                    {dictionary.agreementExecutionMethodPlatform}
                  </option>
                  <option value="qualified_electronic_signature">
                    {dictionary.agreementExecutionMethodQualified}
                  </option>
                  <option value="advanced_electronic_signature">
                    {dictionary.agreementExecutionMethodAdvanced}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementSignatoryLabel} *
                </label>
                <input
                  type="text"
                  name="signatoryName"
                  value={registerForm.signatoryName}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementSignatoryNamePlaceholder}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementRoleLabel} *
                </label>
                <input
                  type="text"
                  name="signatoryRole"
                  value={registerForm.signatoryRole}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementSignatoryRolePlaceholder}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementEmailLabel} *
                </label>
                <input
                  type="email"
                  name="signatoryEmail"
                  value={registerForm.signatoryEmail}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementSignatoryEmailPlaceholder}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementPlatformLabel} *
                </label>
                <input
                  type="text"
                  name="externalPlatform"
                  value={registerForm.externalPlatform}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementExternalPlatformPlaceholder}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementExternalTxLabel} *
                </label>
                <input
                  type="text"
                  name="externalTransactionId"
                  value={registerForm.externalTransactionId}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementExternalTxPlaceholder}
                  required
                  className="w-full text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-brand-navy mb-1">
                  {dictionary.agreementSha256Label} *
                </label>
                <input
                  type="text"
                  name="signedPdfSha256"
                  value={registerForm.signedPdfSha256}
                  onChange={handleRegisterChange}
                  placeholder={dictionary.agreementSha256Placeholder}
                  required
                  pattern="^[a-fA-F0-9]{64}$"
                  title={dictionary.agreementSha256FormatTitle}
                  className="w-full font-mono text-xs px-3 py-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegisterForm(false);
                  setRegisterError(null);
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-brand-navy transition-colors"
              >
                {dictionary.agreementCancelAction}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium rounded-industrial bg-brand-teal text-white hover:bg-brand-teal/90 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {dictionary.agreementRegisterSubmitAction}
              </button>
            </div>
          </form>
        )}

        {/* Evidence List */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {dictionary.agreementSection} — {agreementEvidence.evidence.length}
          </h3>

          {agreementEvidence.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {dictionary.agreementNoEvidence}
            </p>
          ) : (
            <div className="space-y-4">
              {agreementEvidence.evidence.map((ev) => {
                const isInvalidated = ev.isInvalidated;
                const isInvalidatingThis = invalidatingEvidenceId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`rounded-industrial border p-5 transition-colors ${
                      isInvalidated
                        ? "border-red-200 bg-red-50/20"
                        : "border-border-industrial bg-white"
                    }`}
                  >
                    {/* Top Row: Version & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-industrial/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-navy">
                          {dictionary.agreementVersionLabel}:
                        </span>
                        <span className="font-mono text-xs font-medium bg-brand-light-gray/60 px-2 py-0.5 rounded border border-border-industrial">
                          {ev.version}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {isInvalidated ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            {dictionary.agreementStatusInvalidated}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {dictionary.agreementStatusAccepted}
                          </span>
                        )}

                        {!isInvalidated && (
                          <button
                            type="button"
                            onClick={() => {
                              setInvalidatingEvidenceId(
                                isInvalidatingThis ? null : ev.id
                              );
                              setInvalidationReason("");
                              setInvalidationError(null);
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors underline"
                          >
                            {isInvalidatingThis
                              ? dictionary.agreementCancelAction
                              : dictionary.agreementInvalidateAction}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Evidence Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 pt-4 text-xs">
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementSignatoryLabel}
                        </p>
                        <p className="font-medium text-brand-navy">{ev.signatoryName}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {ev.signatoryRole} ({ev.signatoryEmail})
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementSignedAtLabel}
                        </p>
                        <p className="font-medium text-brand-navy">
                          {formatDate(ev.signedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementExecutionMethodLabel}
                        </p>
                        <p className="font-medium text-brand-navy">
                          {getExecutionMethodLabel(ev.executionMethod)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementPlatformLabel} / {dictionary.agreementExternalTxLabel}
                        </p>
                        <p className="font-medium text-brand-navy">
                          {ev.externalPlatform} &middot;{" "}
                          <span className="font-mono">{ev.externalTransactionId}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementRecordedAtLabel}
                        </p>
                        <p className="font-medium text-brand-navy">
                          {formatDate(ev.recordedAt)}
                        </p>
                        <p className="text-muted-foreground text-[11px] font-mono">
                          {dictionary.agreementAdminLabel}: {ev.recordedByAdminUserId}
                        </p>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {dictionary.agreementSha256Label}
                        </p>
                        <p className="font-mono text-brand-navy break-all bg-brand-light-gray/30 p-1.5 rounded border border-border-industrial text-[11px]">
                          {ev.signedPdfSha256}
                        </p>
                      </div>
                    </div>

                    {/* Invalidation Details Block */}
                    {isInvalidated && ev.invalidation && (
                      <div className="mt-4 p-3 bg-red-100/50 border border-red-200 rounded text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-red-900 font-semibold">
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                          <span>{dictionary.agreementStatusInvalidated}</span>
                          <span className="text-muted-foreground font-normal">
                            &middot; {formatDate(ev.invalidation.invalidatedAt)}
                          </span>
                        </div>
                        <p className="text-brand-navy">
                          <span className="font-medium text-red-900">
                            {dictionary.agreementInvalidationReasonLabel}:
                          </span>{" "}
                          {ev.invalidation.reason}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {dictionary.agreementInvalidatedByLabel}: {ev.invalidation.invalidatedByAdminUserId}
                        </p>
                      </div>
                    )}

                    {/* Invalidation Form (When Triggered) */}
                    {isInvalidatingThis && !isInvalidated && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-industrial space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-red-900">
                            {dictionary.agreementInvalidateDialogTitle}
                          </h4>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            {dictionary.agreementInvalidateDialogDescription}
                          </p>
                        </div>

                        {invalidationError && (
                          <div className="p-2 bg-white border border-red-300 rounded text-xs text-red-800">
                            {invalidationError}
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-brand-navy mb-1">
                            {dictionary.agreementInvalidationReasonLabel} *
                          </label>
                          <textarea
                            rows={2}
                            value={invalidationReason}
                            onChange={(e) => {
                              setInvalidationReason(e.target.value);
                              setInvalidationError(null);
                            }}
                            placeholder={dictionary.agreementInvalidateReasonPlaceholder}
                            required
                            className="w-full text-xs p-2 border border-border-industrial rounded bg-white text-brand-navy focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInvalidatingEvidenceId(null);
                              setInvalidationReason("");
                              setInvalidationError(null);
                            }}
                            className="px-3 py-1 text-xs text-muted-foreground hover:text-brand-navy transition-colors"
                          >
                            {dictionary.agreementCancelAction}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleInvalidateSubmit(ev.id)}
                            className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            {dictionary.agreementInvalidateConfirmAction}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
