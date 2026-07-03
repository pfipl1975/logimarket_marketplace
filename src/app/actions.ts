"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, desc, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  offers, categories, partners, cartItems, orders, orderItems, rfqLeads,
} from "@/lib/schema";
import type { TechnicalAttributes, OfferPublicationStatus } from "@/lib/schema";
import { getCategoryDescendantIds } from "@/lib/catalog/tree";
import type { CatalogCategoryRow } from "@/lib/catalog/tree";

export type CatalogOffer = {
  id: number; title: string; description: string | null; imageUrl: string | null;
  priceBrutto: string | null; priceOnRequest: boolean; conversionType: string;
  offerModel: string; outboundUrl: string | null; isFeatured: boolean; isActive: boolean;
  technicalAttributes: TechnicalAttributes; categoryName: string; categorySlug: string;
  partnerId: number; partnerName: string; partnerLogo: string | null;
  partnerWebsite: string | null; partnerEmail: string;
  publicationStatus: OfferPublicationStatus;
};

function rowToOffer(row: {
  offer: typeof offers.$inferSelect;
  category: typeof categories.$inferSelect | null;
  partner: typeof partners.$inferSelect | null;
}): CatalogOffer {
  return {
    id: row.offer.id, title: row.offer.title, description: row.offer.description,
    imageUrl: row.offer.imageUrl, priceBrutto: row.offer.priceBrutto,
    priceOnRequest: row.offer.priceOnRequest, conversionType: row.offer.conversionType,
    offerModel: row.offer.offerModel, outboundUrl: row.offer.outboundUrl,
    isFeatured: row.offer.isFeatured, isActive: row.offer.isActive,
    technicalAttributes: (row.offer.technicalAttributes as TechnicalAttributes) ?? {},
    categoryName: row.category?.name ?? "Bez kategorii", categorySlug: row.category?.slug ?? "",
    partnerId: row.partner?.id ?? 0, partnerName: row.partner?.companyName ?? "Partner",
    partnerLogo: row.partner?.logoUrl ?? null, partnerWebsite: row.partner?.websiteUrl ?? null,
    partnerEmail: row.partner?.contactEmail ?? "",
    publicationStatus: row.offer.publicationStatus,
  };
}

async function getSessionHash(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("session_hash")?.value;
  if (existing) return existing;
  const { randomBytes } = require("crypto");
  const hash = randomBytes(32).toString("hex");
  cookieStore.set("session_hash", hash, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return hash;
}

export async function getCategories(): Promise<CatalogCategoryRow[]> {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    parentId: row.parentId !== null ? Number(row.parentId) : null,
    createdAt: row.createdAt,
  }));
}

export async function getCategoryBySlug(slug: string): Promise<CatalogCategoryRow | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    parentId: row.parentId !== null ? Number(row.parentId) : null,
    createdAt: row.createdAt,
  };
}

export async function getCategoryOffers(categorySlug: string): Promise<CatalogOffer[]> {
  const cats = await getCategories();
  const activeCat = cats.find((c) => c.slug === categorySlug);
  if (!activeCat) return [];

  const descendantIds = getCategoryDescendantIds(cats, activeCat.id);
  const targetIds = [activeCat.id, ...descendantIds];

  const rows = await db
    .select({ offer: offers, category: categories, partner: partners })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .where(
      and(
        eq(offers.isActive, true),
        eq(offers.publicationStatus, "published"),
        inArray(offers.categoryId, targetIds)
      )
    )
    .orderBy(desc(offers.isFeatured), desc(offers.createdAt));

  return rows.map(rowToOffer);
}

export async function getCategoryOffersCount(categorySlug: string): Promise<number> {
  const cats = await getCategories();
  const activeCat = cats.find((c) => c.slug === categorySlug);
  if (!activeCat) return 0;

  const descendantIds = getCategoryDescendantIds(cats, activeCat.id);
  const targetIds = [activeCat.id, ...descendantIds];

  const rows = await db
    .select({
      id: offers.id,
    })
    .from(offers)
    .where(
      and(
        eq(offers.isActive, true),
        eq(offers.publicationStatus, "published"),
        inArray(offers.categoryId, targetIds)
      )
    );

  return rows.length;
}

export async function getOffers(categorySlug?: string): Promise<CatalogOffer[]> {
  const conditions = [eq(offers.isActive, true), eq(offers.publicationStatus, "published")];
  if (categorySlug) conditions.push(eq(categories.slug, categorySlug));
  const rows = await db
    .select({ offer: offers, category: categories, partner: partners })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .where(and(...conditions))
    .orderBy(desc(offers.isFeatured), desc(offers.createdAt));
  return rows.map(rowToOffer);
}

export async function getOfferById(id: number): Promise<CatalogOffer | null> {
  const rows = await db
    .select({ offer: offers, category: categories, partner: partners })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .where(and(eq(offers.id, id), inArray(offers.publicationStatus, ["published", "archived"])))
    .limit(1);
  return rows.length === 0 ? null : rowToOffer(rows[0]);
}

export type CartItemWithOffer = {
  id: number; offerId: number; title: string; imageUrl: string | null;
  priceBrutto: string | null; priceOnRequest: boolean; quantity: number;
  partnerName: string; categoryName: string;
};

