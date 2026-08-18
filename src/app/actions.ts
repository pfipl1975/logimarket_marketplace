"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, asc, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  offers, categories, partners, cartItems, orders, orderItems, rfqLeads,
} from "@/lib/schema";
import type { TechnicalAttributes, OfferPublicationStatus } from "@/lib/schema";
import { getCategoryDescendantIds } from "@/lib/catalog/tree";
import type { CatalogCategoryRow } from "@/lib/catalog/tree";
import { getCategoryAttributeConfigurationFromDb } from "@/lib/catalog/category-attribute-read-model";
import type { CategoryAttributeConfiguration } from "@/lib/catalog/category-attribute-read-model";
import { validateCategoryId } from "@/lib/catalog/category-attribute-read-model";
import { isLocale, type Locale, defaultLocale } from "@/lib/i18n/config";
import { getHomePath } from "@/lib/i18n/paths";
import { catalogOfferOrder } from "@/lib/catalog/catalog-offer-order";
import { getFilteredCategoryOffersFromDb } from "@/lib/catalog/filter-query";
import { parseFilterQueryInput } from "@/lib/filters/parser";
import { normalizeFilterQuery } from "@/lib/filters/validation";
import type { FilterValidationError } from "@/lib/filters/types";
import { getCatalogFilterConfigurationFromDb } from "@/lib/filters/configuration";
import type { CatalogFilterConfiguration } from "@/lib/filters/configuration-types";
import { parseCatalogSearchInput, CatalogSearchParserError } from "@/lib/search/parser";
import { searchLocalizedCategories } from "@/lib/search/category-search";
import { searchCatalogOffersFromDb } from "@/lib/search/search-query";
import { projectCatalogOfferSearchResults } from "@/lib/search/projection";
import type { CatalogSearchResult } from "@/lib/search/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedExplorerTree } from "@/lib/catalog/navigation";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import type { CanonicalOfferModelResolution } from "@/lib/offers/model";
import { getSessionHash } from "@/lib/session/session-hash";
import { CheckoutContactSchema } from "@/lib/checkout/contact-schema";
import { executeCheckout } from "@/lib/checkout/checkout-core";
import { isValidCheckoutQuantity, parseDecimalToMinorUnits } from "@/lib/checkout/money";
import type { CheckoutActionResult } from "@/lib/checkout/checkout-types";

export type CatalogOffer = {
  id: number; title: string; description: string | null; imageUrl: string | null;
  priceBrutto: string | null; priceOnRequest: boolean; conversionType: string;
  offerModel: CanonicalOfferModelResolution; outboundUrl: string | null; isFeatured: boolean; isActive: boolean;
  technicalAttributes: TechnicalAttributes; categoryName: string; categorySlug: string;
  partnerId: number; partnerName: string; partnerLogo: string | null;
  partnerWebsite: string | null; partnerEmail: string;
  publicationStatus: OfferPublicationStatus;
};

export type FilterQueryResult =
  | { ok: true; items: CatalogOffer[]; total: number; page: number | null; pageSize: number | null }
  | { ok: false; errors: FilterValidationError[] };

function rowToOffer(row: {
  offer: typeof offers.$inferSelect;
  category: typeof categories.$inferSelect | null;
  partner: typeof partners.$inferSelect | null;
}): CatalogOffer {
  return {
    id: row.offer.id, title: row.offer.title, description: row.offer.description,
    imageUrl: row.offer.imageUrl, priceBrutto: row.offer.priceBrutto,
    priceOnRequest: row.offer.priceOnRequest, conversionType: row.offer.conversionType,
    offerModel: resolveCanonicalOfferModel(row.offer.offerModel, row.offer.conversionType),
    outboundUrl: row.offer.outboundUrl,
    isFeatured: row.offer.isFeatured, isActive: row.offer.isActive,
    technicalAttributes: (row.offer.technicalAttributes as TechnicalAttributes) ?? {},
    categoryName: row.category?.name ?? "Bez kategorii", categorySlug: row.category?.slug ?? "",
    partnerId: row.partner?.id ?? 0, partnerName: row.partner?.companyName ?? "Partner",
    partnerLogo: row.partner?.logoUrl ?? null, partnerWebsite: row.partner?.websiteUrl ?? null,
    partnerEmail: row.partner?.contactEmail ?? "",
    publicationStatus: row.offer.publicationStatus,
  };
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
    .orderBy(...catalogOfferOrder());

  return rows.map(rowToOffer);
}

