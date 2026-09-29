"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountLocale, accountPath } from "@/lib/auth/account-paths";
import { accountLandingPath } from "@/lib/buyer-account/paths";
import { emailSchema, validateNewPassword, type AccountActionResult } from "@/lib/auth/account-lifecycle-core";
import { trustedAccountCallbackUrl } from "@/lib/auth/account-origin";

const unavailable: AccountActionResult = { code: "AUTH_UNAVAILABLE" };
const checkEmail: AccountActionResult = { code: "CHECK_EMAIL" };

function providerUnavailable(error: { status?: number; code?: string } | null): boolean {
  return !!error && ((error.status ?? 0) >= 500 || error.code === "unexpected_failure" || error.code === "request_timeout");
}

export async function registerAccount(_previous: AccountActionResult, form: FormData): Promise<AccountActionResult> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { code: "INVALID_EMAIL" };
  const password = form.get("password");
  const confirmation = form.get("confirmation");
  const passwordError = validateNewPassword(password, confirmation);
  if (passwordError) return { code: passwordError };

  const locale = accountLocale(form.get("locale")?.toString());
  const next = accountLandingPath(form.get("next")?.toString(), locale);
  const emailRedirectTo = trustedAccountCallbackUrl({ flow: "signup", locale, next });
  if (!emailRedirectTo) return unavailable;
  const supabase = await createClient();
  if (!supabase) return unavailable;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password as string,
      options: { emailRedirectTo },
    });
    if (providerUnavailable(error)) return unavailable;
    // A project without confirmation enabled may return a session immediately.
    // Do not turn registration into an implicit login.
    if (data?.session) await supabase.auth.signOut({ scope: "local" });
    return checkEmail;
  } catch {
    return unavailable;
  }
}

export async function requestPasswordRecovery(_previous: AccountActionResult, form: FormData): Promise<AccountActionResult> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { code: "INVALID_EMAIL" };
  const locale = accountLocale(form.get("locale")?.toString());
  const redirectTo = trustedAccountCallbackUrl({ flow: "recovery", locale });
  if (!redirectTo) return unavailable;
  const supabase = await createClient();
  if (!supabase) return unavailable;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo });
    return providerUnavailable(error) ? unavailable : checkEmail;
  } catch {
    return unavailable;
  }
}

export async function updateAccountPassword(_previous: AccountActionResult, form: FormData): Promise<AccountActionResult> {
  const password = form.get("password");
  const confirmation = form.get("confirmation");
  const passwordError = validateNewPassword(password, confirmation);
  if (passwordError) return { code: passwordError };
  const locale = accountLocale(form.get("locale")?.toString());
  const cookieStore = await cookies();
  const supabase = await createClient();
  if (!supabase) return unavailable;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || cookieStore.get("lm-recovery-user")?.value !== user.id) return { code: "INVALID_LINK" };
    const { error } = await supabase.auth.updateUser({ password: password as string });
    if (error) return unavailable;
    cookieStore.delete("lm-recovery-user");
    // Global scope revokes refresh tokens on other devices and ends this recovery session.
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) return unavailable;
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect(`${accountPath(locale, "login")}?passwordUpdated=1`);
}
