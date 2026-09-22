"use client";

import { useState } from "react";
import { verifyBuyerOrganizationFromAnyStatusAction, rejectBuyerOrganizationAction, revokeBuyerOrganizationAction } from "@/lib/buyer-trust/admin-actions";
import type { BuyerOrganizationVerificationStatus } from "@/lib/schema";

export function BuyerVerificationControls({
  organizationId,
  currentStatus,
  taxIdentifierId,
  registryIdentifierId,
}: {
  organizationId: number;
  currentStatus: BuyerOrganizationVerificationStatus;
  taxIdentifierId: number | null;
  registryIdentifierId: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [reasonCode, setReasonCode] = useState("");

  const handleVerify = async () => {
    if (!taxIdentifierId && !registryIdentifierId) {
      alert("Cannot verify without at least one identifier (Tax or Registry)");
      return;
    }

    setLoading(true);
    const result = await verifyBuyerOrganizationFromAnyStatusAction(organizationId, currentStatus, taxIdentifierId as number, registryIdentifierId);
    setLoading(false);

    if (result.ok) {
      alert("Organization verified successfully.");
    } else {
      alert("Failed to verify: " + result.code);
    }
  };

  const handleReject = async () => {
    if (!reasonCode) {
      alert("Reason is required for rejection");
      return;
    }

    setLoading(true);
    const result = await rejectBuyerOrganizationAction(
      organizationId,
      currentStatus,
      reasonCode,
      taxIdentifierId,
      registryIdentifierId,
    );
    setLoading(false);

    if (result.ok) {
      alert("Organization rejected.");
    } else {
      alert("Failed to reject: " + result.code);
    }
  };

  const handleRevoke = async () => {
    if (!reasonCode) {
      alert("Reason is required for revocation");
      return;
    }

    setLoading(true);
    const result = await revokeBuyerOrganizationAction(organizationId, currentStatus, reasonCode);
    setLoading(false);

    if (result.ok) {
      alert("Organization revoked.");
    } else {
      alert("Failed to revoke: " + result.code);
    }
  };

  return (
    <div className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm space-y-4">
      <h3 className="font-semibold text-lg border-b border-border-industrial pb-2">Decyzja Administracyjna / Admin Decision</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-muted-foreground">Powód (dla Reject/Revoke)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border-industrial rounded-md focus:outline-none focus:ring-2 focus:ring-brand-teal"
            placeholder="Np. dane_nieprawidlowe, brak_odpowiedzi..."
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleVerify}
            disabled={loading || (!taxIdentifierId && !registryIdentifierId)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            VERIFY (Zatwierdź)
          </button>

          {currentStatus === "pending" && (
            <button
              onClick={handleReject}
              disabled={loading || !reasonCode}
              className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              REJECT (Odrzuć)
            </button>
          )}

          {currentStatus === "verified" && (
            <button
              onClick={handleRevoke}
              disabled={loading || !reasonCode}
              className="px-4 py-2 bg-gray-800 text-white rounded-md font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              REVOKE (Cofnij)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
