import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("AdminLogoutForm UI static checks", async (t) => {
  await t.test("AdminLogoutForm.tsx contract", async () => {
    const filePath = path.join(__dirname, "../../src/components/auth/AdminLogoutForm.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.match(content, /"use client"|'use client'/);
    assert.match(content, /useActionState/);
    assert.match(content, /logoutUser/);
    assert.match(content, /name="locale"/);

    // Forbidden patterns
    assert.doesNotMatch(content, /name="redirectTo"/);
    assert.doesNotMatch(content, /window\.location/);
    assert.doesNotMatch(content, /createClient|createBrowserClient/);

    // Required states
    assert.match(content, /isPending/);
    assert.match(content, /AUTH_UNAVAILABLE/);
  });

  await t.test("actions.ts logoutUser contract", async () => {
    const filePath = path.join(__dirname, "../../src/app/actions.ts");
    const content = await fs.readFile(filePath, "utf-8");

    // We only care about the logoutUser function specifically
    const match = content.match(/export async function logoutUser[\s\S]*?^}/m);
    assert.ok(match, "logoutUser function should be present");
    const logoutUserContent = match[0];

    assert.match(logoutUserContent, /scope:\s*"local"/);
    assert.doesNotMatch(logoutUserContent, /redirectTo/);
    assert.doesNotMatch(logoutUserContent, /cookies\(\)\.delete/);
    assert.doesNotMatch(logoutUserContent, /cookieStore\.delete/);
    assert.match(logoutUserContent, /getAdminLoginRedirectPath/);
    assert.match(logoutUserContent, /redirect\(getAdminLoginRedirectPath\(safeLocale\)\)/);
  });

  await t.test("AdminShell.tsx contract", async () => {
    const filePath = path.join(__dirname, "../../src/components/admin/AdminShell.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.match(content, /<AdminLogoutForm/);
    assert.doesNotMatch(content, /redirectTo=/);
  });

  await t.test("AdminEntryPage.tsx contract", async () => {
    const filePath = path.join(__dirname, "../../src/app/_shared/AdminEntryPage.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.doesNotMatch(content, /<AdminLogoutForm/);
    assert.doesNotMatch(content, /redirectTo=/);
  });
});
