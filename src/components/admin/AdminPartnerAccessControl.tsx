"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantAdminPartnerAccess, revokeAdminPartnerAccess } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

type Labels = Dictionary["partnerAccess"];
type Membership = {
  authUserId: string;
  membershipStatus: string;
  canAcceptOrders: boolean;
  createdAt: string;
  revokedAt: string | null;
};

const inputClass = "min-h-11 w-full border border-border-industrial bg-white px-3 py-2 text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";

export function AdminPartnerAccessControl({
  partnerId, memberships, dict,
}: {
  partnerId: number;
  memberships: Membership[];
  dict: Labels;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const existing = memberships.find(m => m.authUserId.toLowerCase() === userId.trim().toLowerCase());
  const expectedStatus = existing?.membershipStatus === "revoked" ? "revoked" : "none";
  const messages: Record<string, string> = {
    INVALID_INPUT: dict.invalid, CONFLICT: dict.conflict,
    PARTNER_NOT_FOUND: dict.partnerNotFound,
    ACCOUNT_UNAVAILABLE: dict.accountUnavailable,
    IDENTITY_NOT_VERIFIED: dict.identityNotVerified,
    SYSTEM_ERROR: dict.systemError,
  };

  function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorityConfirmed || pending) return;
    if (existing?.membershipStatus === "active") {
      setFeedback({ error: true, text: dict.conflict });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await grantAdminPartnerAccess({
          partnerId, authUserId: userId.trim(), email: email.trim(), expectedStatus,
        });
        setFeedback({ error: !result.ok, text: result.ok ? dict.granted : messages[result.code] ?? dict.systemError });
        if (result.ok) {
          setUserId("");
          setEmail("");
          setAuthorityConfirmed(false);
          router.refresh();
        }
      } catch {
        setFeedback({ error: true, text: dict.systemError });
      }
    });
  }

  function revoke(authUserId: string) {
    if (pending || !window.confirm(dict.confirmRevoke)) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await revokeAdminPartnerAccess({
          partnerId, authUserId, expectedStatus: "active",
        });
        setFeedback({ error: !result.ok, text: result.ok ? dict.revokedSuccess : messages[result.code] ?? dict.systemError });
        if (result.ok) router.refresh();
      } catch {
        setFeedback({ error: true, text: dict.systemError });
      }
    });
  }

  return (
    <section className="border border-border-industrial bg-white shadow-soft" aria-labelledby="partner-access-heading">
      <div className="border-b border-border-industrial bg-brand-light-gray/30 px-5 py-4">
        <h2 id="partner-access-heading" className="text-lg font-semibold text-brand-navy">{dict.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dict.description}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <form onSubmit={grant} className="space-y-4" aria-busy={pending}>
          <div className="space-y-1">
            <label htmlFor="access-auth-id" className="block text-sm font-medium text-brand-navy">{dict.userId}</label>
            <input id="access-auth-id" name="authUserId" required autoComplete="off" maxLength={36}
              value={userId} onChange={e => setUserId(e.target.value)} className={inputClass} disabled={pending}/>
          </div>
          <div className="space-y-1">
            <label htmlFor="access-email" className="block text-sm font-medium text-brand-navy">{dict.email}</label>
            <input id="access-email" name="email" type="email" required autoComplete="off" maxLength={254}
              value={email} onChange={e => setEmail(e.target.value)} className={inputClass} disabled={pending}/>
          </div>
          <p className="border-l-4 border-brand-teal bg-brand-light-gray/40 p-3 text-sm text-brand-navy">{dict.authorityNotice}</p>
          <label className="flex items-start gap-3 text-sm text-brand-navy">
            <input name="authorityConfirmed" type="checkbox" required checked={authorityConfirmed}
              onChange={e => setAuthorityConfirmed(e.target.checked)} disabled={pending}
              className="mt-1 size-4 accent-brand-teal"/>
            <span>{dict.confirmAuthority}</span>
          </label>
          <button type="submit" disabled={pending || !authorityConfirmed}
            className="min-h-11 bg-brand-navy px-6 py-2 font-semibold text-white hover:bg-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:opacity-50">
            {pending ? dict.pending : expectedStatus === "revoked" ? dict.reactivate : dict.grant}
          </button>
        </form>
        <div>
          <h3 className="font-semibold text-brand-navy">{dict.members}</h3>
          {memberships.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{dict.noMembers}</p> : (
            <ul className="mt-3 space-y-3">
              {memberships.map(member => (
                <li key={member.authUserId} className="space-y-2 border border-border-industrial p-3">
                  <p className="break-all font-mono text-xs text-brand-navy">{member.authUserId}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-brand-navy">
                      {member.membershipStatus === "active" ? dict.active : dict.revoked}
                    </span>
                    {member.membershipStatus === "active" && (
                      <button type="button" disabled={pending} onClick={() => revoke(member.authUserId)}
                        className="min-h-11 border border-red-700 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50">
                        {dict.revoke}
                      </button>
                    )}
                  </div>
                  {!member.canAcceptOrders && <p className="text-xs text-muted-foreground">{dict.ordersDisabled}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {feedback && (
        <p role={feedback.error ? "alert" : "status"} className={`mx-5 mb-5 border p-3 text-sm ${feedback.error ? "border-red-300 text-red-800" : "border-brand-teal text-brand-navy"}`}>
          {feedback.text}
        </p>
      )}
    </section>
  );
}
