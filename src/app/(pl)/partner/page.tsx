import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { partnerUserMemberships, partners } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export default async function PartnerEntryPage() {
  const result = await getCurrentUser();
  if (result.status !== "authenticated") {
    redirect("/login?next=/partner");
  }

  const memberships = await db
    .select({
      partnerId: partnerUserMemberships.partnerId,
      companyName: partners.companyName
    })
    .from(partnerUserMemberships)
    .innerJoin(partners, eq(partnerUserMemberships.partnerId, partners.id))
    .where(
      and(
        eq(partnerUserMemberships.authUserId, result.user.id),
        eq(partnerUserMemberships.membershipStatus, "active")
      )
    );

  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-navy mb-4">Brak dostępu</h1>
        <p className="text-muted-foreground">
          Nie posiadasz aktywnych przypisań do żadnego Partnera. Skontaktuj się z administratorem.
        </p>
      </div>
    );
  }

  if (memberships.length === 1) {
    redirect(`/partner/${memberships[0].partnerId}/zamowienia`);
  }

  // Selector for > 1
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Wybierz profil Partnera</h1>
      <div className="grid gap-4 w-full max-w-md">
        {memberships.map((m) => (
          <a
            key={m.partnerId}
            href={`/partner/${m.partnerId}/zamowienia`}
            className="block p-4 border border-border-industrial rounded-industrial hover:border-brand-teal transition-colors text-center font-medium text-brand-navy"
          >
            {m.companyName}
          </a>
        ))}
      </div>
    </div>
  );
}
