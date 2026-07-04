/**
 * CategoryPageRole — stateless in-memory resolver.
 *
 * Derived exclusively from parentId / parentCategory.parentId
 * that are already fetched in CategoryPage via getCategories().
 * No DB flags, no additional SQL JOIN, no hardcoded slugs.
 */
export type CategoryPageRole = "section" | "group" | "leaf";

export interface ResolveCategoryPageRoleInput {
  /** parentId of the active category (null = root section) */
  activeParentId: number | null;
  /** parentId of the parent category (null = parent is a root section) */
  parentOfParentId: number | null | undefined;
}

/**
 * Resolve the category page role:
 * - section: root category (parentId === null)
 * - group:   child of root (parentId !== null && parent.parentId === null)
 * - leaf:    grandchild or deeper (parentId !== null && parent.parentId !== null)
 */
export function resolveCategoryPageRole({
  activeParentId,
  parentOfParentId,
}: ResolveCategoryPageRoleInput): CategoryPageRole {
  if (activeParentId === null) return "section";
  if (parentOfParentId === null || parentOfParentId === undefined) return "group";
  return "leaf";
}
