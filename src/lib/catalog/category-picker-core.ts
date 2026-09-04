import { CatalogCategoryNode, CatalogCategoryTreeRow, buildCategoryTree } from "./tree";

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

export interface DrillDownItem extends CategoryItem {
  hasChildren: boolean;
  isLeaf: boolean;
}

export interface DrillDownState {
  currentParentId: number | null;
  navigationPath: CategoryItem[];
  visibleItems: DrillDownItem[];
  selectedLeaf: CategoryItem | null;
  selectedPath: CategoryItem[];
}

export interface SearchResultItem extends DrillDownItem {
  path: CategoryItem[];
  pathFormatted: string;
}

/**
 * Returns direct children of a given parentId (or roots if parentId is null),
 * strictly preserving the canonical ordering of the input categories.
 */
export function getDirectChildren(
  categories: CategoryItem[],
  parentId: number | null
): DrillDownItem[] {
  const children = categories.filter((c) => c.parentId === parentId);
  return children.map((item) => {
    const hasChildren = categories.some((c) => c.parentId === item.id);
    return {
      ...item,
      hasChildren,
      isLeaf: !hasChildren,
    };
  });
}

/**
 * Checks whether a category is a leaf (has no children).
 */
export function isLeafCategory(categories: CategoryItem[], categoryId: number): boolean {
  return !categories.some((c) => c.parentId === categoryId);
}

/**
 * Builds the full category path from root down to the given categoryId.
 */
export function buildCategoryPath(
  categories: CategoryItem[],
  categoryId: number
): CategoryItem[] {
  const catMap = new Map<number, CategoryItem>();
  for (const c of categories) {
    catMap.set(c.id, c);
  }

  const path: CategoryItem[] = [];
  let curr = catMap.get(categoryId);
  const visited = new Set<number>();

  while (curr) {
    if (visited.has(curr.id)) break;
    visited.add(curr.id);
    path.unshift(curr);
    curr = curr.parentId !== null ? catMap.get(curr.parentId) : undefined;
  }

  return path;
}

/**
 * Searches categories matching the query (by name or slug), returning breadcrumb path for disambiguation.
 */
export function searchCategories(
  categories: CategoryItem[],
  query: string
): SearchResultItem[] {
  const norm = query.trim().toLowerCase();
  if (!norm) return [];

  const matched = categories.filter(
    (c) => c.name.toLowerCase().includes(norm) || c.slug.toLowerCase().includes(norm)
  );

  return matched.map((item) => {
    const hasChildren = categories.some((c) => c.parentId === item.id);
    const path = buildCategoryPath(categories, item.id);
    return {
      ...item,
      hasChildren,
      isLeaf: !hasChildren,
      path,
      pathFormatted: path.map((p) => p.name).join(" → "),
    };
  });
}

/**
 * Initializes drill-down state at root level (parentId === null).
 */
export function initDrillDown(categories: CategoryItem[]): DrillDownState {
  return {
    currentParentId: null,
    navigationPath: [],
    visibleItems: getDirectChildren(categories, null),
    selectedLeaf: null,
    selectedPath: [],
  };
}

/**
 * Navigates into a category.
 * If the category is a leaf, marks it selected and captures full selectedPath.
 * If the category has children, drills down to its direct children and updates navigationPath.
 */
export function drillDownNavigate(
  categories: CategoryItem[],
  state: DrillDownState,
  targetId: number
): DrillDownState {
  const target = categories.find((c) => c.id === targetId);
  if (!target) return state;

  const hasChildren = categories.some((c) => c.parentId === target.id);

  if (!hasChildren) {
    // Leaf node selected!
    const fullPath = buildCategoryPath(categories, target.id);
    return {
      ...state,
      selectedLeaf: target,
      selectedPath: fullPath,
      visibleItems: [],
    };
  }

  // Non-leaf: drill down
  const newNavigationPath = [...state.navigationPath, target];
  return {
    currentParentId: target.id,
    navigationPath: newNavigationPath,
    visibleItems: getDirectChildren(categories, target.id),
    selectedLeaf: null,
    selectedPath: [],
  };
}

/**
 * Navigates one level back up the hierarchy.
 */
