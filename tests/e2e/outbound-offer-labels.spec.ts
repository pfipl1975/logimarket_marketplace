import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import pl from "../../src/messages/pl.json";
import en from "../../src/messages/en.json";
import de from "../../src/messages/de.json";
import fr from "../../src/messages/fr.json";
import uk from "../../src/messages/uk.json";
import es from "../../src/messages/es.json";
import zh from "../../src/messages/zh.json";

const LOCALE_MESSAGES = { pl, en, de, fr, uk, es, zh } as const;

test.describe("LM-OFFER-OUTBOUND-LABEL-01 — Admin filters show a human-facing label", () => {
  for (const [locale, messages] of Object.entries(LOCALE_MESSAGES)) {
    test(`${locale}: external Partner offer label retains outbound query value`, async ({ adminPage }) => {
      const base = locale === "pl" ? "/admin/oferty" : `/${locale}/admin/offers`;
      const response = await adminPage.goto(base);
      expect(response?.status()).toBe(200);

      const selector = adminPage.locator('select[name="model"]');
      const outboundOption = selector.locator('option[value="outbound"]');
      await expect(outboundOption).toHaveText(messages.adminOffers.offerTypeExternal);
      await selector.selectOption("outbound");
      await adminPage.getByRole("button", { name: messages.adminOffers.applyFilters }).click();

      await expect(adminPage).toHaveURL(new RegExp("model=outbound"));
      await expect(adminPage.locator('select[name="model"]')).toHaveValue("outbound");
      await expect(adminPage.locator('select[name="model"] option[value="outbound"]'))
        .toHaveText(messages.adminOffers.offerTypeExternal);
    });
  }
});
