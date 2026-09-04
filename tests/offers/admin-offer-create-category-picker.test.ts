import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type CategoryItem,
  initDrillDown,
  drillDownNavigate,
  drillDownBack,
  drillDownJumpToAncestor,
  drillDownResetSelection,
  drillDownSelectLeafDirect,
  searchCategories,
  getDirectChildren,
  isLeafCategory,
  buildCategoryPath,
} from "../../src/lib/catalog/category-picker-core";

describe("Admin Category Picker - Drill-Down Navigation & Invariants", () => {
  // Canonical fixture representing 6 root categories (matching verified production ROOT_CATEGORY_COUNT=6)
  // with multi-level hierarchies down to depth 4
  const taxonomyFixture: CategoryItem[] = [
    // 6 Canonical Roots
    { id: 1, name: "Wyposażenie magazynu", slug: "wyposazenie-magazynu", parentId: null },
    { id: 2, name: "Wózki widłowe", slug: "wozki-widlowe", parentId: null },
    { id: 3, name: "Automatyka magazynowa", slug: "automatyka-magazynowa", parentId: null },
    { id: 4, name: "Opakowania i materiały", slug: "opakowania-i-materialy", parentId: null },
    { id: 5, name: "BHP i czystość", slug: "bhp-i-czystosc", parentId: null },
    { id: 6, name: "Usługi logistyczne", slug: "uslugi-logistyczne", parentId: null },

    // Branch 1: Depth 2, 3, 4
    { id: 10, name: "Pojemniki i kuwety", slug: "pojemniki-i-kuwety", parentId: 1 },
    { id: 11, name: "Regały półkowe", slug: "regaly-polkowe", parentId: 1 },
    { id: 100, name: "Pojemniki plastikowe", slug: "pojemniki-plastikowe", parentId: 10 },
    { id: 1000, name: "Pojemniki EURO", slug: "pojemniki-euro", parentId: 100 }, // Depth 4 Leaf!
    { id: 1001, name: "Pojemniki składane KLT", slug: "pojemniki-klt", parentId: 100 }, // Depth 4 Leaf!
    { id: 110, name: "Półki ocynkowane", slug: "polki-ocynkowane", parentId: 11 }, // Depth 3 Leaf!

    // Branch 2: Depth 2, 3
    { id: 20, name: "Wózki elektryczne", slug: "wozki-elektryczne", parentId: 2 },
    { id: 21, name: "Wózki spalinowe", slug: "wozki-spalinowe", parentId: 2 },
    { id: 200, name: "Wózek czołowy 3-kołowy", slug: "wozek-czolowy-3k", parentId: 20 }, // Depth 3 Leaf!
    { id: 201, name: "Wózek czołowy 4-kołowy", slug: "wozek-czolowy-4k", parentId: 20 }, // Depth 3 Leaf!

    // Branch 3: Depth 2 Leaf
    { id: 30, name: "Przenośniki rolkowe", slug: "przenosniki-rolkowe", parentId: 3 }, // Depth 2 Leaf!

    // Branch 4: Depth 2 Leaf
    { id: 40, name: "Taśmy pakowe", slug: "tasmy-pakowe", parentId: 4 }, // Depth 2 Leaf!

    // Branch 5: Depth 2 Leaf
    { id: 50, name: "Odzież robocza", slug: "odziez-robocza", parentId: 5 }, // Depth 2 Leaf!

    // Branch 6: Depth 2 Leaf
    { id: 60, name: "Audyty magazynowe", slug: "audyty-magazynowe", parentId: 6 }, // Depth 2 Leaf!
  ];

  test("INITIAL_ONLY_ROOTS=PASS: initial state exposes ONLY categories with parentId === null", () => {
    const state = initDrillDown(taxonomyFixture);

    assert.equal(state.currentParentId, null);
    assert.equal(state.navigationPath.length, 0);
    assert.equal(state.selectedLeaf, null);

    // Every visible item MUST have parentId === null
    const allRoots = state.visibleItems.every((item) => item.parentId === null);
    assert.equal(allRoots, true, "All initial visible items must be roots");
  });

  test("INITIAL_VISIBLE_COUNT=6: structurally derives exactly 6 roots from verified taxonomy fixture", () => {
    const state = initDrillDown(taxonomyFixture);

    // Initial visible items must be exactly 6, not all 20 categories
    assert.equal(state.visibleItems.length, 6);
    assert.notEqual(state.visibleItems.length, taxonomyFixture.length);

    const rootNames = state.visibleItems.map((i) => i.name);
    assert.deepEqual(rootNames, [
      "Wyposażenie magazynu",
      "Wózki widłowe",
      "Automatyka magazynowa",
      "Opakowania i materiały",
      "BHP i czystość",
      "Usługi logistyczne",
    ]);
  });

  test("NAVIGATE_TO_DIRECT_CHILDREN=PASS: navigating into a root exposes only its direct children", () => {
    const initialState = initDrillDown(taxonomyFixture);

    // Drill down into Root 1: "Wyposażenie magazynu"
    const stateLevel2 = drillDownNavigate(taxonomyFixture, initialState, 1);

    assert.equal(stateLevel2.currentParentId, 1);
    assert.equal(stateLevel2.navigationPath.length, 1);
    assert.equal(stateLevel2.navigationPath[0].name, "Wyposażenie magazynu");

    // Must only have direct children of category 1: Pojemniki i kuwety (10), Regały półkowe (11)
    assert.equal(stateLevel2.visibleItems.length, 2);
    assert.equal(stateLevel2.visibleItems[0].id, 10);
    assert.equal(stateLevel2.visibleItems[1].id, 11);

    const allAreDirectChildren = stateLevel2.visibleItems.every((item) => item.parentId === 1);
    assert.equal(allAreDirectChildren, true);
  });

  test("UNRELATED_BRANCH_NOT_VISIBLE=PASS: drilling down never exposes unrelated categories", () => {
    const initialState = initDrillDown(taxonomyFixture);

    // Drill down into Root 1 (ID 1)
    const state = drillDownNavigate(taxonomyFixture, initialState, 1);

    // Verify categories from Root 2 (ID 20, 21), Root 3 (ID 30) etc. are NOT visible
    const visibleIds = state.visibleItems.map((i) => i.id);
    assert.equal(visibleIds.includes(20), false);
    assert.equal(visibleIds.includes(21), false);
    assert.equal(visibleIds.includes(30), false);
    assert.equal(visibleIds.includes(2), false);
  });

  test("BACK_NAVIGATION=PASS: back button pops one level and restores previous sibling list", () => {
    const initialState = initDrillDown(taxonomyFixture);

    // Navigate to Level 2 (Wyposażenie magazynu -> ID 1)
    const stateL2 = drillDownNavigate(taxonomyFixture, initialState, 1);
    // Navigate to Level 3 (Pojemniki i kuwety -> ID 10)
    const stateL3 = drillDownNavigate(taxonomyFixture, stateL2, 10);

    assert.equal(stateL3.currentParentId, 10);
    assert.equal(stateL3.navigationPath.length, 2);
    assert.equal(stateL3.visibleItems.length, 1);
    assert.equal(stateL3.visibleItems[0].id, 100);

    // Go back once -> Should be at Level 2 (Parent ID 1)
    const backL2 = drillDownBack(taxonomyFixture, stateL3);
    assert.equal(backL2.currentParentId, 1);
    assert.equal(backL2.navigationPath.length, 1);
    assert.equal(backL2.navigationPath[0].id, 1);
    assert.equal(backL2.visibleItems.length, 2);

    // Go back again -> Should be at Root level (Parent ID null)
    const backRoot = drillDownBack(taxonomyFixture, backL2);
    assert.equal(backRoot.currentParentId, null);
    assert.equal(backRoot.navigationPath.length, 0);
    assert.equal(backRoot.visibleItems.length, 6);
  });

  test("VARIABLE_DEPTH_4=PASS: successfully navigates arbitrary depth up to 4 levels", () => {
    let state = initDrillDown(taxonomyFixture);

    // Depth 1: Root 1
    state = drillDownNavigate(taxonomyFixture, state, 1);
    assert.equal(state.navigationPath.length, 1);
    assert.equal(state.visibleItems.length, 2);

    // Depth 2: Group 10
    state = drillDownNavigate(taxonomyFixture, state, 10);
    assert.equal(state.navigationPath.length, 2);
    assert.equal(state.visibleItems.length, 1);

    // Depth 3: Subgroup 100
    state = drillDownNavigate(taxonomyFixture, state, 100);
    assert.equal(state.navigationPath.length, 3);
    assert.equal(state.visibleItems.length, 2);
    assert.equal(state.visibleItems[0].id, 1000);
    assert.equal(state.visibleItems[1].id, 1001);

    // Both children at depth 4 are leaves!
    assert.equal(state.visibleItems[0].isLeaf, true);
    assert.equal(state.visibleItems[1].isLeaf, true);
  });

  test("LEAF_SELECTION=PASS: clicking a leaf node selects it and captures full path", () => {
    let state = initDrillDown(taxonomyFixture);
    state = drillDownNavigate(taxonomyFixture, state, 1);
    state = drillDownNavigate(taxonomyFixture, state, 10);
    state = drillDownNavigate(taxonomyFixture, state, 100);

    // Click terminal leaf node 1000: "Pojemniki EURO"
    const leafState = drillDownNavigate(taxonomyFixture, state, 1000);

    assert.notEqual(leafState.selectedLeaf, null);
    assert.equal(leafState.selectedLeaf?.id, 1000);
    assert.equal(leafState.selectedLeaf?.name, "Pojemniki EURO");
    assert.equal(leafState.selectedPath.length, 4);
    assert.equal(leafState.visibleItems.length, 0);
  });

  test("FINAL_BREADCRUMB=PASS: full localized breadcrumb matches root-to-leaf hierarchy", () => {
    let state = initDrillDown(taxonomyFixture);
    state = drillDownNavigate(taxonomyFixture, state, 1);
    state = drillDownNavigate(taxonomyFixture, state, 10);
    state = drillDownNavigate(taxonomyFixture, state, 100);
    const leafState = drillDownNavigate(taxonomyFixture, state, 1000);

    const breadcrumb = leafState.selectedPath.map((n) => n.name).join(" → ");
    assert.equal(
      breadcrumb,
      "Wyposażenie magazynu → Pojemniki i kuwety → Pojemniki plastikowe → Pojemniki EURO"
    );
  });

  test("CHANGE_CATEGORY_RESETS_SELECTION=PASS: change category action clears selection and re-opens browser", () => {
    let state = initDrillDown(taxonomyFixture);
    state = drillDownNavigate(taxonomyFixture, state, 1);
    state = drillDownNavigate(taxonomyFixture, state, 10);
    state = drillDownNavigate(taxonomyFixture, state, 100);
    const leafState = drillDownNavigate(taxonomyFixture, state, 1000);

    assert.notEqual(leafState.selectedLeaf, null);

    // User triggers "Change category"
    const resetState = drillDownResetSelection(taxonomyFixture, leafState);

    assert.equal(resetState.selectedLeaf, null);
    assert.equal(resetState.selectedPath.length, 0);
    // Browser reopened at current parent level (ID 100), exposing its leaf options
    assert.equal(resetState.visibleItems.length, 2);
    assert.equal(resetState.visibleItems[0].id, 1000);
    assert.equal(resetState.visibleItems[1].id, 1001);
  });

  test("ANCESTOR_NAVIGATION_RESETS_DESCENDANTS=PASS: jumping to earlier ancestor resets lower levels", () => {
    let state = initDrillDown(taxonomyFixture);
    state = drillDownNavigate(taxonomyFixture, state, 1); // index 0 in path
    state = drillDownNavigate(taxonomyFixture, state, 10); // index 1 in path
    state = drillDownNavigate(taxonomyFixture, state, 100); // index 2 in path

    assert.equal(state.navigationPath.length, 3);

    // Jump directly back to Root 1 (index 0)
    const jumpedState = drillDownJumpToAncestor(taxonomyFixture, state, 0);

    assert.equal(jumpedState.currentParentId, 1);
    assert.equal(jumpedState.navigationPath.length, 1);
    assert.equal(jumpedState.navigationPath[0].id, 1);
    assert.equal(jumpedState.visibleItems.length, 2);
    assert.equal(jumpedState.visibleItems[0].id, 10);
    assert.equal(jumpedState.visibleItems[1].id, 11);
  });

  test("SEARCH_BOUNDED=PASS: search filters localized labels and clicking leaf selects directly", () => {
    // Search for "EURO"
    const results = searchCategories(taxonomyFixture, "euro");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 1000);
    assert.equal(results[0].isLeaf, true);
    assert.equal(
      results[0].pathFormatted,
      "Wyposażenie magazynu → Pojemniki i kuwety → Pojemniki plastikowe → Pojemniki EURO"
    );

    // Direct selection of leaf from search
    const directState = drillDownSelectLeafDirect(taxonomyFixture, results[0].id);
    assert.equal(directState.selectedLeaf?.id, 1000);
    assert.equal(directState.selectedPath.length, 4);
    assert.equal(directState.selectedPath[3].name, "Pojemniki EURO");
  });

  test("PURE_HELPERS=PASS: getDirectChildren, isLeafCategory, and buildCategoryPath calculate correctly", () => {
    assert.equal(isLeafCategory(taxonomyFixture, 1), false);
    assert.equal(isLeafCategory(taxonomyFixture, 1000), true);

    const rootChildren = getDirectChildren(taxonomyFixture, null);
    assert.equal(rootChildren.length, 6);

    const path1000 = buildCategoryPath(taxonomyFixture, 1000);
    assert.equal(path1000.length, 4);
    assert.equal(path1000[3].id, 1000);
  });
});