export function drillDownBack(
  categories: CategoryItem[],
  state: DrillDownState
): DrillDownState {
  if (state.navigationPath.length === 0) {
    return state;
  }

  if (state.navigationPath.length === 1) {
    return initDrillDown(categories);
  }

  const newPath = state.navigationPath.slice(0, -1);
  const newParent = newPath[newPath.length - 1];

  return {
    currentParentId: newParent.id,
    navigationPath: newPath,
    visibleItems: getDirectChildren(categories, newParent.id),
    selectedLeaf: null,
    selectedPath: [],
  };
}

/**
 * Jumps to an ancestor in the navigationPath (or root if index < 0),
 * resetting all deeper descendant navigation.
 */
export function drillDownJumpToAncestor(
  categories: CategoryItem[],
  state: DrillDownState,
  ancestorIndex: number
): DrillDownState {
  if (ancestorIndex < 0) {
    return initDrillDown(categories);
  }

  if (ancestorIndex >= state.navigationPath.length) {
    return state;
  }

  const newPath = state.navigationPath.slice(0, ancestorIndex + 1);
  const target = newPath[newPath.length - 1];

  return {
    currentParentId: target.id,
    navigationPath: newPath,
    visibleItems: getDirectChildren(categories, target.id),
    selectedLeaf: null,
    selectedPath: [],
  };
}

/**
 * Resets leaf selection so the user can change category while keeping current drill-down position.
 */
export function drillDownResetSelection(
  categories: CategoryItem[],
  state: DrillDownState
): DrillDownState {
  return {
    ...state,
    selectedLeaf: null,
    selectedPath: [],
    visibleItems: getDirectChildren(categories, state.currentParentId),
  };
}

/**
 * Direct selection of a leaf (e.g. from search results).
 */
export function drillDownSelectLeafDirect(
  categories: CategoryItem[],
  leafId: number
): DrillDownState {
  const target = categories.find((c) => c.id === leafId);
  if (!target || categories.some((c) => c.parentId === target.id)) {
    return initDrillDown(categories);
  }

  const fullPath = buildCategoryPath(categories, target.id);
  const parentPath = fullPath.slice(0, -1);
  const parentId = parentPath.length > 0 ? parentPath[parentPath.length - 1].id : null;

  return {
    currentParentId: parentId,
    navigationPath: parentPath,
    visibleItems: [],
    selectedLeaf: target,
    selectedPath: fullPath,
  };
}

// ---------------------------------------------------------------------------
// Backward compatibility exports for existing cascading helpers
// ---------------------------------------------------------------------------
export interface PickerLevel {
  depth: number;
  options: CatalogCategoryNode[];
  selectedId: number | null;
  parentId: number | null;
}

export interface PickerState {
  levels: PickerLevel[];
  selectedNodes: CatalogCategoryNode[];
  selectedPath: number[];
  selectedLeafId: number | null;
  isLeafSelected: boolean;
}

export function computePickerState(
  rows: CatalogCategoryTreeRow[],
  selectedPath: number[]
): PickerState {
  const tree = buildCategoryTree(rows);

  const validPath: number[] = [];
  const selectedNodes: CatalogCategoryNode[] = [];
  let currentLevelOptions: CatalogCategoryNode[] = tree;

  for (const id of selectedPath) {
    const found = currentLevelOptions.find((node) => node.id === id);
    if (!found) {
      break;
    }
    validPath.push(id);
    selectedNodes.push(found);
    if (found.children.length === 0) {
      break;
    }
    currentLevelOptions = found.children;
  }

  const levels: PickerLevel[] = [];
  let optionsForLevel: CatalogCategoryNode[] = tree;
  let currentParentId: number | null = null;

  for (let depth = 0; ; depth++) {
    const selectedId = depth < validPath.length ? validPath[depth] : null;
    levels.push({
      depth,
      options: optionsForLevel,
      selectedId,
      parentId: currentParentId,
    });

    if (selectedId === null) {
      break;
    }

    const selectedNode = optionsForLevel.find((n) => n.id === selectedId);
    if (!selectedNode || selectedNode.children.length === 0) {
      break;
    }

    optionsForLevel = selectedNode.children;
    currentParentId = selectedNode.id;
  }

  const lastSelectedNode = selectedNodes.length > 0 ? selectedNodes[selectedNodes.length - 1] : null;
  const isLeafSelected = lastSelectedNode !== null && lastSelectedNode.children.length === 0;
  const selectedLeafId = isLeafSelected ? lastSelectedNode.id : null;

  return {
    levels,
    selectedNodes,
    selectedPath: validPath,
    selectedLeafId,
    isLeafSelected,
  };
}
