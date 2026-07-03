export interface CatalogCategoryRow {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  createdAt: Date;
}

export interface CatalogCategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  children: CatalogCategoryNode[];
}

export function buildCategoryTree(rows: CatalogCategoryRow[]): CatalogCategoryNode[] {
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
