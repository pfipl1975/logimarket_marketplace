import type { CatalogExplorerNode } from "@/lib/catalog/navigation";
import type { CatalogCategorySearchResult, NormalizedCatalogSearchQuery } from "./types";

type FlattenedCategory = {
  node: CatalogExplorerNode;
  breadcrumbs: string[];
};

function flattenTree(
  nodes: CatalogExplorerNode[],
  currentBreadcrumbs: string[] = []
): FlattenedCategory[] {
  const result: FlattenedCategory[] = [];
  for (const node of nodes) {
    const breadcrumbs = [...currentBreadcrumbs, node.label];
    result.push({ node, breadcrumbs });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, breadcrumbs));
    }
  }
  return result;
}

export function searchLocalizedCategories(
  tree: CatalogExplorerNode[],
  query: NormalizedCatalogSearchQuery
): CatalogCategorySearchResult[] {
  if (query.isEmpty) return [];

  const flatList = flattenTree(tree);
  const results: CatalogCategorySearchResult[] = [];

  for (const item of flatList) {
    const label = item.node.label.toLocaleLowerCase(query.locale);
    const slug = item.node.slug.toLocaleLowerCase(query.locale);
    const { matchQuery, tokens } = query;

    const allLiteralTermsPresent =
      query.literalTerms.length === 0 ||
      query.literalTerms.every(
        (term) => label.includes(term) || slug.includes(term)
      );

    if (!allLiteralTermsPresent) {
      continue;
    }

    let score = 0;

    if (label === matchQuery) {
      score = 100;
    } else if (label.startsWith(matchQuery)) {
      score = 80;
    } else if (label.includes(matchQuery)) {
      score = 50;
    }

    if (slug === matchQuery) {
      score = Math.max(score, 30);
    } else if (slug.includes(matchQuery)) {
      score = Math.max(score, 20);
    }

    const allTokensPresent =
      tokens.length > 0 && tokens.every((t) => label.includes(t));
    
    if (allTokensPresent) {
      score = Math.max(score, 60);
    }

    if (score > 0) {
      results.push({
        type: "category",
        id: item.node.id,
        slug: item.node.slug,
        label: item.node.label,
        breadcrumbLabels: item.breadcrumbs,
        href: item.node.href,
        score,
      });
    }
  }

  // Sort
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score; // score DESC
    if (a.breadcrumbLabels.length !== b.breadcrumbLabels.length) {
      return a.breadcrumbLabels.length - b.breadcrumbLabels.length; // depth ASC
    }
    const labelCompare = a.label.localeCompare(b.label, query.locale);
    if (labelCompare !== 0) return labelCompare; // label ASC
    return a.id - b.id; // id ASC
  });

  return results.slice(0, query.categoryLimit);
}
