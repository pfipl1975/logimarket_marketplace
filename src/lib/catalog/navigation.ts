import { type CatalogCategoryNode } from "@/lib/catalog/tree";
import { resolveCategoryName } from "@/lib/i18n/category-labels";

export type CatalogExplorerNode = {
  id: number;
  slug: string;
  label: string;
  href: string;
  children: CatalogExplorerNode[];
};

export function buildLocalizedExplorerTree(
  nodes: CatalogCategoryNode[],
  categoryFilterBasePath: string,
  localeBySlug?: Record<string, string>,
  fallbackBySlug?: Record<string, string>
): CatalogExplorerNode[] {
  return nodes.map((node) => ({
    id: node.id,
    slug: node.slug,
    label: resolveCategoryName({
      slug: node.slug,
      dbName: node.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${node.slug}`,
    children: buildLocalizedExplorerTree(node.children, categoryFilterBasePath, localeBySlug, fallbackBySlug),
  }));
}

export function getActivePathNodes(
  pathname: string,
  tree: CatalogExplorerNode[]
): { sectionSlug?: string; groupSlug?: string; categorySlug?: string } {
  const match = pathname.match(/\/c-([^/?#]+)/);
  const currentSlug = match ? match[1] : undefined;
  
  if (!currentSlug) return {};

  for (const section of tree) {
    if (section.slug === currentSlug) return { sectionSlug: section.slug };
    for (const group of section.children) {
      if (group.slug === currentSlug) return { sectionSlug: section.slug, groupSlug: group.slug };
      for (const category of group.children) {
        if (category.slug === currentSlug) return { sectionSlug: section.slug, groupSlug: group.slug, categorySlug: category.slug };
      }
    }
  }

  return {};
}