/** Publiczny, cienki Server Action: parser → normalizacja → rdzeń DB → istniejąca projekcja. */
export async function getFilteredCategoryOffers(rawInput: unknown): Promise<FilterQueryResult> {
  const parsed = parseFilterQueryInput(rawInput);
  if (!parsed.ok) return { ok: false, errors: parsed.errors.map((code) => ({ code })) };
  const normalized = normalizeFilterQuery(parsed.value);
  if (!normalized.ok) return { ok: false, errors: normalized.errors };
  const result = await getFilteredCategoryOffersFromDb(normalized.value);
  if (!result.ok) return result;
  return {
    ok: true,
    items: result.rows.map(rowToOffer),
    total: result.total,
    page: normalized.value.page ?? null,
    pageSize: normalized.value.pageSize ?? null,
  };
}

export async function getCatalogFilterConfiguration(
  categoryId: unknown,
  locale: unknown,
): Promise<CatalogFilterConfiguration | null> {
  return getCatalogFilterConfigurationFromDb({ categoryId, locale });
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
    .orderBy(...catalogOfferOrder());
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

import type { AdminRfqMutationResult } from "@/lib/rfq/admin-core";

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
  if (!isValidCheckoutQuantity(quantity)) {
    throw new Error("Nieprawidłowa ilość");
  }
  const offer = await db
    .select({
      id: offers.id,
      offerModel: offers.offerModel,
      conversionType: offers.conversionType,
      priceOnRequest: offers.priceOnRequest,
      normalizedPrice: sql<string | null>`ROUND(${offers.priceBrutto}, 2)::text`,
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

  const o = offer[0];
  const canonicalModel = resolveCanonicalOfferModel(o.offerModel, o.conversionType);
  if (canonicalModel !== "ecommerce") {
    throw new Error("Oferta nie jest przeznaczona do zakupu.");
  }
  if (o.priceOnRequest || !o.normalizedPrice) {
    throw new Error("Oferta nie ma prawidłowej ceny.");
  }

  try {
    parseDecimalToMinorUnits(o.normalizedPrice);
  } catch {
    throw new Error("Oferta nie ma prawidłowej ceny.");
  }

  const sessionHash = await getSessionHash();
  const existing = await db.select().from(cartItems).where(and(eq(cartItems.offerId, offerId), eq(cartItems.sessionHash, sessionHash))).limit(1);
  if (existing.length > 0) {
    const nextQuantity = existing[0].quantity + quantity;
    if (!isValidCheckoutQuantity(nextQuantity)) {
      throw new Error("Przekroczono maksymalną ilość.");
    }
    await db.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing[0].id));
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
  if (!isValidCheckoutQuantity(quantity)) {
    throw new Error("Nieprawidłowa ilość");
  }
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

export async function submitCheckout(rawInput: unknown): Promise<CheckoutActionResult> {
  "use server";

  const parsed = CheckoutContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: "CHECKOUT_VALIDATION_ERROR" };
  }

  const sessionHash = await getSessionHash();
  const result = await executeCheckout(db, sessionHash, parsed.data);

  if (result.ok) {
    revalidatePath("/");
  }
  return result;
}

import { PublicRfqInputSchema, AdminRfqStatusMutationSchema } from "@/lib/rfq/schema";
import { validatePublicRfqEligibility } from "@/lib/rfq/eligibility";

