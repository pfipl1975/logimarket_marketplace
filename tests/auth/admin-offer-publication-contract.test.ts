import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";

describe("Admin Offer Publication Auth Contract", () => {
  test("proves requireAdmin is executed before input parsing and DB mutation", () => {
    const sourceCode = fs.readFileSync("src/app/actions.ts", "utf8");

    const functionStartIndex = sourceCode.indexOf("export async function changeAdminOfferPublicationState(rawInput: unknown)");
    assert.equal(functionStartIndex !== -1, true, "changeAdminOfferPublicationState signature is missing or incorrect");

    const requireAdminIndex = sourceCode.indexOf("await requireAdmin()", functionStartIndex);
    assert.equal(requireAdminIndex !== -1, true, "await requireAdmin() is missing");

    const parseInputIndex = sourceCode.indexOf("parseAdminOfferPublicationInput(rawInput)", requireAdminIndex);
    assert.equal(parseInputIndex !== -1, true, "parseAdminOfferPublicationInput is missing or executed before requireAdmin");
    assert.equal(parseInputIndex > requireAdminIndex, true, "parseAdminOfferPublicationInput must be after requireAdmin");

    const executeIndex = sourceCode.indexOf("executeOfferPublicationStateChange", parseInputIndex);
    assert.equal(executeIndex !== -1, true, "executeOfferPublicationStateChange is missing or executed before parsing");
    assert.equal(executeIndex > parseInputIndex, true, "executeOfferPublicationStateChange must be after parseAdminOfferPublicationInput");
  });
});
