import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryTree, type CatalogCategoryTreeRow } from "../../src/lib/catalog/tree";
import { computePickerState } from "../../src/lib/catalog/category-picker-core";

describe("Admin Category Picker - Pure Core & Tree Invariants", () => {
  // Synthetic 4-level taxonomy matching production depth
  const sampleCategories: CatalogCategoryTreeRow[] = [
    { id: 1, name: "Wyposażenie magazynu", slug: "wyposazenie-magazynu", parentId: null },
    { id: 2, name: "Wózki widłowe", slug: "wozki-widlowe", parentId: null },
    { id: 10, name: "Pojemniki i kuwety", slug: "pojemniki-i-kuwety", parentId: 1 },
    { id: 11, name: "Regały półkowe", slug: "regaly-polkowe", parentId: 1 },
    { id: 20, name: "Wózki elektryczne", slug: "wozki-elektryczne", parentId: 2 },
    { id: 100, name: "Pojemniki plastikowe", slug: "pojemniki-plastikowe", parentId: 10 },
    { id: 1000, name: "Pojemniki EURO", slug: "pojemniki-euro", parentId: 100 }, // Depth 4 leaf!
    { id: 200, name: "Elektryczny wózek czołowy", slug: "wozki-czolowe", parentId: 20 }, // Depth 3 leaf!
    { id: 110, name: "Półki ocynkowane", slug: "polki-ocynkowane", parentId: 11 }, // Depth 3 leaf!
  ];

  test("TREE_PARENT_RELATIONS=PASS: preserves parentId and places children correctly", () => {
    const tree = buildCategoryTree(sampleCategories);

    // Root nodes
    assert.equal(tree.length, 2);
    assert.equal(tree[0].id, 1);
    assert.equal(tree[1].id, 2);

    // Children of Root 1
    assert.equal(tree[0].children.length, 2);
    assert.equal(tree[0].children[0].id, 10);
    assert.equal(tree[0].children[1].id, 11);

    // Children of Node 10
    assert.equal(tree[0].children[0].children.length, 1);
    assert.equal(tree[0].children[0].children[0].id, 100);

    // Children of Node 100
    assert.equal(tree[0].children[0].children[0].children.length, 1);
    assert.equal(tree[0].children[0].children[0].children[0].id, 1000);
  });

  test("VARIABLE_DEPTH_4_SUPPORTED=PASS: renders cascading levels down to 4th level", () => {
    // Select down to depth 4: 1 -> 10 -> 100 -> 1000
    const state = computePickerState(sampleCategories, [1, 10, 100, 1000]);

    assert.equal(state.levels.length, 4);
    assert.equal(state.levels[0].depth, 0);
    assert.equal(state.levels[0].selectedId, 1);

    assert.equal(state.levels[1].depth, 1);
    assert.equal(state.levels[1].selectedId, 10);

    assert.equal(state.levels[2].depth, 2);
    assert.equal(state.levels[2].selectedId, 100);

    assert.equal(state.levels[3].depth, 3);
    assert.equal(state.levels[3].selectedId, 1000);
  });

  test("LEAF_DETECTION=PASS: distinguishes between intermediate nodes and terminal leaves", () => {
    // Intermediate selection at depth 1 (Wyposażenie magazynu - ID 1)
    const stateRoot = computePickerState(sampleCategories, [1]);
    assert.equal(stateRoot.isLeafSelected, false);
    assert.equal(stateRoot.selectedLeafId, null);

    // Intermediate selection at depth 2 (Pojemniki i kuwety - ID 10)
    const stateGroup = computePickerState(sampleCategories, [1, 10]);
    assert.equal(stateGroup.isLeafSelected, false);
    assert.equal(stateGroup.selectedLeafId, null);

    // Terminal leaf selection at depth 4 (Pojemniki EURO - ID 1000)
    const stateLeaf = computePickerState(sampleCategories, [1, 10, 100, 1000]);
    assert.equal(stateLeaf.isLeafSelected, true);
    assert.equal(stateLeaf.selectedLeafId, 1000);

    // Terminal leaf selection at depth 3 (Półki ocynkowane - ID 110)
    const stateLeafDepth3 = computePickerState(sampleCategories, [1, 11, 110]);
    assert.equal(stateLeafDepth3.isLeafSelected, true);
    assert.equal(stateLeafDepth3.selectedLeafId, 110);
  });

  test("ANCESTOR_RESET=PASS: changing an ancestor clears all descendant selections", () => {
    // User had [1, 10, 100, 1000] selected, then changes level 0 to category 2 (Wózki widłowe)
    const stateAfterChange = computePickerState(sampleCategories, [2]);

    assert.equal(stateAfterChange.selectedPath.length, 1);
    assert.equal(stateAfterChange.selectedPath[0], 2);
    assert.equal(stateAfterChange.isLeafSelected, false);
    assert.equal(stateAfterChange.selectedLeafId, null);

    // Level 1 now contains children of category 2
    assert.equal(stateAfterChange.levels.length, 2);
    assert.equal(stateAfterChange.levels[1].options.length, 1);
    assert.equal(stateAfterChange.levels[1].options[0].id, 20);
    assert.equal(stateAfterChange.levels[1].selectedId, null);
  });

  test("FINAL_PATH=PASS: produces full chain of nodes with localized names", () => {
    const state = computePickerState(sampleCategories, [1, 10, 100, 1000]);

    assert.equal(state.selectedNodes.length, 4);
    assert.equal(state.selectedNodes[0].name, "Wyposażenie magazynu");
    assert.equal(state.selectedNodes[1].name, "Pojemniki i kuwety");
    assert.equal(state.selectedNodes[2].name, "Pojemniki plastikowe");
    assert.equal(state.selectedNodes[3].name, "Pojemniki EURO");

    const pathString = state.selectedNodes.map((n) => n.name).join(" → ");
    assert.equal(
      pathString,
      "Wyposażenie magazynu → Pojemniki i kuwety → Pojemniki plastikowe → Pojemniki EURO"
    );
  });

  test("LEAF_ID=PASS: invalid/unset until a leaf node is chosen", () => {
    // Empty
    assert.equal(computePickerState(sampleCategories, []).selectedLeafId, null);

    // Parent
    assert.equal(computePickerState(sampleCategories, [1]).selectedLeafId, null);

    // Sub-parent
    assert.equal(computePickerState(sampleCategories, [1, 10]).selectedLeafId, null);

    // Exact leaf
    assert.equal(computePickerState(sampleCategories, [1, 10, 100, 1000]).selectedLeafId, 1000);
  });
});
