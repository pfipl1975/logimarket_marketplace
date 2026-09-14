import { getPartnerOrdersList, PartnerOrderEffectiveStatus } from "@/lib/partner-orders/read-model";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";

// Helper to format countdown or time remaining
function formatRemainingTime(expiresAt: Date | null, serverNow: Date) {
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - serverNow.getTime();
  if (diff <= 0) return "Termin minął";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function getStatusBadge(status: PartnerOrderEffectiveStatus) {
  switch (status) {
    case "pending_decision":
      return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">Do decyzji</span>;
    case "accepted":
    case "fulfillment_in_progress":
    case "fulfilled":
      return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">Zaakceptowane</span>;
    case "rejected":
    case "cancelled":
      return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 border border-gray-200">Odrzucone</span>;
    case "expired":
      return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 border border-red-200">Wygasłe</span>;
    default:
      return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 border border-gray-200">{status}</span>;
  }
}

export default async function PartnerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { partnerId } = await params;
  const parsedPartnerId = parseInt(partnerId, 10);
  
  if (isNaN(parsedPartnerId)) {
    notFound();
  }

  const result = await getPartnerOrdersList(parsedPartnerId);
  
  if (!result.ok) {
    return (
      <div className="bg-white p-8 rounded-industrial border border-border-industrial text-center">
        <h2 className="text-xl font-bold text-brand-navy mb-2">Błąd pobierania danych</h2>
        <p className="text-muted-foreground">Nie udało się pobrać listy zamówień.</p>
      </div>
    );
  }

  const { filter } = await searchParams;
  const activeFilter = filter || "pending";

  let filteredItems = result.items;
  if (activeFilter === "pending") {
    filteredItems = result.items.filter(i => i.effectiveStatus === "pending_decision");
  } else if (activeFilter === "accepted") {
    filteredItems = result.items.filter(i => ["accepted", "fulfillment_in_progress", "fulfilled"].includes(i.effectiveStatus));
  } else if (activeFilter === "rejected") {
    filteredItems = result.items.filter(i => ["rejected", "cancelled"].includes(i.effectiveStatus));
  } else if (activeFilter === "expired") {
    filteredItems = result.items.filter(i => i.effectiveStatus === "expired");
  }

  const filterTabs = [
    { id: "pending", label: "Do decyzji" },
    { id: "accepted", label: "Zaakceptowane" },
    { id: "rejected", label: "Odrzucone" },
    { id: "expired", label: "Wygasłe" },
    { id: "all", label: "Wszystkie" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Zamówienia</h1>
        <p className="text-muted-foreground mt-1">Zarządzaj zamówieniami od kupujących.</p>
      </div>

      <div className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
        <div className="border-b border-border-industrial px-2 sm:px-6 flex overflow-x-auto">
          <nav className="flex -mb-px space-x-4 sm:space-x-8">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/partner/${partnerId}/zamowienia?filter=${tab.id}`}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 ${
                    isActive
                      ? "border-brand-teal text-brand-teal"
                      : "border-transparent text-muted-foreground hover:text-brand-navy hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">Brak zamówień do wyświetlenia w tej kategorii.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border-industrial">
              <thead className="bg-brand-light-gray/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Zamówienie
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Kupujący
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Wartość
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-industrial">
                {filteredItems.map((item) => (
                  <tr key={item.sellerOrderId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/partner/${partnerId}/zamowienia/${item.sellerOrderId}`}
                        className="text-brand-teal hover:text-brand-navy font-medium block focus:outline-none focus:underline rounded-sm"
                      >
                        {item.publicOrderReference}
                      </Link>
                      <span className="text-xs text-muted-foreground">{item.itemCount} pozycje</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-brand-navy max-w-[200px] truncate" title={item.buyerBusinessName}>
                        {item.buyerBusinessName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {item.createdAt.toLocaleDateString("pl-PL")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-navy">
                      {item.orderTotal} {item.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(item.effectiveStatus)}
                        {item.effectiveStatus === "pending_decision" && item.expiresAt && (
                          <div className="flex items-center text-xs text-orange-600 font-medium mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatRemainingTime(item.expiresAt, item.serverNow)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