export async function submitRfq(rawInput: unknown): Promise<RfqActionResult> {
  "use server";
  try {
    const parsed = PublicRfqInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, code: "RFQ_VALIDATION_ERROR" };
    }
    const data = parsed.data;

    const offerRows = await db
      .select({
        id: offers.id,
        partnerId: offers.partnerId,
        isActive: offers.isActive,
        publicationStatus: offers.publicationStatus,
        offerModel: offers.offerModel,
        conversionType: offers.conversionType,
      })
      .from(offers)
      .where(eq(offers.id, data.offerId))
      .limit(1);

    if (offerRows.length === 0) return { ok: false, code: "RFQ_OFFER_NOT_FOUND" };
    const offer = offerRows[0];

    if (!validatePublicRfqEligibility(offer)) {
      return { ok: false, code: "RFQ_OFFER_NOT_FOUND" };
    }

    await db.insert(rfqLeads).values({
      offerId: data.offerId,
      partnerId: offer.partnerId,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message ?? null,
    });
    
    return { ok: true, code: "RFQ_SENT" };
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function mutateRfqStatus(rawInput: unknown): Promise<AdminRfqMutationResult> {
  "use server";
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  try {
    const parsed = AdminRfqStatusMutationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION_ERROR" };
    }
    const data = parsed.data;

    const { mutateRfqStatusCore } = await import("@/lib/rfq/admin-core");
    const result = await db.transaction(async (tx) => mutateRfqStatusCore(tx, data));

    if (result.ok && result.code === "UPDATED") {
      revalidatePath("/admin/zapytania", "page");
      revalidatePath("/[locale]/admin", "layout");
    }

    return result;
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function getCategoryAttributeConfiguration(
  categoryId: number,
  locale: string,
  onlyVisible = true,
  onlyFilterable = false
): Promise<CategoryAttributeConfiguration[]> {
  if (!isLocale(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }
  validateCategoryId(categoryId);
  return getCategoryAttributeConfigurationFromDb(
    db,
    categoryId,
    locale as Locale,
    onlyVisible,
    onlyFilterable
  );
}

export async function searchCatalog(
  rawInput: unknown
): Promise<CatalogSearchResult> {
  try {
    const query = parseCatalogSearchInput(rawInput);

    if (query.isEmpty) {
      return {
        ok: true,
        normalizedQuery: query.query,
        categories: [],
        offers: [],
      };
    }

    const fallbackDictionaryPromise =
      query.locale === defaultLocale
        ? Promise.resolve(null)
        : getDictionary(defaultLocale);

    const [
      categoriesDb,
      dictionary,
      fallbackDictionary,
      dbOffers,
    ] = await Promise.all([
      getCategories(),
      getDictionary(query.locale),
      fallbackDictionaryPromise,
      searchCatalogOffersFromDb(query),
    ]);

    const fallbackBySlug =
      fallbackDictionary?.categories.bySlug ??
      dictionary.categories.bySlug;

    const tree = buildCategoryTree(categoriesDb);
    const explorerTree = buildLocalizedExplorerTree(
      tree,
      getHomePath(query.locale),
      dictionary.categories?.bySlug,
      fallbackBySlug
    );

    const categoriesResult = searchLocalizedCategories(explorerTree, query);

    const offersResult = projectCatalogOfferSearchResults(
      dbOffers,
      query,
      dictionary.categories?.bySlug,
      fallbackBySlug
    );

    return {
      ok: true,
      normalizedQuery: query.query,
      categories: categoriesResult,
      offers: offersResult,
    };
  } catch (error: unknown) {
    if (error instanceof CatalogSearchParserError) {
      return {
        ok: false,
        errors: [{ code: error.code }],
      };
    }
    console.error("Catalog search failed", {
      errorName: error instanceof Error
        ? error.name
        : "UnknownError",
    });
    return {
      ok: false,
      errors: [{ code: "SYSTEM_ERROR" }],
    };
  }
}

export type LoginActionCode = "IDLE" | "INVALID_CREDENTIALS" | "AUTH_UNAVAILABLE";

export type LoginActionResult = {
  success: boolean;
  code: LoginActionCode;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(255),
  next: z.string().max(2048).optional(),
  locale: z.string().max(10).optional(),
});

export async function loginUser(_prevState: LoginActionResult, formData: FormData): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    return { success: false, code: "INVALID_CREDENTIALS" };
  }

  const { email, password, next: nextPath, locale } = parsed.data;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  if (!supabase) {
    return { success: false, code: "AUTH_UNAVAILABLE" };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const { classifyLoginError } = await import("@/lib/auth/login-error");
      return { success: false, code: classifyLoginError(error) };
    }
  } catch {
    return { success: false, code: "AUTH_UNAVAILABLE" };
  }

  const { getSafeRedirectUrl } = await import("@/lib/auth/safe-redirect");
  const redirectUrl = getSafeRedirectUrl(nextPath, locale);

  revalidatePath("/", "layout");
  redirect(redirectUrl);
}

export type LogoutActionResult =
  | { success: false; code: "AUTH_UNAVAILABLE" }
  | never;

export async function logoutUser(_prevState: LogoutActionResult | null, formData?: FormData): Promise<LogoutActionResult> {
  const parsedLocale = formData?.get("locale")?.toString() || "";
  const { isLocale, defaultLocale } = await import("@/lib/i18n/config");
  const safeLocale = isLocale(parsedLocale) ? parsedLocale : defaultLocale;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    if (!supabase) {
      return { success: false, code: "AUTH_UNAVAILABLE" };
    }

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      return { success: false, code: "AUTH_UNAVAILABLE" };
    }
  } catch {
    return { success: false, code: "AUTH_UNAVAILABLE" };
  }

  const { getAdminLoginRedirectPath } = await import("@/lib/auth/admin-page-access-core");

  revalidatePath("/", "layout");
  redirect(getAdminLoginRedirectPath(safeLocale));
}

