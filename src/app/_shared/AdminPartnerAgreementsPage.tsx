import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminAgreementVersions } from "@/lib/admin/agreement-version-read-model";
import { AdminAgreementVersionManager } from "@/components/admin/AdminAgreementVersionManager";
import { createAdminAgreementVersionAction, activateAdminAgreementVersionAction } from "@/app/actions";

export async function AdminPartnerAgreementsPage({ locale }: { locale: Locale }) {
  await requireAdmin();

  const dict = await getDictionary(locale);
  const adminDict = dict.adminPartnerAgreements;
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const data = await getAdminAgreementVersions(db);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{adminDict.pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{adminDict.pageDescription}</p>
      </div>

      <AdminAgreementVersionManager
        locale={locale}
        activeVersion={data.activeVersion}
        versions={data.versions}
        hasActiveVersion={data.hasActiveVersion}
        dict={adminDict}
        createAction={createAdminAgreementVersionAction}
        activateAction={activateAdminAgreementVersionAction}
      />
    </div>
  );
}
