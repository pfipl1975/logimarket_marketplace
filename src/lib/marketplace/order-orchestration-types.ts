import type { OfferPublicationStatus } from "@/lib/schema";

/**
 * Server-authoritative line type required by future MarketplaceOrder orchestration.
 * All fields must be verified on the server side.
 */
export interface AuthoritativeMarketplaceLine {
  offerId: number;
  partnerId: number;
  title: string;
  quantity: number;

  offerModel: string;
  conversionType: string;
  publicationStatus: OfferPublicationStatus;
  isActive: boolean;
  priceOnRequest: boolean;

  /** Authoritative unit price mapped from the database. */
  unitPriceMinor: bigint;

  /** Approved contract model for the seller. */
  contractModel: string;

  /** Authoritative currency (e.g. "PLN"). Cannot come from client. */
  currency: string;
}
