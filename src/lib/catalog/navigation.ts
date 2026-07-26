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

export function findCatalogNodePath(
  tree: CatalogExplorerNode[],
  targetSlug: string,
  currentPath: CatalogExplorerNode[] = []
): CatalogExplorerNode[] {
  for (const node of tree) {
    const newPath = [...currentPath, node];
    if (node.slug === targetSlug) {
      return newPath;
    }
    const foundPath = findCatalogNodePath(node.children, targetSlug, newPath);
    if (foundPath.length > 0) {
      return foundPath;
    }
  }
  return [];
}

export function getActivePathNodes(
  pathname: string,
  tree: CatalogExplorerNode[]
): { sectionSlug?: string; groupSlug?: string; categorySlug?: string; pathSlugs: string[] } {
  const match = pathname.match(/\/c-([^/?#]+)/);
  const currentSlug = match ? match[1] : undefined;
  
  if (!currentSlug) return { pathSlugs: [] };

  const path = findCatalogNodePath(tree, currentSlug);
  if (path.length === 0) return { pathSlugs: [] };

  return {
    sectionSlug: path[0]?.slug,
    groupSlug: path[1]?.slug,
    categorySlug: path.length >= 3 ? path[path.length - 1].slug : undefined,
    pathSlugs: path.map(n => n.slug),
  };
}
