export interface CatalogCategoryRow {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  createdAt: Date;
}

export type CatalogCategoryTreeRow = Pick<
  CatalogCategoryRow,
  "id" | "name" | "slug" | "parentId"
>;

export interface CatalogCategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  children: CatalogCategoryNode[];
}

export function buildCategoryTree(rows: CatalogCategoryTreeRow[]): CatalogCategoryNode[] {
  const nodesMap = new Map<number, CatalogCategoryNode>();
  const roots: CatalogCategoryNode[] = [];

  // Initialize nodes
  for (const row of rows) {
    const id = Number(row.id);
    const parentId = row.parentId !== null ? Number(row.parentId) : null;
    nodesMap.set(id, {
      id,
      name: row.name,
      slug: row.slug,
      parentId,
      children: [],
    });
  }

  // Build tree
  for (const node of nodesMap.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodesMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Fallback to root if parent not found in list (orphan node)
        roots.push(node);
      }
    }
  }

  return roots;
}

export function getCategoryBreadcrumbs(rows: CatalogCategoryRow[], activeId: number): CatalogCategoryRow[] {
  const rowsMap = new Map<number, CatalogCategoryRow>();
  for (const row of rows) {
    const id = Number(row.id);
    const parentId = row.parentId !== null ? Number(row.parentId) : null;
    rowsMap.set(id, {
      id,
      name: row.name,
      slug: row.slug,
      parentId,
      createdAt: row.createdAt,
    });
  }

  const path: CatalogCategoryRow[] = [];
  let currentId: number | null = activeId;
  const visited = new Set<number>(); // Prevent infinite loop on cycles

  while (currentId !== null && !visited.has(currentId)) {
    visited.add(currentId);
    const node = rowsMap.get(currentId);
    if (!node) break;
    path.unshift(node);
    currentId = node.parentId;
  }

  return path;
}

export function getCategoryDescendantIds(rows: CatalogCategoryRow[], parentId: number): number[] {
  const childrenMap = new Map<number, number[]>();
  for (const row of rows) {
    const id = Number(row.id);
    const pId = row.parentId !== null ? Number(row.parentId) : null;
    if (pId !== null) {
      const existing = childrenMap.get(pId) || [];
      existing.push(id);
      childrenMap.set(pId, existing);
    }
  }

  const descendants: number[] = [];
  const queue: number[] = [parentId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current !== parentId) {
      descendants.push(current);
    }

    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      queue.push(childId);
    }
  }

  return descendants;
}

/**
 * Roll up one grouped SQL result across the category hierarchy in memory.
 * Each public offer has a single owning category and contributes once per ancestor.
 */
export function rollupCategoryOfferCounts(
  rows: readonly CatalogCategoryTreeRow[],
  directRows: readonly { categoryId: number; offerCount: number }[],
): Record<number, number> {
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) throw new Error("DUPLICATE_CATEGORY_ID");
  const direct = new Map<number, number>(rows.map((row) => [row.id, 0]));
  for (const { categoryId, offerCount } of directRows) {
    if (!Number.isSafeInteger(offerCount) || offerCount < 0) throw new Error("INVALID_CATEGORY_OFFER_COUNT");
    if (ids.has(categoryId)) direct.set(categoryId, (direct.get(categoryId) ?? 0) + offerCount);
  }
  const totals: Record<number, number> = {};
  const active = new Set<number>();
  const visited = new Set<number>();
  function walk(node: CatalogCategoryNode): number {
    if (active.has(node.id)) throw new Error("CATEGORY_TREE_CYCLE");
    if (visited.has(node.id)) return totals[node.id];
    active.add(node.id);
    let total = direct.get(node.id) ?? 0;
    for (const child of node.children) total += walk(child);
    active.delete(node.id);
    visited.add(node.id);
    if (!Number.isSafeInteger(total)) throw new Error("CATEGORY_COUNT_OVERFLOW");
    totals[node.id] = total;
    return total;
  }
  for (const root of buildCategoryTree([...rows])) walk(root);
  if (visited.size !== rows.length) throw new Error("CATEGORY_TREE_CYCLE");
  return totals;
}
