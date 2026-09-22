import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { getGroupIconPath, getSectionIconPath } from "@/lib/catalog/group-icons";
import { absoluteUrl } from "@/lib/seo/urls";
import { localeLanguageTags } from "@/lib/seo/site";
import type { BreadcrumbJsonLdItem, JsonLdValue } from "@/lib/seo/json-ld";
import type { CatalogCategoryNode } from "@/lib/catalog/tree";
import type { Locale } from "@/lib/i18n/config";

// ─── View model ─────────────────────────────────────────────────────────────
// Roles derive exclusively from tree depth (TAXONOMY_ROLE_SOURCE=TREE_DEPTH):
// depth 0 = section, depth 1 = group, depth 2+ = category. The taxonomy is
// never flattened and never re-sorted; input (DB ORDER BY name) order is kept.

export interface CatalogHomeCategoryNode {
  readonly role: "category";
  id: number;
  slug: string;
  label: string;
  href: string | null;
  depth: number; // >= 2
  parentId: number | null;
  iconPath: null; // categories never render icons; helpers are not called
  children: CatalogHomeCategoryNode[];
}

export interface CatalogHomeGroupNode {
  readonly role: "group";
  id: number;
  slug: string;
  label: string;
  href: string | null;
  depth: 1;
  parentId: number | null;
  iconPath: string;
  categoryCount: number; // all descendants at depth >= 2
  children: CatalogHomeCategoryNode[];
}

export interface CatalogHomeSectionNode {
  readonly role: "section";
  id: number;
  slug: string;
  label: string;
  href: string | null;
  depth: 0;
  parentId: number | null;
  iconPath: string;
  anchorId: string;
  groupCount: number; // direct children at depth 1
  categoryCount: number; // all descendants at depth >= 2
  children: CatalogHomeGroupNode[];
}

export type CatalogHomeNode =
  | CatalogHomeSectionNode
  | CatalogHomeGroupNode
  | CatalogHomeCategoryNode;

export interface BuildCatalogHomeSectionsInput {
  categoryTree: CatalogCategoryNode[];
  basePath: string; // getHomePath(locale): "/" for PL, "/en" etc. otherwise
  routeableSlugSet: Set<string>;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}

// ─── Anchors ────────────────────────────────────────────────────────────────

export function createCatalogSectionAnchorId(slug: string, id: number): string {
  return `catalog-section-${slug}-${id}`;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function resolveNodeHref(
  basePath: string,
  slug: string,
  routeableSlugSet: Set<string>,
): string | null {
  if (!routeableSlugSet.has(slug)) return null;
  const prefix = basePath === "/" ? "" : basePath;
  return `${prefix}/katalog/c-${slug}`;
}

function countDescendants(node: CatalogCategoryNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  );
}

// ─── Projection ─────────────────────────────────────────────────────────────

function buildCategoryNode(
  node: CatalogCategoryNode,
  basePath: string,
  routeableSlugSet: Set<string>,
  localeBySlug: Record<string, string> | undefined,
  fallbackBySlug: Record<string, string> | undefined,
  depth: number,
): CatalogHomeCategoryNode {
  return {
    role: "category",
    id: node.id,
    slug: node.slug,
    label: resolveCategoryName({
      slug: node.slug,
      dbName: node.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: resolveNodeHref(basePath, node.slug, routeableSlugSet),
    depth,
    parentId: node.parentId,
    iconPath: null,
    children: node.children.map((child) =>
      buildCategoryNode(
        child,
        basePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
        depth + 1,
      ),
    ),
  };
}

function buildGroupNode(
  node: CatalogCategoryNode,
  basePath: string,
  routeableSlugSet: Set<string>,
  localeBySlug: Record<string, string> | undefined,
  fallbackBySlug: Record<string, string> | undefined,
): CatalogHomeGroupNode {
  return {
    role: "group",
    id: node.id,
    slug: node.slug,
    label: resolveCategoryName({
      slug: node.slug,
      dbName: node.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: resolveNodeHref(basePath, node.slug, routeableSlugSet),
    depth: 1,
    parentId: node.parentId,
    iconPath: getGroupIconPath(node.slug),
    categoryCount: countDescendants(node),
    children: node.children.map((child) =>
      buildCategoryNode(
        child,
        basePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
        2,
      ),
    ),
  };
}

export function buildCatalogHomeSections({
  categoryTree,
  basePath,
  routeableSlugSet,
  localeBySlug,
  fallbackBySlug,
}: BuildCatalogHomeSectionsInput): CatalogHomeSectionNode[] {
  return categoryTree.map((section) => {
    const groups = section.children.map((group) =>
      buildGroupNode(
        group,
        basePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
      ),
    );

    return {
      role: "section",
      id: section.id,
      slug: section.slug,
      label: resolveCategoryName({
        slug: section.slug,
        dbName: section.name,
        localeBySlug,
        fallbackBySlug,
      }),
      href: resolveNodeHref(basePath, section.slug, routeableSlugSet),
      depth: 0,
      parentId: section.parentId,
      iconPath: getSectionIconPath(section.slug),
      anchorId: createCatalogSectionAnchorId(section.slug, section.id),
      groupCount: groups.length,
      categoryCount: groups.reduce((sum, group) => sum + group.categoryCount, 0),
      children: groups,
    };
  });
}

// ─── Breadcrumb JSON-LD ─────────────────────────────────────────────────────

export function buildCatalogHomeBreadcrumbItems({
  homeUrl,
  catalogUrl,
  homeName,
  catalogName,
}: {
  homeUrl: string;
  catalogUrl: string;
  homeName: string;
  catalogName: string;
}): BreadcrumbJsonLdItem[] {
  return [
    { name: homeName, url: homeUrl },
    { name: catalogName, url: catalogUrl },
  ];
}

// ─── ItemList entries (inline in CollectionPage, never a standalone script) ──

export interface CatalogHomeItemListEntry {
  name: string;
  url: string;
}

export function flattenCatalogHomeItemListEntries(
  sections: CatalogHomeSectionNode[],
): CatalogHomeItemListEntry[] {
  const entries: CatalogHomeItemListEntry[] = [];
  for (const section of sections) {
    if (section.href === null) continue; // non-routeable: stays in HTML only
    entries.push({ name: section.label, url: absoluteUrl(section.href) });
  }
  return entries;
}

// ─── CollectionPage JSON-LD ─────────────────────────────────────────────────
// Mirrors the authority identifiers used by createGlobalAuthorityJsonLd in
// src/lib/seo/json-ld.tsx (Organization/WebSite are emitted globally; they are
// referenced here by @id only, never re-declared).

const websiteId = "https://www.logimarket.eu/#website";
const organizationId = "https://www.logimarket.eu/#organization";

export function buildCatalogHomeCollectionPageJsonLd({
  sections,
  pageUrl,
  name,
  description,
  locale,
}: {
  sections: CatalogHomeSectionNode[];
  pageUrl: string;
  name: string;
  description: string;
  locale: Locale;
}): JsonLdValue {
  const itemListEntries = flattenCatalogHomeItemListEntries(sections);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    "url": pageUrl,
    "name": name,
    "description": description,
    "inLanguage": localeLanguageTags[locale],
    "isPartOf": {
      "@id": websiteId,
    },
    "publisher": {
      "@id": organizationId,
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": itemListEntries.map((entry, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": entry.name,
        "url": entry.url,
      })),
    },
  };
}
