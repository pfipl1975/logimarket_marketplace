import { CatalogCategoryNode, CatalogCategoryTreeRow, buildCategoryTree } from "./tree";

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

/**
 * Computes the hierarchical cascading picker state given category rows and the active selection path.
 * Canonical ordering from buildCategoryTree is strictly preserved.
 */
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
