/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { sql, eq, inArray, isNull, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
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
import type { SellerSourceInput } from "@/lib/marketplace/seller-snapshot";
import { validateCheckoutLine } from "./eligibility";
import type { CheckoutOfferRow, CheckoutCartRow } from "./eligibility";
import { 
  CONTRACT_MODEL,
  SELLER_OF_RECORD,
  GOODS_INVOICE_ISSUER,
  GOODS_INVOICE_RESPONSIBILITY,
  SELLER_ROLE,
  DELIVERY_RESPONSIBILITY,
  COMPLAINT_RESPONSIBILITY,
  RETURN_RESPONSIBILITY,
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

export async function executeMarketplaceCheckout(
  db: NodePgDatabase<any>,
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

      const offerMap = new Map<number, any>();
      for (const o of offerRows) offerMap.set(o.id, o);

      const linesByPartner = new Map<number, any[]>();
      for (const row of cartRows) {
        const lineResult = validateCheckoutLine(row, offerMap);
        if (!lineResult.ok) return { ok: false, reason: "CHECKOUT_CART_CHANGED" };
        
        const offer = offerMap.get(row.offerId);
        if (!offer || !offer.partnerId) return { ok: false, reason: "CHECKOUT_CART_CHANGED" };
        
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

      const sellerDisclosures = new Map<number, any>();
      const sellerSnapshots = new Map<number, any>();
      
      for (const partnerId of linesByPartner.keys()) {
        const sellerReadiness = await querySellerReadiness(tx, partnerId);
        if (sellerReadiness.status !== "ready") {
          return { ok: false, reason: "CHECKOUT_SELLER_NOT_READY" };
        }

        const partnerRows = await tx.select().from(partners).where(eq(partners.id, partnerId));
        const p = partnerRows[0];

        const legalRows = await tx.select().from(sellerLegalIdentities).where(eq(sellerLegalIdentities.partnerId, partnerId));
        const li = legalRows[0];

        const taxRows = await tx.select().from(sellerTaxIdentifiers)
          .where(and(eq(sellerTaxIdentifiers.partnerId, partnerId), isNull(sellerTaxIdentifiers.retiredAt)));
        const taxPref = taxRows.find(t => t.identifierType === "tax_id") || taxRows.find(t => t.identifierType === "vat_id") || taxRows[0];

        const regRows = await tx.select().from(sellerRegistryIdentifiers)
          .where(and(eq(sellerRegistryIdentifiers.partnerId, partnerId), isNull(sellerRegistryIdentifiers.retiredAt)));
        const regPref = regRows[0];

        const eligRows = await tx.select().from(sellerEligibility).where(eq(sellerEligibility.partnerId, partnerId));
        const elig = eligRows[0];

        const input: SellerSourceInput = {
          partnerId,
          sellerDisplayName: p?.companyName || null,
          firmContactEmail: p?.contactEmail || null,
          legalName: li?.legalName || null,
          jurisdictionCountry: li?.jurisdictionCountry || null,
          registeredAddressLine1: li?.registeredAddressLine1 || null,
          registeredAddressLine2: li?.registeredAddressLine2 || null,
          registeredPostalCode: li?.registeredPostalCode || null,
          registeredCity: li?.registeredCity || null,
          registeredRegion: li?.registeredRegion || null,
          registeredCountryCode: li?.registeredCountryCode || null,
          eligibilityStatus: elig ? (elig.eligibilityStatus as any) : null,
          taxIdentifierType: taxPref ? taxPref.identifierType : null,
          taxIdentifierValue: taxPref ? taxPref.identifierValue : null,
          registryIdentifierType: regPref ? regPref.registryType : null,
          registryIdentifierValue: regPref ? regPref.registryValue : null,
        };

        const val = validateSellerSourceForSnapshot(input);
        if (!val.ok) return { ok: false, reason: "CHECKOUT_SELLER_NOT_READY" };
        
        sellerDisclosures.set(partnerId, { input, val: val.data });
        sellerSnapshots.set(partnerId, { input, val: val.data });
      }

      const [blcInsert] = await tx.insert(buyerLegalContextSnapshots).values({
        businessName: buyerLegalContext.businessName,
        countryCode: buyerLegalContext.countryCode,
        taxIdentifierType: buyerLegalContext.taxIdentifierType,
        taxIdentifierValue: buyerLegalContext.taxIdentifierValue,
        registryIdentifierType: buyerLegalContext.registryIdentifierType,
        registryIdentifierValue: buyerLegalContext.registryIdentifierValue,
        businessVerificationStatus: buyerLegalContext.businessVerificationStatus as any,
        businessVerificationMethod: buyerLegalContext.businessVerificationMethod,
        businessVerificationSource: buyerLegalContext.businessVerificationSource,
        businessVerifiedAt: buyerLegalContext.businessVerifiedAt,
        professionalPurposeEvidence: buyerLegalContext.professionalPurposeEvidence,
        categoryBStatus: buyerLegalContext.categoryBStatus as any,
        legalContextReviewState: buyerLegalContext.legalContextReviewState as any,
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
        phone: buyerContact.phone,
        message: buyerContact.message,
      });

      for (const [partnerId, lines] of linesByPartner.entries()) {
        const sd = sellerDisclosures.get(partnerId);
        
        const addrStr = [
            sd.val.registeredAddressLine1,
            sd.val.registeredAddressLine2,
            `${sd.val.registeredPostalCode || ""} ${sd.val.registeredCity || ""}`.trim()
        ].filter(Boolean).join(", ");

        await tx.insert(marketplaceOrderSellerDisclosures).values({
          marketplaceOrderId: mOrderId,
          partnerId,
          sellerLegalName: sd.val.legalName,
          registeredAddress: addrStr,
          jurisdictionCountry: sd.val.jurisdictionCountry,
          firmContactEmail: sd.val.firmContactEmail,
          sellerRole: SELLER_ROLE,
          goodsInvoiceIssuer: GOODS_INVOICE_ISSUER,
          deliveryResponsibleParty: DELIVERY_RESPONSIBILITY,
          complaintResponsibleParty: COMPLAINT_RESPONSIBILITY,
          returnResponsibleParty: RETURN_RESPONSIBILITY,
        });

        const [soInsert] = await tx.insert(sellerOrders).values({
          marketplaceOrderId: mOrderId,
          partnerId,
          status: "submitted",
        }).returning({ id: sellerOrders.id });
        const sOrderId = soInsert.id;

        await tx.insert(sellerOrderSellerSnapshots).values({
          sellerOrderId: sOrderId,
          sellerLegalName: sd.val.legalName,
          sellerDisplayName: sd.val.sellerDisplayName,
          jurisdictionCountry: sd.val.jurisdictionCountry,
          registeredAddress: addrStr,
          firmContactEmail: sd.val.firmContactEmail,
          taxIdentifierType: sd.val.taxIdentifierType,
          taxIdentifierValue: sd.val.taxIdentifierValue,
          registryIdentifierType: sd.val.registryIdentifierType,
          registryIdentifierValue: sd.val.registryIdentifierValue,
          contractModel: CONTRACT_MODEL,
          sellerOfRecordResponsibility: SELLER_OF_RECORD,
          goodsInvoiceResponsibility: GOODS_INVOICE_RESPONSIBILITY,
          deliveryResponsibility: DELIVERY_RESPONSIBILITY,
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
    console.error("Marketplace checkout failed:", err);
    return { ok: false, reason: "SYSTEM_ERROR" };
  }
}