export type RfqActionResult =
  | { ok: null; code: "IDLE" }
  | { ok: true; code: "RFQ_SENT" }
  | { ok: false; code: "RFQ_OFFER_NOT_FOUND" | "RFQ_VALIDATION_ERROR" | "SYSTEM_ERROR" };

export type CheckoutActionResult =
  | { ok: null; code: "IDLE" }
  | { ok: true; code: "CHECKOUT_ORDER_CREATED"; orderId: number }
  | { ok: false; code: "CHECKOUT_VALIDATION_ERROR" | "CHECKOUT_CART_EMPTY" | "SYSTEM_ERROR" };

export async function getCartItems(): Promise<CartItemWithOffer[]> {
  const sessionHash = await getSessionHash();
  const items = await db
    .select({ cartItem: cartItems, offer: offers, partner: partners, category: categories })
    .from(cartItems)
    .leftJoin(offers, eq(cartItems.offerId, offers.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .where(eq(cartItems.sessionHash, sessionHash));
  return items.map((row) => ({
    id: row.cartItem.id, offerId: row.offer?.id ?? 0, title: row.offer?.title ?? "",
    imageUrl: row.offer?.imageUrl ?? null, priceBrutto: row.offer?.priceBrutto ?? null,
    priceOnRequest: row.offer?.priceOnRequest ?? true, quantity: row.cartItem.quantity,
    partnerName: row.partner?.companyName ?? "", categoryName: row.category?.name ?? "",
  }));
}

export async function getCartCount(): Promise<number> {
  const sessionHash = await getSessionHash();
  const items = await db.select().from(cartItems).where(eq(cartItems.sessionHash, sessionHash));
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export async function addToCart(offerId: number, quantity = 1) {
  "use server";
  const offer = await db
    .select({
      id: offers.id,
    })
    .from(offers)
    .where(
      and(
        eq(offers.id, offerId),
        eq(offers.isActive, true),
        eq(offers.publicationStatus, "published")
      )
    )
    .limit(1);

  if (offer.length === 0) {
    throw new Error("Oferta nie jest już dostępna.");
  }
  const sessionHash = await getSessionHash();
  const existing = await db.select().from(cartItems).where(and(eq(cartItems.offerId, offerId), eq(cartItems.sessionHash, sessionHash))).limit(1);
  if (existing.length > 0) {
    await db.update(cartItems).set({ quantity: existing[0].quantity + quantity }).where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({ offerId, quantity, sessionHash });
  }
  revalidatePath("/");
}

export async function removeFromCart(cartItemId: number) {
  "use server";
  const sessionHash = await getSessionHash();
  await db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.sessionHash, sessionHash)));
  revalidatePath("/");
}

export async function updateCartQuantity(cartItemId: number, quantity: number) {
  "use server";
  const sessionHash = await getSessionHash();
  await db.update(cartItems).set({ quantity }).where(and(eq(cartItems.id, cartItemId), eq(cartItems.sessionHash, sessionHash)));
  revalidatePath("/");
}

export async function clearCart() {
  "use server";
  const sessionHash = await getSessionHash();
  await db.delete(cartItems).where(eq(cartItems.sessionHash, sessionHash));
  revalidatePath("/");
}

export async function submitCheckout(data: {
  companyName: string; contactName: string; email: string; phone?: string; message?: string;
  items: { offerId: number; title: string; quantity: number; unitPrice: string | null }[];
  totalAmount?: number;
}): Promise<CheckoutActionResult> {
  "use server";
  const sessionHash = await getSessionHash();
  const [order] = await db.insert(orders).values({
    companyName: data.companyName, contactName: data.contactName, email: data.email,
    phone: data.phone ?? null, message: data.message ?? null, sessionHash,
    totalAmount: data.totalAmount?.toString() ?? null, status: "new",
  }).returning();
  const orderId = Number(order.id);
  for (const item of data.items) {
    await db.insert(orderItems).values({ orderId, offerId: item.offerId, title: item.title, quantity: item.quantity, unitPrice: item.unitPrice });
  }
  await db.delete(cartItems).where(eq(cartItems.sessionHash, sessionHash));
  revalidatePath("/");
  return { ok: true, code: "CHECKOUT_ORDER_CREATED", orderId: Number(order.id) };
}

export async function submitRfq(data: {
  offerId: number; companyName: string; contactName: string; email: string; phone?: string; message?: string;
}): Promise<RfqActionResult> {
  "use server";
  const offerRows = await db
    .select({
      id: offers.id,
      partnerId: offers.partnerId,
    })
    .from(offers)
    .where(
      and(
        eq(offers.id, data.offerId),
        eq(offers.isActive, true),
        eq(offers.publicationStatus, "published")
      )
    )
    .limit(1);

  if (offerRows.length === 0) return { ok: false, code: "RFQ_OFFER_NOT_FOUND" };
  await db.insert(rfqLeads).values({
    offerId: data.offerId, partnerId: offerRows[0].partnerId,
    companyName: data.companyName, contactName: data.contactName,
    email: data.email, phone: data.phone ?? null, message: data.message ?? null,
  });
  return { ok: true, code: "RFQ_SENT" };
}
