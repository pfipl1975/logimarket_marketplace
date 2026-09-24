"use client";

import { useTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgreementVersionReadDto } from "@/lib/admin/agreement-version-read-model";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { Loader2 } from "lucide-react";

type ResultType =
  | "AGREEMENT_VERSION_CREATED"
  | "AGREEMENT_VERSION_ACTIVATED"
  | "INVALID_INPUT"
  | "VERSION_ALREADY_EXISTS"
  | "TEMPLATE_HASH_ALREADY_EXISTS"
  | "AGREEMENT_VERSION_NOT_FOUND"
  | "INVALID_AGREEMENT_TYPE"
  | "AGREEMENT_VERSION_NOT_DRAFT"
  | "ACTIVE_VERSION_ALREADY_EXISTS"
  | "SYSTEM_ERROR";

interface AdminAgreementVersionManagerProps {
  locale: Locale;
  activeVersion: AgreementVersionReadDto | null;
  versions: AgreementVersionReadDto[];
  hasActiveVersion: boolean;
  dict: Dictionary["adminPartnerAgreements"];
  createAction: (input: unknown) => Promise<{ type: ResultType; issues?: unknown }>;
  activateAction: (input: unknown) => Promise<{ type: ResultType; issues?: unknown }>;
}

export function AdminAgreementVersionManager({
  locale,
  activeVersion,
  versions,
  hasActiveVersion,
  dict,
  createAction,
  activateAction
}: AdminAgreementVersionManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [formFeedback, setFormFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [listFeedback, setListFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getDomainErrorMessage = (type: ResultType): string => {
    switch (type) {
      case "INVALID_INPUT": return dict.errorInvalidInput;
      case "VERSION_ALREADY_EXISTS": return dict.errorVersionExists;
      case "TEMPLATE_HASH_ALREADY_EXISTS": return dict.errorHashExists;
      case "AGREEMENT_VERSION_NOT_FOUND": return dict.errorNotFound;
      case "INVALID_AGREEMENT_TYPE": return dict.errorInvalidType;
      case "AGREEMENT_VERSION_NOT_DRAFT": return dict.errorNotDraft;
      case "ACTIVE_VERSION_ALREADY_EXISTS": return dict.errorActiveExists;
      default: return dict.errorSystem;
    }
  };

  const handleCreate = async (formData: FormData) => {
    setFormFeedback(null);
    const version = formData.get("version") as string;
    const hash = formData.get("canonicalTemplateHashSha256") as string;

    startTransition(async () => {
      const res = await createAction({ version, canonicalTemplateHashSha256: hash });
      if (res.type === "AGREEMENT_VERSION_CREATED") {
        setFormFeedback({ type: "success", message: dict.createSuccess });
        formRef.current?.reset();
        router.refresh();
      } else {
        setFormFeedback({ type: "error", message: getDomainErrorMessage(res.type) });
      }
    });
  };

  const handleActivate = async (id: number) => {
    setListFeedback(null);
    startTransition(async () => {
      const res = await activateAction({ agreementVersionId: id });
      if (res.type === "AGREEMENT_VERSION_ACTIVATED") {
        setListFeedback({ type: "success", message: dict.activateSuccess });
        router.refresh();
      } else {
        setListFeedback({ type: "error", message: getDomainErrorMessage(res.type) });
      }
    });
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "-";
    return new Date(isoStr).toLocaleString(locale);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'draft': return dict.statusDraft;
      case 'active': return dict.statusActive;
      case 'superseded': return dict.statusSuperseded;
      case 'archived': return dict.statusArchived;
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="active-agreement-version-heading" className="bg-white border border-border-industrial rounded-industrial p-6 shadow-sm">
        <h2 id="active-agreement-version-heading" className="text-xl font-bold mb-4">{dict.statusActive}</h2>
        {activeVersion ? (
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-muted-foreground inline">{dict.versionLabel}:</dt> <dd className="font-medium inline">{activeVersion.version}</dd></div>
            <div><dt className="text-muted-foreground inline">{dict.statusActive}:</dt> <dd className="font-medium text-green-600 uppercase text-sm tracking-wider inline">{renderStatus(activeVersion.status)}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground inline">{dict.hashLabel}:</dt> <dd className="font-mono text-sm inline">{activeVersion.canonicalTemplateHashSha256}</dd></div>
            <div><dt className="text-muted-foreground inline">{dict.effectiveFromCol}:</dt> <dd data-testid="effective-from" className="inline ml-1">{formatDate(activeVersion.effectiveFrom)}</dd></div>
            <div><dt className="text-muted-foreground inline">{dict.publishedAtCol}:</dt> <dd data-testid="published-at" className="inline ml-1">{formatDate(activeVersion.publishedAt)}</dd></div>
          </dl>
        ) : (
          <div className="text-destructive font-medium border border-destructive/20 bg-destructive/5 p-4 rounded-industrial">
            {dict.noActiveAgreementWarning}
          </div>
        )}
      </section>

      <div className="bg-white border border-border-industrial rounded-industrial p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">{dict.createDraftHeader}</h2>
        {formFeedback && (
          <div role={formFeedback.type === "error" ? "alert" : "status"} className={`mb-4 p-3 rounded-industrial text-sm font-medium border ${formFeedback.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-50 text-green-700 border-green-200"}`}>
            {formFeedback.message}
          </div>
        )}
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="version" className="text-sm font-medium">{dict.versionLabel}</label>
            <input
              id="version"
              name="version"
              type="text"
              placeholder="v1.0"
              required
              disabled={isPending}
              className="border border-input rounded-industrial px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="hash" className="text-sm font-medium">{dict.hashLabel}</label>
            <input
              id="hash"
              name="canonicalTemplateHashSha256"
              type="text"
              required
              disabled={isPending}
              className="border border-input rounded-industrial px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90 px-4 py-2 rounded-industrial text-sm font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.createAction}
          </button>
        </form>
      </div>

      <div className="bg-white border border-border-industrial rounded-industrial p-6 shadow-sm overflow-hidden">
        <h2 className="text-xl font-bold mb-4">{dict.historyHeader}</h2>
        {listFeedback && (
          <div role={listFeedback.type === "error" ? "alert" : "status"} className={`mb-4 p-3 rounded-industrial text-sm font-medium border ${listFeedback.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-50 text-green-700 border-green-200"}`}>
            {listFeedback.message}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground border-b border-border-industrial">
              <tr>
                <th className="py-3 px-4 font-medium">{dict.versionLabel}</th>
                <th className="py-3 px-4 font-medium">{dict.statusCol}</th>
                <th className="py-3 px-4 font-medium">{dict.hashLabel}</th>
                <th className="py-3 px-4 font-medium">{dict.createdCol}</th>
                <th className="py-3 px-4 font-medium">{dict.effectiveFromCol}</th>
                <th className="py-3 px-4 font-medium">{dict.effectiveToCol}</th>
                <th className="py-3 px-4 font-medium">{dict.publishedAtCol}</th>
                <th className="py-3 px-4 font-medium text-right">{dict.actionCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-industrial">
              {versions.map(v => (
                <tr key={v.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium">{v.version}</td>
                  <td className="py-3 px-4">
                    <span className={`uppercase text-xs tracking-wider font-bold ${v.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {renderStatus(v.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs max-w-[200px] truncate" title={v.canonicalTemplateHashSha256}>
                    {v.canonicalTemplateHashSha256.substring(0, 16)}...
                  </td>
                  <td className="py-3 px-4">{formatDate(v.createdAt)}</td>
                  <td className="py-3 px-4">{formatDate(v.effectiveFrom)}</td>
                  <td className="py-3 px-4">{formatDate(v.effectiveTo)}</td>
                  <td className="py-3 px-4">{formatDate(v.publishedAt)}</td>
                  <td className="py-3 px-4 text-right">
                    {v.status === "draft" && (
                      <div className="inline-block">
                        <button
                          onClick={() => handleActivate(v.id)}
                          disabled={isPending || hasActiveVersion}
                          aria-describedby={hasActiveVersion ? `tooltip-${v.id}` : undefined}
                          className="bg-brand-navy text-primary-foreground hover:bg-brand-navy/90 px-3 py-1.5 rounded-industrial text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                        >
                          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                          {dict.activateAction}
                        </button>
                        {hasActiveVersion && (
                          <p id={`tooltip-${v.id}`} className="text-xs text-destructive mt-1 max-w-[200px] text-right ml-auto">
                            {dict.activeAgreementAlreadyExistsWarning}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">{dict.noVersions}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
