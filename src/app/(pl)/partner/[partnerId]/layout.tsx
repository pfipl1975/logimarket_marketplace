import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { PartnerWorkspaceShell } from "@/app/_shared/partner/PartnerWorkspaceShell";
import { notFound } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/authorization-errors";
import { db } from "@/lib/db";
import { partners } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getDictionary } from "@/lib/i18n/dictionaries";

import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);

  try {
    await requirePartnerMembership(parsedPartnerId);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      notFound(); // Return 404 to avoid enumerating partners
    }
    throw err;
  }

  let partnerName = "Partner Portal";
  const partnerResult = await db.select({ companyName: partners.companyName }).from(partners).where(eq(partners.id, parsedPartnerId)).limit(1);
  if (partnerResult.length > 0) {
    partnerName = partnerResult[0].companyName;
  }

  // hardcoded to PL here because this is the (pl) route
  const dict = await getDictionary("pl");

  return (
    <PartnerWorkspaceShell partnerId={partnerId} partnerName={partnerName} dict={dict.PartnerWorkspace}>
      {children}
    </PartnerWorkspaceShell>
  );
}
