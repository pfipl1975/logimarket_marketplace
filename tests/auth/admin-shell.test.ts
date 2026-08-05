import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("Admin Shell Architecture Contract", () => {
  const plLayoutPath = join(process.cwd(), "src/app/(pl)/admin/layout.tsx");
  const locLayoutPath = join(process.cwd(), "src/app/(localized)/[locale]/admin/layout.tsx");
  const shellPath = join(process.cwd(), "src/components/admin/AdminShell.tsx");
  const entryPath = join(process.cwd(), "src/app/_shared/AdminEntryPage.tsx");
  const messagesDir = join(process.cwd(), "src/messages");

  it("polski layout wywołuje requireAdminPageAccess i używa AdminShell", () => {
    const content = readFileSync(plLayoutPath, "utf-8");
    expect(content).toMatch(/requireAdminPageAccess\("pl"\)/);
    expect(content).toMatch(/<AdminShell/);
  });

  it("lokalizowany layout waliduje locale, odrzuca pl, wywołuje requireAdminPageAccess i używa AdminShell", () => {
    const content = readFileSync(locLayoutPath, "utf-8");
    expect(content).toMatch(/isLocale\(/);
    expect(content).toMatch(/=== "pl"/);
    expect(content).toMatch(/notFound\(\)/);
    expect(content).toMatch(/requireAdminPageAccess\(/);
    expect(content).toMatch(/<AdminShell/);
  });

  it("AdminShell spełnia założenia bezpieczeństwa i architektury", () => {
    const content = readFileSync(shellPath, "utf-8");
    expect(content).not.toMatch(/"use client"/);
    expect(content).not.toMatch(/'use client'/);
    expect(content).toMatch(/<AdminLogoutForm/);
    expect(content).not.toMatch(/email/i);
    expect(content).not.toMatch(/uuid/i);
    expect(content).not.toMatch(/session/i);
    expect(content).toMatch(/locale === "pl" \? "\/admin" : `\/\$\{locale\}\/admin`/);
  });

  it("przyszłe moduły nie są linkami do nieistniejących tras w AdminShell", () => {
    const content = readFileSync(shellPath, "utf-8");
    expect(content).toMatch(/<span[^>]*aria-disabled="true"/);
    expect(content).not.toMatch(/href="\#"/);
  });

  it("AdminEntryPage nie zawiera wylogowania ani pełnego ekranu", () => {
    const content = readFileSync(entryPath, "utf-8");
    expect(content).not.toMatch(/<AdminLogoutForm/);
    expect(content).not.toMatch(/min-h-screen/);
    // Nie zawiera metryk/liczników (brak hardkodowanych danych z DB w treści poza klasami)
    // Brak specyficznych słów sugerujących fikcyjne statystyki
    expect(content).not.toMatch(/revenue|trend|chart|statystyki|liczba ofert:|liczba partnerów:/i);
  });

  it("wszystkie locale zawierają klucze sekcji admin", () => {
    const files = readdirSync(messagesDir).filter(f => f.endsWith(".json"));
    expect(files.length).toBe(7);

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
      expect(content).toHaveProperty("admin");
      requiredKeys.forEach(key => {
        expect(content.admin).toHaveProperty(key);
      });
    });
  });
});
