"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { accountLocale } from "@/lib/auth/account-paths";
import { buyerAccountPath } from "@/lib/buyer-account/paths";
import { parseBuyerOnboardingInput } from "@/lib/buyer-account/core";
import { createFirstBuyerOrganization } from "@/lib/buyer-account/service";

export type BuyerOnboardingActionState = {
  code: "IDLE" | "INVALID_LEGAL_NAME" | "INVALID_NIP" | "INVALID_STREET" | "INVALID_BUILDING_NUMBER"
    | "INVALID_UNIT_NUMBER" | "INVALID_POSTAL_CODE" | "INVALID_CITY" | "INVALID_FIRST_NAME"
    | "INVALID_LAST_NAME" | "INVALID_CONTACT_EMAIL" | "INVALID_PHONE" | "AUTH_REQUIRED"
    | "UNAVAILABLE" | "ALREADY_HAS_ORGANIZATION" | "BUYER_ORGANIZATION_NIP_ALREADY_EXISTS";
};

export async function submitFirstBuyerOrganization(
  _previous: BuyerOnboardingActionState,
  form: FormData,
): Promise<BuyerOnboardingActionState> {
  const parsed = parseBuyerOnboardingInput({
    legalName: form.get("legalName"), nip: form.get("nip"),
    street: form.get("street"), buildingNumber: form.get("buildingNumber"), unitNumber: form.get("unitNumber"),
    postalCode: form.get("postalCode"), city: form.get("city"),
    firstName: form.get("firstName"), lastName: form.get("lastName"),
    contactEmail: form.get("contactEmail"), phone: form.get("phone"),
  });
  if (!parsed.ok) return { code: parsed.code };
  const locale = accountLocale(form.get("locale")?.toString());
  let current: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    current = await getCurrentUser();
  } catch {
    return { code: "UNAVAILABLE" };
  }
  if (current.status === "unauthenticated") return { code: "AUTH_REQUIRED" };
  if (current.status === "unavailable") return { code: "UNAVAILABLE" };

  try {
    const result = await createFirstBuyerOrganization(current.user.id, parsed.value);
    if (result !== "CREATED") return { code: result };
  } catch {
    return { code: "UNAVAILABLE" };
  }
  const path = buyerAccountPath(locale);
  revalidatePath(path);
  redirect(`${path}?created=1`);
}
