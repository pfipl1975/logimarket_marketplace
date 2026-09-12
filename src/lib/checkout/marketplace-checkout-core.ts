import { sql, eq, inArray, isNull, and, asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import {
  buyerLegalContextSnapshots,
  marketplaceOrders,
  marketplaceOrderBuyerContactSnapshots,
  marketplaceOrderSellerDisclosures,
  sellerOrders,
  sellerOrderSellerSnapshots,
  sellerOrderItems,
  cartItems,
  offers,
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
} from "@/lib/schema";
import { evaluateBuyerCheckoutReadiness } from "@/lib/marketplace/buyer-legal-context";
import type { BuyerLegalContextInput } from "@/lib/marketplace/buyer-legal-context";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import { validateSellerSourceForSnapshot } from "@/lib/marketplace/seller-snapshot";
import type { SellerEligibilityStatus, SellerSourceInput } from "@/lib/marketplace/seller-snapshot";
import { validateCheckoutLine } from "./eligibility";
import { 
  CONTRACT_MODEL,
  SELLER_OF_RECORD,
  GOODS_INVOICE_ISSUER,
  GOODS_INVOICE_RESPONSIBILITY,
  SELLER_ROLE,
  LOGIMARKET_PLATFORM_ROLE,
  DELIVERY_RESPONSIBILITY,
  COMPLAINT_RESPONSIBILITY,
  RETURN_RESPONSIBILITY,
  REFUND_FINANCIAL_LIABILITY,
  ECOMMERCE_MVP_CURRENCY,
} from "@/lib/marketplace/policy-constants";

export interface BuyerContactInput {
  contactName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
}

export type MarketplaceCheckoutResult =
  | { ok: true; marketplaceOrderId: number }
  | { ok: false; reason: "CHECKOUT_CART_EMPTY" }
  | { ok: false; reason: "CHECKOUT_CART_CHANGED" }
  | { ok: false; reason: "CHECKOUT_BUYER_NOT_READY" }
  | { ok: false; reason: "CHECKOUT_SELLER_NOT_READY" }
  | { ok: false; reason: "SYSTEM_ERROR" };

type MarketplaceDatabase = NodePgDatabase<typeof schema>;

function normalizeSellerEligibilityStatus(
  value: string | null | undefined,
): SellerEligibilityStatus | null {
  if (
    value === "pending" ||
    value === "eligible" ||
    value === "ineligible" ||
    value === "suspended"
  ) {
    return value;
  }
  return null;
}

function requireValidatedString(value: string | null, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Validated seller source is missing ${field}`);
  }
  return value;
}

export async function executeMarketplaceCheckout(
  db: MarketplaceDatabase,
  sessionHash: string,
  buyerLegalContext: BuyerLegalContextInput,
  buyerContact: BuyerContactInput
): Promise<MarketplaceCheckoutResult> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('marketplace_checkout'), hashtext(${sessionHash}))`);

      const cartRows = await tx
        .select({ id: cartItems.id, offerId: cartItems.offerId, quantity: cartItems.quantity })
        .from(cartItems)
        .where(eq(cartItems.sessionHash, sessionHash))
        .for("update");

      if (cartRows.length === 0) {
        return { ok: false, reason: "CHECKOUT_CART_EMPTY" };
      }

      const offerIds = cartRows.map((r) => r.offerId);
      const offerRows = await tx
        .select({
          id: offers.id,
          title: offers.title,
          isActive: offers.isActive,
          publicationStatus: offers.publicationStatus,
          offerModel: offers.offerModel,
          conversionType: offers.conversionType,
          priceOnRequest: offers.priceOnRequest,
          normalizedPrice: sql<string>`ROUND(${offers.priceBrutto}, 2)::text`,
          partnerId: offers.partnerId,
        })
        .from(offers)
        .where(inArray(offers.id, offerIds));

      const offerMap = new Map<number, typeof offerRows[0]>();
      for (const o of offerRows) offerMap.set(o.id, o);

      const linesByPartner = new Map<number, Array<{ cartRow: typeof cartRows[0], offer: typeof offerRows[0] }>>();
      for (const row of cartRows) {
        const offer = offerMap.get(row.offerId);
        if (!offer || !offer.partnerId) return { ok: false, reason: "CHECKOUT_CART_CHANGED" };
        
        const lineResult = validateCheckoutLine(row, offerMap);
        if (!lineResult.ok) return { ok: false, reason: "CHECKOUT_CART_CHANGED" };
        
        let lines = linesByPartner.get(offer.partnerId);
        if (!lines) {
          lines = [];
          linesByPartner.set(offer.partnerId, lines);
        }
        lines.push({ cartRow: row, offer });
      }

      const buyerReadiness = evaluateBuyerCheckoutReadiness(buyerLegalContext);
      if (buyerReadiness !== "VALID_CONTEXT") {
        return { ok: false, reason: "CHECKOUT_BUYER_NOT_READY" };
      }

      const sellerDisclosures = new Map<number, SellerSourceInput>();
      
      for (const partnerId of linesByPartner.keys()) {
        const sellerReadiness = await querySellerReadiness(tx, partnerId);
        if (sellerReadiness.status !== "ready") {
          return { ok: false, reason: "CHECKOUT_SELLER_NOT_READY" };
        }

        const partnerRows = await tx.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
        const p = partnerRows[0];

        const legalRows = await tx.select().from(sellerLegalIdentities).where(eq(sellerLegalIdentities.partnerId, partnerId)).limit(1);
        const li = legalRows[0];

        const taxRows = await tx.select().from(sellerTaxIdentifiers)
          .where(and(eq(sellerTaxIdentifiers.partnerId, partnerId), isNull(sellerTaxIdentifiers.retiredAt)))
          .orderBy(asc(sellerTaxIdentifiers.id));
        const taxPref = taxRows.find(t => t.identifierType === "tax_id") || taxRows.find(t => t.identifierType === "vat_id") || taxRows[0];

        const regRows = await tx.select().from(sellerRegistryIdentifiers)
          .where(and(eq(sellerRegistryIdentifiers.partnerId, partnerId), isNull(sellerRegistryIdentifiers.retiredAt)))
          .orderBy(asc(sellerRegistryIdentifiers.id))
          .limit(1);
        const regPref = regRows[0];

        const eligRows = await tx.select().from(sellerEligibility).where(eq(sellerEligibility.partnerId, partnerId)).limit(1);
        const elig = eligRows[0];

        const input: SellerSourceInput = {
          partnerId,
          sellerDisplayName: p?.companyName ?? null,
          firmContactEmail: p?.contactEmail ?? null,
          legalName: li?.legalName ?? null,
          jurisdictionCountry: li?.jurisdictionCountry ?? null,
          registeredAddressLine1: li?.registeredAddressLine1 ?? null,
          registeredAddressLine2: li?.registeredAddressLine2 ?? null,
          registeredPostalCode: li?.registeredPostalCode ?? null,
          registeredCity: li?.registeredCity ?? null,
          registeredRegion: li?.registeredRegion ?? null,
          registeredCountryCode: li?.registeredCountryCode ?? null,
          eligibilityStatus: normalizeSellerEligibilityStatus(elig?.eligibilityStatus),
          taxIdentifierType: taxPref?.identifierType ?? null,
          taxIdentifierValue: taxPref?.identifierValue ?? null,
          registryIdentifierType: regPref?.registryType ?? null,
          registryIdentifierValue: regPref?.registryValue ?? null,
          contractModel: CONTRACT_MODEL,
          sellerOfRecord: SELLER_OF_RECORD,
          goodsInvoiceIssuer: GOODS_INVOICE_ISSUER,
          goodsInvoiceResponsibility: GOODS_INVOICE_RESPONSIBILITY,
          deliveryResponsibility: DELIVERY_RESPONSIBILITY,
          complaintResponsibility: COMPLAINT_RESPONSIBILITY,
          returnResponsibility: RETURN_RESPONSIBILITY,
          refundFinancialLiability: REFUND_FINANCIAL_LIABILITY,
          sellerRole: SELLER_ROLE,
          logimarketPlatformRole: LOGIMARKET_PLATFORM_ROLE,
        };

        const val = validateSellerSourceForSnapshot(input);
        if (!val.ok) return { ok: false, reason: "CHECKOUT_SELLER_NOT_READY" };
        
        sellerDisclosures.set(partnerId, val.data);
      }

      const [blcInsert] = await tx.insert(buyerLegalContextSnapshots).values({
        businessName: requireValidatedString(buyerLegalContext.businessName, "buyerBusinessName"),
        countryCode: requireValidatedString(buyerLegalContext.countryCode, "buyerCountryCode"),
        taxIdentifierType: buyerLegalContext.taxIdentifierType,
        taxIdentifierValue: buyerLegalContext.taxIdentifierValue,
        registryIdentifierType: buyerLegalContext.registryIdentifierType,
        registryIdentifierValue: buyerLegalContext.registryIdentifierValue,
        businessVerificationStatus: buyerLegalContext.businessVerificationStatus,
        businessVerificationMethod: buyerLegalContext.businessVerificationMethod,
        businessVerificationSource: buyerLegalContext.businessVerificationSource,
        businessVerifiedAt: buyerLegalContext.businessVerifiedAt,
        professionalPurposeEvidence: buyerLegalContext.professionalPurposeEvidence,
        categoryBStatus: buyerLegalContext.categoryBStatus,
        legalContextReviewState: buyerLegalContext.legalContextReviewState,
      }).returning({ id: buyerLegalContextSnapshots.id });

      const [moInsert] = await tx.insert(marketplaceOrders).values({
        sessionHash,
        buyerLegalContextSnapshotId: blcInsert.id,
        status: "checkout_submitted",
      }).returning({ id: marketplaceOrders.id });
      const mOrderId = moInsert.id;

      await tx.insert(marketplaceOrderBuyerContactSnapshots).values({
        marketplaceOrderId: mOrderId,
        contactName: buyerContact.contactName,
        email: buyerContact.email,
        phone: buyerContact.phone ?? null,
        message: buyerContact.message ?? null,
      });

      for (const [partnerId, lines] of linesByPartner.entries()) {
        const sd = sellerDisclosures.get(partnerId);
        if (!sd) {
          throw new Error(`Validated seller source is missing for partner ${partnerId}`);
        }
        const sellerLegalName = requireValidatedString(sd.legalName, "legalName");
        const sellerDisplayName = requireValidatedString(sd.sellerDisplayName, "sellerDisplayName");
        const jurisdictionCountry = requireValidatedString(sd.jurisdictionCountry, "jurisdictionCountry");
        const firmContactEmail = requireValidatedString(sd.firmContactEmail, "firmContactEmail");
        const sellerRole = requireValidatedString(sd.sellerRole, "sellerRole");
        const logimarketPlatformRole = requireValidatedString(sd.logimarketPlatformRole, "logimarketPlatformRole");
        const goodsInvoiceIssuer = requireValidatedString(sd.goodsInvoiceIssuer, "goodsInvoiceIssuer");
        const contractModel = requireValidatedString(sd.contractModel, "contractModel");
        const sellerOfRecord = requireValidatedString(sd.sellerOfRecord, "sellerOfRecord");
        const goodsInvoiceResponsibility = requireValidatedString(sd.goodsInvoiceResponsibility, "goodsInvoiceResponsibility");
        const deliveryResponsibility = requireValidatedString(sd.deliveryResponsibility, "deliveryResponsibility");
        const complaintResponsibility = requireValidatedString(sd.complaintResponsibility, "complaintResponsibility");
        const returnResponsibility = requireValidatedString(sd.returnResponsibility, "returnResponsibility");
        const refundFinancialLiability = requireValidatedString(sd.refundFinancialLiability, "refundFinancialLiability");
        
        const addrStr = [
            sd.registeredAddressLine1,
            sd.registeredAddressLine2,
            `${sd.registeredPostalCode || ""} ${sd.registeredCity || ""}`.trim()
        ].filter(Boolean).join(", ");

        await tx.insert(marketplaceOrderSellerDisclosures).values({
          marketplaceOrderId: mOrderId,
          partnerId,
          sellerLegalName,
          registeredAddress: addrStr,
          jurisdictionCountry,
          firmContactEmail,
          sellerRole,
          goodsInvoiceIssuer,
          deliveryResponsibleParty: deliveryResponsibility,
          complaintResponsibleParty: complaintResponsibility,
          returnResponsibleParty: returnResponsibility,
          logimarketPlatformRole,
          taxIdentifierType: sd.taxIdentifierType,
          taxIdentifierValue: sd.taxIdentifierValue,
        });

        const [soInsert] = await tx.insert(sellerOrders).values({
          marketplaceOrderId: mOrderId,
          partnerId,
          status: "submitted",
        }).returning({ id: sellerOrders.id });
        const sOrderId = soInsert.id;

        await tx.insert(sellerOrderSellerSnapshots).values({
          sellerOrderId: sOrderId,
          sellerLegalName,
          sellerDisplayName,
          jurisdictionCountry,
          registeredAddress: addrStr,
          firmContactEmail,
          taxIdentifierType: sd.taxIdentifierType,
          taxIdentifierValue: sd.taxIdentifierValue,
          registryIdentifierType: sd.registryIdentifierType,
          registryIdentifierValue: sd.registryIdentifierValue,
          contractModel,
          sellerOfRecordResponsibility: sellerOfRecord,
          goodsInvoiceResponsibility,
          deliveryResponsibility,
          complaintResponsibility,
          returnResponsibility,
          refundFinancialLiability,
        });

        for (const line of lines) {
          await tx.insert(sellerOrderItems).values({
            sellerOrderId: sOrderId,
            offerId: line.offer.id,
            offerTitle: line.offer.title,
            quantity: line.cartRow.quantity,
            unitPrice: line.offer.normalizedPrice,
            currency: ECOMMERCE_MVP_CURRENCY,
          });
        }
      }

      await tx.delete(cartItems).where(eq(cartItems.sessionHash, sessionHash));

      return { ok: true, marketplaceOrderId: mOrderId };
    });
  } catch (err) {
    return { ok: false, reason: "SYSTEM_ERROR" };
  }
}
