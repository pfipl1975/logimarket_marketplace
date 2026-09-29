import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountLifecycleForm } from "@/components/auth/AccountLifecycleForm";
import { getCurrentUser } from "@/lib/auth/session";
import { accountPath } from "@/lib/auth/account-paths";
import { accountLandingPath } from "@/lib/buyer-account/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type Kind = "register" | "forgot-password" | "reset-password";

export async function AccountLifecyclePage({ kind, locale, next }: { kind: Kind; locale: Locale; next: string | null }) {
  const user = await getCurrentUser();
  if (kind !== "reset-password" && user.status === "authenticated") redirect(accountLandingPath(next, locale));
  const labels = (await getDictionary(locale)).auth;
  const copy = labels.account;
  const validRecovery = kind === "reset-password" && user.status === "authenticated" &&
    (await cookies()).get("lm-recovery-user")?.value === user.user.id;
  const title = kind === "register" ? copy.registerTitle : kind === "forgot-password" ? copy.forgotTitle : copy.resetTitle;

  return <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
    <h1 className="mb-6 text-center text-3xl font-bold text-primary">{title}</h1>
    <div className="rounded-industrial border border-border-industrial bg-card px-4 py-8 sm:px-8">
      {kind === "reset-password" && !validRecovery
        ? <div className="space-y-4 text-center" role="alert"><p className="text-primary">{copy.invalidLink}</p><Link className="inline-flex rounded-button bg-brand-navy px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountPath(locale, "forgot-password")}>{copy.newRecoveryLink}</Link></div>
        : <AccountLifecycleForm kind={kind} locale={locale} labels={labels} next={next} />}
    </div>
  </main>;
}
