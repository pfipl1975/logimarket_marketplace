"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getExistingSessionHash } from "@/lib/session/session-hash";
import { resolveBuyerOrderIntentContext } from "@/lib/checkout/buyer-order-intent-resolver";
import { executeMarketplaceCheckout } from "@/lib/checkout/marketplace-checkout-core";
import { runPublicCheckout, type PublicCheckoutResult } from "@/lib/checkout/public-checkout-core";
import { accountLocale } from "@/lib/auth/account-paths";
import { buyerOrdersPath } from "@/lib/buyer-account/paths";

export async function submitMarketplaceCheckout(_previous: PublicCheckoutResult, form: FormData): Promise<PublicCheckoutResult> {
  const result = await runPublicCheckout(form.get("message"), {
    currentUser: getCurrentUser,
    sessionHash: getExistingSessionHash,
    resolveBuyer: resolveBuyerOrderIntentContext,
    execute: (sessionHash, context) => executeMarketplaceCheckout(db, sessionHash, context),
  });
  if (result.code !== "CHECKOUT_ORDER_CREATED") return result;
  const locale = accountLocale(form.get("locale")?.toString());
  revalidatePath(buyerOrdersPath(locale));
  revalidatePath("/", "layout");
  redirect(`${buyerOrdersPath(locale)}?submitted=1`);
}
