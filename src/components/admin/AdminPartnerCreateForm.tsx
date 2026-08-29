"use client";
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminPartner } from '@/app/actions';
import type { Dictionary } from '@/lib/i18n/types';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function AdminPartnerCreateForm({
  dict,
  cancelUrl,
  successRedirectBase
}: {
  dict: NonNullable<Dictionary['adminPartnerCreate']>;
  cancelUrl: string;
  successRedirectBase: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const companyName = formData.get('companyName');
    const contactEmail = formData.get('contactEmail');
    const websiteUrl = formData.get('websiteUrl');

    startTransition(async () => {
      const res = await createAdminPartner({
        companyName,
        contactEmail,
        websiteUrl
      });

      if (!res.ok) {
        if (res.reason === 'PARTNER_INVALID_INPUT') {
          const issue = res.errors.issues[0];
          if (issue?.message === 'INVALID_EMAIL') {
             setErrorMsg(dict.invalidEmail || dict.errorDescription);
          } else if (issue?.message === 'INVALID_WEBSITE') {
             setErrorMsg(dict.invalidWebsite || dict.errorDescription);
          } else {
             setErrorMsg(issue?.message || dict.errorDescription);
          }
        } else {
          setErrorMsg(dict.errorDescription);
        }
        return;
      }

      router.push(`${successRedirectBase}/${res.partnerId}`);
      router.refresh();
    });
  };

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="bg-white border border-border-industrial rounded-industrial shadow-soft p-6 space-y-6">
        
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-industrial text-sm">
            <p className="font-semibold mb-1">{dict.errorTitle}</p>
            <p>{errorMsg}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-brand-navy mb-1">
              {dict.companyNameLabel}
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-brand-navy mb-1">
              {dict.contactEmailLabel}
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              required
              maxLength={100}
              className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-brand-navy mb-1">
              {dict.websiteUrlLabel}
            </label>
            <input
              type="url"
              id="websiteUrl"
              name="websiteUrl"
              maxLength={512}
              className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border-industrial">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-brand-navy hover:bg-brand-teal text-white rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {dict.creating}
              </>
            ) : (
              dict.submitButton
            )}
          </button>
          
          <Link
            href={cancelUrl}
            className="px-6 py-2 bg-white hover:bg-brand-light-gray text-brand-navy border border-border-industrial rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50"
            aria-disabled={isPending}
            onClick={(e) => isPending && e.preventDefault()}
          >
            {dict.cancelButton}
          </Link>
        </div>

      </form>
    </div>
  );
}
