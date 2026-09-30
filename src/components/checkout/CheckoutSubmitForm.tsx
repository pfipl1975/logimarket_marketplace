"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitMarketplaceCheckout } from "@/app/checkout-actions";
import type { PublicCheckoutCode, PublicCheckoutResult } from "@/lib/checkout/public-checkout-core";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

const initialState: PublicCheckoutResult = { code: "IDLE" };

function SubmitButton({ labels }: { labels: Dictionary["checkoutFlow"] }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-12 w-full rounded-md bg-brand-teal px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
    {pending ? labels.submitting : labels.submit}
  </button>;
}

export function CheckoutSubmitForm({ locale, labels, accountHref, loginHref }: {
  locale: Locale;
  labels: Dictionary["checkoutFlow"];
  accountHref: string;
  loginHref: string;
}) {
  const [state, action] = useActionState(submitMarketplaceCheckout, initialState);
  const messages: Partial<Record<PublicCheckoutCode, string>> = {
    AUTH_REQUIRED: labels.authRequired,
    BUYER_PROFILE_REQUIRED: labels.buyerProfileRequired,
    ORGANIZATION_SELECTION_REQUIRED: labels.organizationSelectionRequired,
    BUYER_NOT_READY: labels.buyerNotReady,
    BUYER_ACCOUNT_UNAVAILABLE: labels.unavailable,
    CHECKOUT_VALIDATION_ERROR: labels.invalidMessage,
    CHECKOUT_CART_EMPTY: labels.cartEmpty,
    CHECKOUT_CART_CHANGED: labels.cartChanged,
    CHECKOUT_BUYER_NOT_READY: labels.buyerNotReady,
    CHECKOUT_SELLER_NOT_READY: labels.sellerNotReady,
    SYSTEM_ERROR: labels.unavailable,
  };
  const message = messages[state.code];
  return <form action={action} className="space-y-4">
    <input type="hidden" name="locale" value={locale} />
    <div>
      <label htmlFor="checkout-message" className="block text-sm font-semibold text-brand-navy">{labels.message}</label>
      <textarea id="checkout-message" name="message" maxLength={2000} rows={3} placeholder={labels.messagePlaceholder}
        className="mt-2 w-full rounded-md border border-[#9aa8b7] bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal" />
      <p className="mt-1 text-xs text-[#52606d]">{labels.messageHint}</p>
    </div>
    <p className="border-l-4 border-brand-teal bg-brand-light-gray px-4 py-3 text-sm leading-6 text-brand-navy">{labels.e2Notice}</p>
    <div aria-live="assertive" className="min-h-6 text-sm text-red-700">
      {message && <p role="alert">{message} {state.code === "AUTH_REQUIRED" ? <Link href={loginHref} className="underline">{labels.signIn}</Link> : state.code === "BUYER_PROFILE_REQUIRED" ? <Link href={accountHref} className="underline">{labels.completeProfile}</Link> : null}</p>}
    </div>
    <SubmitButton labels={labels} />
  </form>;
}
