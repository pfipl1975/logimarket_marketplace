import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { PartnerWorkspaceShell } from "@/app/_shared/partner/PartnerWorkspaceShell";
import { notFound } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/authorization-errors";

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const parsedPartnerId = parseInt(partnerId, 10);
  
  if (isNaN(parsedPartnerId)) {
    notFound();
  }

  try {
    await requirePartnerMembership(parsedPartnerId);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      notFound(); // Return 404 to avoid enumerating partners
    }
    throw err;
  }

  return (
    <PartnerWorkspaceShell partnerId={partnerId}>
      {children}
    </PartnerWorkspaceShell>
  );
}
