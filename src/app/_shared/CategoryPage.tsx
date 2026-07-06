import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getCategoryOffers } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { OfferCard } from "@/components/OfferCard";
import { OfferProcurementListRow } from "@/components/offers/OfferProcurementListRow";
import { CategoryOfferFilters } from "@/components/catalog/CategoryOfferFilters";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath, getOfferPath } from "@/lib/i18n/paths";
import { absoluteUrl } from "@/lib/seo/urls";
import {
  buildCategoryOfferQueryHref,
  hasActiveCategoryOfferFilters,
  type CategoryOfferFilters as CategoryOfferFiltersState,
  type OfferModelFilter,
} from "@/lib/catalog/query";
import { getCategoryBreadcrumbs, buildCategoryTree, type CatalogCategoryNode } from "@/lib/catalog/tree";
import { resolveCategoryPageRole } from "@/lib/catalog/page-role";
import { JsonLdScript, createCategoryItemListJsonLd, createFaqPageJsonLd } from "@/lib/seo/json-ld";
import { defaultLocale } from "@/lib/i18n/config";
import { CatalogCategoryExplorer } from "@/components/catalog/CatalogCategoryExplorer";
import { CategoryDecisionGuidance } from "@/components/catalog/CategoryDecisionGuidance";
import { CategoryTechnicalParameters } from "@/components/catalog/CategoryTechnicalParameters";
import { CategoryRelatedLinks } from "@/components/catalog/CategoryRelatedLinks";
import { CategoryInquiryChecklist } from "@/components/catalog/CategoryInquiryChecklist";
import { CategoryFaqBlock } from "@/components/catalog/CategoryFaqBlock";
import { getCategoryContent } from "@/lib/catalog/content";
import { resolveRelatedCategoryLinks } from "@/lib/catalog/content/related";
import { CategoryTreeSidebar } from "@/components/catalog/CategoryTreeSidebar";
import type { Locale } from "@/lib/i18n/types";
import type { CatalogOffer } from "@/app/actions";
import { resolveGlossaryLinksForCategory } from "@/lib/glossary";

interface CategoryPageProps {
  locale: Locale;
  categorySlug: string; // dbSlug (without 'c-' prefix)
  view?: "grid" | "list";
  filters?: CategoryOfferFiltersState;
}

const blockHeadings = {
  pl: {
    decisionGuidance: "Wskazówki decyzyjne / Kryteria wyboru",
    technicalParameters: "Specyfikacja i parametry techniczne",
    inquiryChecklist: "Lista kontrolna zapytania (RFQ) — Co przygotować do wyceny?",
    faq: "Często zadawane pytania (FAQ)",
    relatedLinks: "Powiązane kategorie i rozwiązania",
  },
  en: {
    decisionGuidance: "Decision Guidance / Selection Criteria",
    technicalParameters: "Technical Specification & Parameters",
    inquiryChecklist: "Inquiry Checklist (RFQ) — What to prepare?",
    faq: "Frequently Asked Questions (FAQ)",
    relatedLinks: "Related Categories & Solutions",
  },
  de: {
    decisionGuidance: "Entscheidungshilfe / Auswahlkriterien",
    technicalParameters: "Technische Spezifikationen & Parameter",
    inquiryChecklist: "Anfrage-Checkliste (RFQ) — Was ist vorzubereiten?",
    faq: "Häufig gestellte Fragen (FAQ)",
    relatedLinks: "Verwandte Kategorien & Lösungen",
  },
  fr: {
    decisionGuidance: "Guide de décision / Critères de sélection",
    technicalParameters: "Spécifications techniques & paramètres",
    inquiryChecklist: "Liste de contrôle de demande (RFQ) — Que préparer ?",
    faq: "Foire aux questions (FAQ)",
    relatedLinks: "Catégories & solutions associées",
  },
  uk: {
    decisionGuidance: "Рекомендації щодо вибору / Критерії",
    technicalParameters: "Технічні характеристики та параметри",
    inquiryChecklist: "Контрольний список запиту (RFQ) — Що підготувати?",
    faq: "Часті питання (FAQ)",
    relatedLinks: "Пов'язані категорії та рішення",
  },
  es: {
    decisionGuidance: "Guía de decisión / Criterios de selección",
    technicalParameters: "Especificaciones técnicas y parámetros",
    inquiryChecklist: "Lista de verificación de consulta (RFQ) — ¿Qué preparar?",
    faq: "Preguntas frecuentes (FAQ)",
    relatedLinks: "Categorías y soluciones relacionadas",
  },
  zh: {
    decisionGuidance: "决策指南 / 选择标准",
    technicalParameters: "技术规范与参数",
    inquiryChecklist: "询价清单 (RFQ) — 准备工作",
    faq: "常见问题解答 (FAQ)",
    relatedLinks: "相关类别 & 解决方案",
  },
};

function PackageIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-none stroke-current"
        d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function offerMatchesModel(offer: CatalogOffer, model: OfferModelFilter): boolean {
  if (model === "ecommerce") {
    return offer.offerModel === "ecommerce";
  }

  if (model === "rfq") {
    return offer.offerModel !== "ecommerce" && offer.conversionType === "rfq";
  }

  return offer.offerModel !== "ecommerce" && offer.conversionType === "outbound";
}

function applyCategoryOfferFilters(
  offers: CatalogOffer[],
  filters: CategoryOfferFiltersState,
): CatalogOffer[] {
  return offers.filter((offer) => {
    if (filters.model && !offerMatchesModel(offer, filters.model)) {
      return false;
    }

    if (filters.featured && !offer.isFeatured) {
      return false;
    }

    return true;
  });
}

export async function CategoryPage({
  locale,
  categorySlug,
  view = "grid",
  filters = {},
}: CategoryPageProps) {
  const [dict, category, allCategories, offers] = await Promise.all([
    getDictionary(locale),
    getCategoryBySlug(categorySlug),
    getCategories(),
    getCategoryOffers(categorySlug),
  ]);

  const fallbackDict =
    locale === defaultLocale ? dict : await getDictionary(defaultLocale);

  if (!category) {
    notFound();
  }

  const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
  const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;
  const localeIntrosBySlug = dict.categories?.introsBySlug as Record<string, string> | undefined;
  const fallbackIntrosBySlug = fallbackDict.categories?.introsBySlug as Record<string, string> | undefined;

  const activeCategoryLabel = resolveCategoryName({
    slug: category.slug,
    dbName: category.name,
    localeBySlug,
    fallbackBySlug,
  });

  const activeCategoryIntro = resolveCategoryIntro({
    slug: category.slug,
    localeIntrosBySlug,
    fallbackIntrosBySlug,
    fallbackIntro: "",
  });

  const technicalAttributeLabels = dict.technicalAttributes.labels as Record<string, string>;

  // ── Tree + subcategory resolution ─────────────────────────────────────────
  const categoryTree = buildCategoryTree(allCategories);

  const findNode = (nodes: CatalogCategoryNode[], targetId: number): CatalogCategoryNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      const found = findNode(node.children, targetId);
      if (found) return found;
    }
    return null;
  };

  const activeNode = findNode(categoryTree, category.id);
  const subcategories = activeNode ? activeNode.children : [];

  const parentCategory = category.parentId !== null
    ? allCategories.find((c) => c.id === category.parentId) ?? null
    : null;

  // ── PageRole (stateless, in-memory, no DB flags, no extra SQL) ────────────
  const pageRole = resolveCategoryPageRole({
    activeParentId: category.parentId,
    parentOfParentId: parentCategory?.parentId,
  });

  // ── Breadcrumbs ───────────────────────────────────────────────────────────
  const breadcrumbs = getCategoryBreadcrumbs(allCategories, category.id);
  const categoryFilterBasePath = getHomePath(locale);

  // ── Explorer tree ─────────────────────────────────────────────────────────
  const explorerTree = categoryTree.map((section) => ({
    id: section.id,
    slug: section.slug,
    label: resolveCategoryName({
      slug: section.slug,
      dbName: section.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${section.slug}`,
    children: section.children.map((group) => ({
      id: group.id,
      slug: group.slug,
      label: resolveCategoryName({
        slug: group.slug,
        dbName: group.name,
        localeBySlug,
        fallbackBySlug,
      }),
      href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${group.slug}`,
      children: group.children.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        label: resolveCategoryName({
          slug: cat.slug,
          dbName: cat.name,
          localeBySlug,
          fallbackBySlug,
        }),
        href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${cat.slug}`,
        children: [],
      })),
    })),
  }));

  const explorerLabels = {
    trigger: dict.catalog.categoriesAria,
    close: dict.common.close,
    allCategories: dict.catalog.allCategories,
  };

  const initialActiveSectionSlug = breadcrumbs.length > 0 ? breadcrumbs[0].slug : undefined;

  // ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────
  const catalogPath = `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog`;
  const canonicalPath = `${catalogPath}/c-${category.slug}`;
  const canonicalUrl = absoluteUrl(canonicalPath);

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: dict.nav.catalog,
      item: absoluteUrl(catalogPath),
    },
    ...breadcrumbs.map((bc, idx) => ({
      "@type": "ListItem",
      position: idx + 2,
      name: resolveCategoryName({
        slug: bc.slug,
        dbName: bc.name,
        localeBySlug,
        fallbackBySlug,
      }),
      item: absoluteUrl(`${catalogPath}/c-${bc.slug}`),
    })),
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems,
  };

  // ── JSON-LD: CollectionPage ───────────────────────────────────────────────
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collection`,
    "url": canonicalUrl,
    "name": activeCategoryLabel,
    "description": activeCategoryIntro || `${activeCategoryLabel} - ${dict.meta.description}`,
  };

  // ── JSON-LD: ItemList (role-aware, no Product schema) ────────────────────
  const itemListItems = (() => {
    if (pageRole === "leaf") {
      return offers.map((offer) => ({
        name: offer.title,
        url: absoluteUrl(getOfferPath(locale, String(offer.id))),
      }));
    }
    return subcategories.map((sub: CatalogCategoryNode) => ({
      name: resolveCategoryName({
        slug: sub.slug,
        dbName: sub.name,
        localeBySlug,
        fallbackBySlug,
      }),
      url: absoluteUrl(`${catalogPath}/c-${sub.slug}`),
    }));
  })();

  const itemListJsonLd = createCategoryItemListJsonLd({
    pageUrl: canonicalUrl,
    items: itemListItems,
  });

  // ── Retrieve static content (Hybrid Model C: stateless TS seed) ───────────
  const categoryContent = getCategoryContent(locale, category.slug);

  const decisionGuidanceItems = categoryContent?.decisionFactors || null;

  const technicalParams = (() => {
    if (!categoryContent?.technicalParameters) return null;
    const params: Record<string, string> = {};
    for (const item of categoryContent.technicalParameters) {
      params[item.label] = item.value;
    }
    return params;
  })();

  const relatedLinks = (() => {
    const resolved = resolveRelatedCategoryLinks({
      edges: categoryContent?.relatedCategoryEdges,
      allCategories,
      locale,
      categoryFilterBasePath,
      localeBySlug,
      fallbackBySlug,
    });
    return resolved.length > 0 ? resolved : null;
  })();

  const inquiryChecklistGroups = categoryContent?.inquiryChecklist?.groups || null;
  const inquiryChecklistDescription = categoryContent?.inquiryChecklist?.description || null;
  const faqItems = categoryContent?.faq || null;
  const glossaryLinks = resolveGlossaryLinksForCategory(category.slug, locale as any);

  // ── JSON-LD: FAQPage ──────────────────────────────────────────────────────
  const faqJsonLd = createFaqPageJsonLd({
    faq: faqItems,
    pageUrl: canonicalUrl,
  });

  const headings = blockHeadings[locale] || blockHeadings.pl;
  const viewBasePath = `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${category.slug}`;
  const queryState = { view, filters };
  const hasActiveFilters = hasActiveCategoryOfferFilters(filters);
  const filteredOffers = applyCategoryOfferFilters(offers, filters);
  const renderedOffers = hasActiveFilters ? filteredOffers : offers;
  const gridHref = buildCategoryOfferQueryHref(viewBasePath, queryState, { view: "grid" });
  const listHref = buildCategoryOfferQueryHref(viewBasePath, queryState, { view: "list" });
  const clearFiltersHref = buildCategoryOfferQueryHref(viewBasePath, queryState, {
    clearFilters: true,
  });
  const renderedOfferCountLabel = `${renderedOffers.length} ${
    renderedOffers.length === 1 ? dict.catalog.offerCountOne : dict.catalog.offerCountOther
  }`;
  const offerCountLabel = hasActiveFilters
    ? `${dict.catalog.filtersResultsLabel}: ${renderedOfferCountLabel} / ${offers.length}`
    : renderedOfferCountLabel;

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      {/* ── JSON-LD injection ───────────────────────────────────────────── */}
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={collectionJsonLd} />
      {itemListJsonLd && <JsonLdScript data={itemListJsonLd} />}
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}

      <SiteHeader
        locale={locale}
        languageLinks={{
          pl: `/katalog/c-${category.slug}`,
          en: `/en/katalog/c-${category.slug}`,
          de: `/de/katalog/c-${category.slug}`,
          fr: `/fr/katalog/c-${category.slug}`,
          es: `/es/katalog/c-${category.slug}`,
          uk: `/uk/katalog/c-${category.slug}`,
          zh: `/zh/katalog/c-${category.slug}`,
        }}
        navLabels={dict.nav}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">

        {/* ── Breadcrumbs nav ──────────────────────────────────────────── */}
        <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href={categoryFilterBasePath === "/" ? "/katalog" : `${categoryFilterBasePath}/katalog`}
            className="hover:text-foreground transition-colors"
          >
            {dict.nav.catalog}
          </Link>
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const bcLabel = resolveCategoryName({
              slug: bc.slug,
              dbName: bc.name,
              localeBySlug,
              fallbackBySlug,
            });
            return (
              <span key={bc.id} className="flex items-center gap-1.5">
                <span>/</span>
                {isLast ? (
                  <span className="font-semibold text-foreground" aria-current="page">
                    {bcLabel}
                  </span>
                ) : (
                  <Link
                    href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${bc.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {bcLabel}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* ── Category explorer ────────────────────────────────────────── */}
        <div className="z-30 mb-6">
          <CatalogCategoryExplorer
            key={initialActiveSectionSlug}
            tree={explorerTree}
            labels={explorerLabels}
            initialActiveSectionSlug={initialActiveSectionSlug}
          />
        </div>

        <details className="mb-6 rounded border border-border bg-white p-4 shadow-sm lg:hidden">
          <summary className="cursor-pointer list-none text-sm font-bold uppercase tracking-wide text-brand-navy transition-colors hover:text-brand-teal">
            {dict.catalog.mobileCategoryNavigationSummary}
          </summary>
          <div className="mt-4 border-t border-border pt-4">
            <CategoryTreeSidebar
              tree={categoryTree}
              activeSlug={category.slug}
              categoryFilterBasePath={categoryFilterBasePath}
              navigationLabel={dict.catalog.treeNavigationAria}
              headingLabel={dict.catalog.treeNavigationHeading}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
              localeBySlug={localeBySlug}
              fallbackBySlug={fallbackBySlug}
            />
          </div>
        </details>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <aside className="hidden lg:block w-72 shrink-0 lg:sticky lg:top-24">
            <CategoryTreeSidebar
              tree={categoryTree}
              activeSlug={category.slug}
              categoryFilterBasePath={categoryFilterBasePath}
              navigationLabel={dict.catalog.treeNavigationAria}
              headingLabel={dict.catalog.treeNavigationHeading}
              localeBySlug={localeBySlug}
              fallbackBySlug={fallbackBySlug}
            />
          </aside>

          <div className="min-w-0 flex-1 w-full">
            {/* ── Hero / header section ─────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
            {activeCategoryLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {offers.length} {offers.length === 1 ? dict.catalog.offerCountOne : dict.catalog.offerCountOther}
          </p>
          {activeCategoryIntro && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              {activeCategoryIntro}
            </p>
          )}
          {categoryContent?.definition && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed border-l-2 border-brand-teal pl-3">
              {categoryContent.definition}
            </p>
          )}
        </div>

        {/* ── Subcategory navigation (Section → groups, Group → leaf chips) */}
        {pageRole !== "leaf" && subcategories.length > 0 && (
          <div className="mt-8 border-t border-border pt-8 mb-10">
            <h2 className="text-xl font-bold text-brand-navy mb-6">
              {dict.catalog.allCategories}
            </h2>

            {pageRole === "section" ? (
              /* Section: Grid of group cards with their leaf links */
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subcategories.map((group: CatalogCategoryNode) => {
                  const groupLabel = resolveCategoryName({
                    slug: group.slug,
                    dbName: group.name,
                    localeBySlug,
                    fallbackBySlug,
                  });
                  return (
                    <div key={group.id} className="rounded-lg border border-border bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-brand-navy mb-3">
                        <Link
                          href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${group.slug}`}
                          className="hover:text-brand-teal transition-colors"
                        >
                          {groupLabel}
                        </Link>
                      </h3>
                      {group.children.length > 0 && (
                        <ul className="space-y-1.5 border-t border-gray-50 pt-2.5">
                          {group.children.map((cat: CatalogCategoryNode) => {
                            const catLabel = resolveCategoryName({
                              slug: cat.slug,
                              dbName: cat.name,
                              localeBySlug,
                              fallbackBySlug,
                            });
                            return (
                              <li key={cat.id}>
                                <Link
                                  href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${cat.slug}`}
                                  className="text-xs text-muted-foreground hover:text-brand-teal transition-colors"
                                >
                                  {catLabel}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Group: Leaf children as pill chips */
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub: CatalogCategoryNode) => {
                  const subLabel = resolveCategoryName({
                    slug: sub.slug,
                    dbName: sub.name,
                    localeBySlug,
                    fallbackBySlug,
                  });
                  return (
                    <Link
                      key={sub.id}
                      href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${sub.slug}`}
                      className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-all hover:border-brand-teal hover:text-brand-teal"
                    >
                      {subLabel}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Optional content slots (null = no DOM output) ────────────── */}
        <CategoryDecisionGuidance
          items={decisionGuidanceItems}
          heading={headings.decisionGuidance}
        />
        <CategoryTechnicalParameters
          params={technicalParams}
          heading={headings.technicalParameters}
        />
        <CategoryInquiryChecklist
          groups={inquiryChecklistGroups}
          heading={headings.inquiryChecklist}
          description={inquiryChecklistDescription}
        />

        {/* ── Offer filters + listing ──────────────────────────────────── */}
        {offers.length > 0 && (
          <CategoryOfferFilters
            basePath={viewBasePath}
            view={view}
            filters={filters}
            labels={{
              filtersHeading: dict.catalog.filtersHeading,
              filtersSummary: dict.catalog.filtersSummary,
              filtersAll: dict.catalog.filtersAll,
              filtersClear: dict.catalog.filtersClear,
              filtersModelHeading: dict.catalog.filtersModelHeading,
              filtersModelRfq: dict.catalog.filtersModelRfq,
              filtersModelEcommerce: dict.catalog.filtersModelEcommerce,
              filtersModelOutbound: dict.catalog.filtersModelOutbound,
              filtersFeaturedOnly: dict.catalog.filtersFeaturedOnly,
            }}
          />
        )}

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              {dict.catalog.allOffers}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {offerCountLabel}
            </p>
          </div>

          <nav aria-label={dict.offers.viewSwitcherAria} className="flex w-fit overflow-hidden rounded border border-border">
            <Link
              href={gridHref}
              aria-current={view === "grid" ? "page" : undefined}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "grid"
                  ? "bg-brand-navy text-white"
                  : "bg-white text-brand-navy hover:bg-gray-50"
              }`}
            >
              {dict.offers.gridView}
            </Link>
            <Link
              href={listHref}
              aria-current={view === "list" ? "page" : undefined}
              className={`border-l border-border px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "list"
                  ? "bg-brand-navy text-white"
                  : "bg-white text-brand-navy hover:bg-gray-50"
              }`}
            >
              {dict.offers.listView}
            </Link>
          </nav>
        </div>

        {renderedOffers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
            <PackageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">
              {hasActiveFilters ? dict.catalog.filtersEmptyTitle : dict.catalog.emptyTitle}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {hasActiveFilters
                ? dict.catalog.filtersEmptyDescription
                : dict.catalog.emptyDescription}
            </p>
            {hasActiveFilters && (
              <Link
                href={clearFiltersHref}
                className="mt-2 rounded border border-border bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
              >
                {dict.catalog.filtersClear}
              </Link>
            )}
          </div>
        ) : view === "list" ? (
          <div className="mt-6 flex flex-col gap-3">
            {renderedOffers.map((offer) => (
              <OfferProcurementListRow
                key={offer.id}
                offer={offer}
                detailHref={getOfferPath(locale, String(offer.id))}
                offerLabels={dict.offers}
                ctaLabels={dict.cta}
                rfqLabels={dict.rfq}
                formLabels={dict.form}
                systemLabels={dict.system}
                closeLabel={dict.common.close}
                categoryLabels={localeBySlug || {}}
                technicalAttributeLabels={technicalAttributeLabels}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {renderedOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                detailHref={getOfferPath(locale, String(offer.id))}
                offerLabels={dict.offers}
                ctaLabels={dict.cta}
                rfqLabels={dict.rfq}
                formLabels={dict.form}
                systemLabels={dict.system}
                closeLabel={dict.common.close}
                categoryLabels={localeBySlug || {}}
                technicalAttributeLabels={technicalAttributeLabels}
              />
            ))}
          </div>
        )}

        {/* ── Optional lower content slots (FAQ + related) ─────────────── */}
        <CategoryFaqBlock
          items={faqItems}
          heading={headings.faq}
        />

        {/* Słownik branżowy - Powiązane pojęcia */}
        {(locale === "pl" || locale === "en" || locale === "de") && glossaryLinks && glossaryLinks.length > 0 && (() => {
          const secLabels = {
            pl: { sectionTitle: "Pojęcia branżowe", viewDefinition: "Definicja pojęcia" },
            en: { sectionTitle: "Industry terms", viewDefinition: "Term definition" },
            de: { sectionTitle: "Fachbegriffe", viewDefinition: "Definition anzeigen" }
          };
          const activeLabels = secLabels[locale as "pl" | "en" | "de"] || secLabels.pl;

          return (
            <div className="mt-8 border-t border-border pt-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal block mb-3">
                {activeLabels.sectionTitle}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {glossaryLinks.map((link) => (
                  <div key={link.slug} className="border border-border bg-white p-4 rounded-none shadow-none flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-brand-navy mb-1.5">
                        <Link href={link.href} className="hover:text-brand-teal transition-colors">
                          {link.term}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {link.shortDefinition}
                      </p>
                    </div>
                    <div className="mt-3 text-right">
                      <Link href={link.href} className="text-xs font-semibold text-brand-teal hover:underline inline-flex items-center gap-1">
                        {activeLabels.viewDefinition} <span>→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <CategoryRelatedLinks
          links={relatedLinks}
          heading={headings.relatedLinks}
        />

          </div>
        </div>

      </main>

      <SiteFooter
        locale={locale}
        navLabels={dict.nav}
        footerLabels={dict.footer}
      />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
      />
    </div>
  );
}
