"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyAdminSellerIdentityAction } from "@/app/actions";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export type AdminSellerVerificationControlProps = {
  partnerId: number;
  subjectType: "legal_identity" | "tax_identifier" | "registry_identifier";
  subjectId?: number;
  currentStatus: string;
  dictionary: {
    verifySuccess: string;
    verifyErrorConflict: string;
    verifyErrorNotFound: string;
    verifyErrorSystem: string;
    verifyAction: string;
    sourceTypeLabel: string;
    sourceTypeAdminManual: string;
    sourceTypePublicRegistry: string;
    sourceTypePartnerDocument: string;
    sourceNameLabel: string;
    sourceNamePlaceholder: string;
    sourceReferenceLabel: string;
    sourceReferencePlaceholder: string;
    cancelAction: string;
  };
};

export function AdminSellerVerificationControl({
  partnerId,
  subjectType,
  subjectId,
  currentStatus,
  dictionary,
}: AdminSellerVerificationControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    sourceType: "admin_manual" as "admin_manual" | "public_registry_manual" | "partner_document",
    sourceName: "",
    sourceReference: "",
  });

  if (currentStatus === "verified") {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await verifyAdminSellerIdentityAction({
        partnerId,
        subjectType,
        subjectId,
        expectedStatus: currentStatus,
        sourceType: formData.sourceType,
        sourceName: formData.sourceName.trim(),
        sourceReference: formData.sourceReference.trim(),
      });

      if (result.ok) {
        setSuccess(dictionary.verifySuccess);
        setIsFormOpen(false);
        router.refresh();
      } else {
        if (result.code === "VERIFICATION_CONFLICT") {
          setError(dictionary.verifyErrorConflict);
        } else if (result.code === "SUBJECT_NOT_FOUND") {
          setError(dictionary.verifyErrorNotFound);
        } else {
          setError(dictionary.verifyErrorSystem);
        }
      }
    });
  };

  if (!isFormOpen) {
    return (
      <div className="mt-4">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-industrial text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-industrial text-sm text-green-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-navy text-white text-xs font-medium rounded-industrial hover:bg-brand-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {dictionary.verifyAction}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border border-border-industrial rounded-industrial bg-white shadow-sm">
      <h4 className="font-semibold text-brand-navy mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-navy" />
        {dictionary.verifyAction}
      </h4>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-industrial text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.sourceTypeLabel} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sourceType}
            onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as "admin_manual" | "public_registry_manual" | "partner_document" })}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            <option value="admin_manual">{dictionary.sourceTypeAdminManual}</option>
            <option value="public_registry_manual">{dictionary.sourceTypePublicRegistry}</option>
            <option value="partner_document">{dictionary.sourceTypePartnerDocument}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.sourceNameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={100}
            required
            value={formData.sourceName}
            onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
            disabled={isPending}
            placeholder={dictionary.sourceNamePlaceholder}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.sourceReferenceLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.sourceReference}
            onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
            disabled={isPending}
            placeholder={dictionary.sourceReferencePlaceholder}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-brand-navy font-medium transition-colors disabled:opacity-50"
          >
            {dictionary.cancelAction}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-industrial hover:bg-brand-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy disabled:opacity-50 transition-colors"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dictionary.verifyAction}
          </button>
        </div>
      </form>
    </div>
  );
}
