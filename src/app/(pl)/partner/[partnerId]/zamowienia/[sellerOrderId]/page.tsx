import { getPartnerOrderDetail, PartnerOrderEffectiveStatus } from "@/lib/partner-orders/read-model";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Info } from "lucide-react";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";

function getStatusLabel(status: PartnerOrderEffectiveStatus) {
  switch (status) {
    case "pending_decision": return "Do decyzji";
    case "accepted": return "Zaakceptowane";
    case "fulfillment_in_progress": return "W trakcie realizacji";
    case "fulfilled": return "Zrealizowane";
    case "rejected": return "Odrzucone";
    case "cancelled": return "Anulowane";
    case "expired": return "Wygasłe";
    default: return status;
  }
}

function formatRemainingTime(expiresAt: Date | null, serverNow: Date) {
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - serverNow.getTime();
  if (diff <= 0) return "Termin minął";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export default async function PartnerOrderDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string; sellerOrderId: string; locale?: string }>;
}) {
  const { partnerId, sellerOrderId, locale } = await params;
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const parsedSellerOrderId = parseStrictIdOrNotFound(sellerOrderId);

  // The layout already ran requirePartnerMembership(parsedPartnerId) but doing it here again is 
  // cheap if cached, and safe to ensure tenant isolation directly on the read. 
  // Read model has WHERE partner_id = parsedPartnerId, which enforces isolation anyway.

  const result = await getPartnerOrderDetail(parsedPartnerId, parsedSellerOrderId);
  
  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
    if (result.code === "UNAUTHORIZED") notFound();
    return (
      <div className="bg-white p-8 rounded-industrial border border-border-industrial text-center">
        <h2 className="text-xl font-bold text-brand-navy mb-2">Błąd</h2>
        <p className="text-muted-foreground">Nie można załadować szczegółów zamówienia.</p>
      </div>
    );
  }

  const basePath = locale ? `/${locale}/partner/${partnerId}/orders` : `/partner/${partnerId}/zamowienia`;

  const order = result.data;
  const showContact = order.buyerContactName || order.buyerEmail || order.buyerPhone;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href={`${basePath}`}
          className="p-2 -ml-2 rounded-industrial text-muted-foreground hover:bg-white hover:text-brand-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal"
          aria-label="Wróć do listy zamówień"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Zamówienie {order.publicOrderReference}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Złożone: {order.createdAt.toLocaleString("pl-PL")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30">
              <h2 className="font-semibold text-brand-navy">Pozycje zamówienia</h2>
            </div>
            <div className="divide-y divide-border-industrial">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between">
                  <div>
                    <h3 className="font-medium text-brand-navy">{item.offerTitle}</h3>
                    {(item.manufacturer || item.model) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.manufacturer} {item.model}
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground mt-2">
                      Cena jednostkowa: {item.unitPrice} {item.currency}
                    </div>
                  </div>
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4">
                    <span className="bg-brand-light-gray text-brand-navy px-3 py-1 rounded-industrial text-sm font-medium">
                      Ilość: {item.quantity}
                    </span>
                    <span className="font-semibold text-brand-navy">
                      {(Number(item.unitPrice) * item.quantity).toFixed(2)} {item.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-brand-light-gray/30 flex justify-between items-center border-t border-border-industrial">
              <span className="font-medium text-muted-foreground">Razem do zapłaty</span>
              <span className="text-xl font-bold text-brand-navy">
                {order.orderTotal} {order.currency}
              </span>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-industrial border border-border-industrial shadow-soft p-6">
            <h2 className="font-semibold text-brand-navy mb-4">Status zamówienia</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Obecny status</div>
                <div className="font-medium text-lg mt-1">{getStatusLabel(order.effectiveStatus)}</div>
              </div>

              {order.effectiveStatus === "pending_decision" && order.expiresAt && (
                <div className="bg-orange-50 border border-orange-200 rounded-industrial p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-orange-800 font-medium text-sm">
                    <Clock className="w-4 h-4" />
                    Oczekuje na decyzję
                  </div>
                  <div className="text-orange-900 font-bold text-xl">
                    {formatRemainingTime(order.expiresAt, order.serverNow)}
                  </div>
                  <div className="text-xs text-orange-700">
                    Termin decyzji: {order.expiresAt.toLocaleString("pl-PL")}
                  </div>
                </div>
              )}

              {order.effectiveStatus === "expired" && (
                <div className="bg-red-50 border border-red-200 rounded-industrial p-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="text-sm font-medium text-red-800">
                    Termin decyzji minął. Nie możesz już podjąć decyzji w sprawie tego zamówienia.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-industrial border border-border-industrial shadow-soft p-6">
            <h2 className="font-semibold text-brand-navy mb-4">Dane Kupującego</h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Firma</div>
                <div className="font-medium text-brand-navy">{order.buyerBusinessName}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Kraj rejestracji: {order.buyerCountryCode}
                </div>
              </div>

              {(order.buyerTaxId || order.buyerRegistryId) && (
                <div>
                  {order.buyerTaxId && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">NIP/VAT:</span> <span className="font-medium">{order.buyerTaxId}</span>
                    </div>
                  )}
                  {order.buyerRegistryId && (
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">KRS/Regon:</span> <span className="font-medium">{order.buyerRegistryId}</span>
                    </div>
                  )}
                </div>
              )}

              {order.customerPoNumber && (
                <div className="pt-2 border-t border-border-industrial">
                  <div className="text-xs text-muted-foreground mb-1">Numer zamówienia Kupującego (PO)</div>
                  <div className="font-medium text-brand-navy">{order.customerPoNumber}</div>
                </div>
              )}

              {!showContact && order.effectiveStatus === "pending_decision" && (
                <div className="pt-2 border-t border-border-industrial">
                  <div className="text-xs text-muted-foreground bg-brand-light-gray p-3 rounded-industrial">
                    Dane kontaktowe kupującego zostaną udostępnione po zaakceptowaniu zamówienia, w celu jego realizacji.
                  </div>
                </div>
              )}

              {showContact && (
                <div className="pt-2 border-t border-border-industrial space-y-2">
                  <h3 className="text-sm font-semibold text-brand-navy">Osoba kontaktowa</h3>
                  {order.buyerContactName && (
                    <div className="text-sm">
                      {order.buyerContactName}
                    </div>
                  )}
                  {order.buyerEmail && (
                    <div className="text-sm text-brand-teal">
                      <a href={`mailto:${order.buyerEmail}`}>{order.buyerEmail}</a>
                    </div>
                  )}
                  {order.buyerPhone && (
                    <div className="text-sm">
                      <a href={`tel:${order.buyerPhone}`}>{order.buyerPhone}</a>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
