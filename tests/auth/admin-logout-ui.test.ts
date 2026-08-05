import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("AdminLogoutForm UI static checks", async (t) => {
  await t.test("AdminLogoutForm.tsx contains required elements", async () => {
    const filePath = path.join(__dirname, "../../src/components/auth/AdminLogoutForm.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // Must be a Client Component
    assert.match(content, /"use client"|'use client'/);

    // Must use useActionState
    assert.match(content, /useActionState/);

    // Must import logoutUser
    assert.match(content, /logoutUser/);

    // Must have a form
    assert.match(content, /<form/);

    // Must include hidden fields
    assert.match(content, /name="locale"/);
    assert.match(content, /name="redirectTo"/);

    // Must include the submit button
    assert.match(content, /type="submit"/);
  });
});
