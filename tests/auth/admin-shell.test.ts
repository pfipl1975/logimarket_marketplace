import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

test("Admin Shell Architecture Contract", async (t) => {
  const plLayoutPath = join(process.cwd(), "src/app/(pl)/admin/layout.tsx");
  const locLayoutPath = join(process.cwd(), "src/app/(localized)/[locale]/admin/layout.tsx");
  const shellPath = join(process.cwd(), "src/components/admin/AdminShell.tsx");
  const entryPath = join(process.cwd(), "src/app/_shared/AdminEntryPage.tsx");
  const messagesDir = join(process.cwd(), "src/messages");

  await t.test("polski layout wywołuje requireAdminPageAccess i używa AdminShell", () => {
    const content = readFileSync(plLayoutPath, "utf-8");
    assert.match(content, /requireAdminPageAccess\("pl"\)/);
    assert.match(content, /<AdminShell/);
  });

  await t.test("lokalizowany layout waliduje locale, odrzuca pl, wywołuje requireAdminPageAccess i używa AdminShell", () => {
    const content = readFileSync(locLayoutPath, "utf-8");
    assert.match(content, /isLocale\(/);
    assert.match(content, /=== "pl"/);
    assert.match(content, /notFound\(\)/);
    assert.match(content, /requireAdminPageAccess\(/);
    assert.match(content, /<AdminShell/);
  });

  await t.test("AdminShell spełnia założenia bezpieczeństwa i architektury", () => {
    const content = readFileSync(shellPath, "utf-8");
    assert.doesNotMatch(content, /"use client"/);
    assert.doesNotMatch(content, /'use client'/);
    assert.match(content, /<AdminLogoutForm/);
    assert.doesNotMatch(content, /email/i);
    assert.doesNotMatch(content, /uuid/i);
    assert.doesNotMatch(content, /session/i);
    assert.match(content, /locale === "pl" \? "\/admin" : `\/\$\{locale\}\/admin`/);
  });

  await t.test("nieaktywne moduły są poprawnie wyłączone", () => {
    const content = readFileSync(join(process.cwd(), "src/components/admin/AdminNavigation.tsx"), "utf-8");
    assert.match(content, /<span[^>]*aria-disabled="true"/);
  });

  await t.test("AdminEntryPage nie zawiera wylogowania ani pełnego ekranu", () => {
    const content = readFileSync(entryPath, "utf-8");
    assert.doesNotMatch(content, /<AdminLogoutForm/);
    assert.doesNotMatch(content, /min-h-screen/);
    assert.doesNotMatch(content, /revenue|trend|chart|statystyki|liczba ofert:|liczba partnerów:/i);
  });

  await t.test("wszystkie locale zawierają klucze sekcji admin", () => {
    const files = readdirSync(messagesDir).filter(f => f.endsWith(".json"));
    assert.equal(files.length, 7);

    const requiredKeys = [
      "secureAreaLabel",
      "readOnlyLabel",
      "navigationLabel",
      "dashboardNav",
      "offersNav",
      "partnersNav",
      "rfqNav",
      "ordersNav",
      "taxonomyNav",
      "plannedLabel",
      "moduleReadOnlyStatus",
      "nextModuleLabel",
      "moduleAvailabilityHeading"
    ];

    files.forEach(file => {
      const content = JSON.parse(readFileSync(join(messagesDir, file), "utf-8"));
      assert.ok(Object.prototype.hasOwnProperty.call(content, "admin"), `File ${file} is missing 'admin' property`);
      requiredKeys.forEach(key => {
        assert.ok(Object.prototype.hasOwnProperty.call(content.admin, key), `File ${file} is missing admin.${key}`);
      });
    });
  });
});