export type AdminOffersPageResult =
  | { ok: true; data: import("@/lib/admin/offers-read-model-core").AdminOffersReadResult & { query: import("@/lib/admin/offers-query").AdminOffersQuery } }
  | { ok: false; code: "ADMIN_OFFERS_UNAVAILABLE" };

export async function getAdminOffersPage(rawInput: unknown): Promise<AdminOffersPageResult> {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  const { parseAdminOffersQuery } = await import("@/lib/admin/offers-query");
  const query = parseAdminOffersQuery(rawInput);

  try {
    const { getAdminOffersReadModel } = await import("@/lib/admin/offers-read-model-core");
    const { db } = await import("@/lib/db");
    const data = await getAdminOffersReadModel(db, query);
    return { ok: true, data: { ...data, query: { ...query, page: data.currentPage } } };
  } catch {
    console.error("Admin offers read query failed.");
    return { ok: false, code: "ADMIN_OFFERS_UNAVAILABLE" };
  }
}



export async function getAdminPartnersPage(rawInput: unknown) {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  const { parseAdminPartnersQuery } = await import("@/lib/admin/partners-query");
  const query = parseAdminPartnersQuery(rawInput);

  try {
    const { getAdminPartnersReadModel } = await import("@/lib/admin/partners-read-model-core");
    const { db } = await import("@/lib/db");
    const readModel = await getAdminPartnersReadModel(db, query);
    return {
      ok: true as const,
      data: {
        ...readModel,
        query: {
          ...query,
          page: readModel.currentPage
        }
      }
    };
  } catch {
    console.error("Admin partners read query failed.");
    return {
      ok: false as const,
      code: "ADMIN_PARTNERS_UNAVAILABLE"
    };
  }
}

export async function getAdminRfqPage(rawInput: unknown) {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  const { parseAdminRfqQuery } = await import("@/lib/admin/rfq-query");
  const query = parseAdminRfqQuery(rawInput);

  try {
    const { getAdminRfqReadModel } = await import("@/lib/admin/rfq-read-model-core");
    const { db } = await import("@/lib/db");

    const readModel = await getAdminRfqReadModel(db, query);

    return {
      ok: true as const,
      data: {
        ...readModel,
        query: {
          ...query,
          page: readModel.currentPage
        }
      }
    };
  } catch {
    console.error("Admin RFQ read query failed.");
    return {
      ok: false as const,
      code: "ADMIN_RFQ_UNAVAILABLE"
    };
  }
}

export async function getAdminOrdersPage(rawInput: unknown) {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  const { parseAdminOrdersQuery } = await import("@/lib/admin/orders-query");
  const query = parseAdminOrdersQuery(rawInput);

  try {
    const { getAdminOrdersReadModel } = await import("@/lib/admin/orders-read-model-core");
    const { db } = await import("@/lib/db");

    const readModel = await getAdminOrdersReadModel(db, query);

    return {
      ok: true as const,
      data: {
        ...readModel,
        query: {
          ...query,
          page: readModel.currentPage
        }
      }
    };
  } catch {
    console.error("Admin orders read query failed.");
    return {
      ok: false as const,
      code: "ADMIN_ORDERS_UNAVAILABLE"
    };
  }
}

export async function changeAdminOfferPublicationState(rawInput: unknown) {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  const { parseAdminOfferPublicationInput, executeOfferPublicationStateChange } = await import("@/lib/admin/offer-publication-core");
  const input = parseAdminOfferPublicationInput(rawInput);

  if (!input) {
    return { ok: false as const, code: "OFFER_INVALID_INPUT" as const };
  }

  const { db } = await import("@/lib/db");
  const result = await executeOfferPublicationStateChange(db, input);

  if (result.ok && result.changed) {
    revalidatePath("/", "layout");
  }

  return result;
}

export async function getAdminPartnerDetail(rawId: string) {
  const { requireAdmin } = await import("@/lib/auth/guards");
  await requireAdmin();

  try {
    const { getAdminPartnerDetailReadModel } = await import("@/lib/admin/partner-detail-read-model-core");
    const { db } = await import("@/lib/db");
    
    return await getAdminPartnerDetailReadModel(db, rawId);
  } catch {
    console.error("Admin partner detail read query failed.");
    return { ok: false as const, code: "SYSTEM_ERROR" as const };
  }
}
