import { test, expect, type Page } from "@playwright/test";
import pl from "../../src/messages/pl.json";
import en from "../../src/messages/en.json";
import de from "../../src/messages/de.json";
import { PARTNER_RECRUITMENT_CONTACTS } from "../../src/lib/partner-recruitment";

const branding = "MARKETPLACE B2B DLA LOGISTYKI / B2B LOGISTICS MARKETPLACE";
const noOverflow = async (page: Page, width: number) => {
  expect(await page.evaluate(() => window.innerWidth)).toBe(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
};
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 500) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  return errors;
}

for (const width of [375, 768, 1280, 1600]) {
  test(`permanent public header preserves geometry and controls at ${width}px`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const header = page.locator("header");
    const positioning = header.getByText(branding, { exact: true });
    await expect(positioning).toBeVisible();
    await expect(header).not.toContainText(/UNDER CONSTRUCTION|W BUDOWIE/);
    await expect(header.getByRole("img", { name: "LogiMarket B2B Marketplace", exact: true })).toBeVisible();
    expect((await header.locator(" > div:first-child > div").boundingBox())!.height).toBe(width === 375 ? 48 : width === 768 ? 52 : 56);
    expect(await positioning.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const parent = element.getBoundingClientRect();
      return [...range.getClientRects()].every(rect => rect.left >= parent.left - 1 && rect.right <= parent.right + 1 && rect.top >= parent.top - 1 && rect.bottom <= parent.bottom + 1);
    })).toBe(true);
    const language = header.getByRole("button", { name: `${pl.nav.languageSwitcherAria}: PL — Polski`, exact: true });
    await language.click();
    await expect(header.locator('#language-menu a[href="/en"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(language).toBeFocused();
    await header.getByRole("button", { name: pl.nav.cart, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    if (width < 1600) {
      await header.getByRole("button", { name: pl.nav.menu, exact: true }).click();
      await expect(page.locator('a[href="/login"]').filter({ visible: true }).first()).toBeVisible();
      await expect(page.locator('a[href="/register"]').filter({ visible: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("combobox").filter({ visible: true }).first()).toBeVisible();
    await noOverflow(page, width);
    expect(errors).toEqual([]);
  });
}

for (const width of [375, 1280]) {
  test(`homepage to Partner cooperation by real click at ${width}px`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const labels = pl.partnerRecruitment;
    const banner = page.getByRole("region", { name: labels.headline, exact: true });
    const cta = banner.getByRole("link", { name: labels.checkConditions, exact: true });
    await expect(banner).toBeVisible();
    for (const text of [labels.overline, labels.description, labels.benefitOffers, labels.benefitRfq, labels.benefitOrders]) await expect(banner.getByText(text, { exact: true })).toBeVisible();
    expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await cta.focus();
    await expect(cta).toBeFocused();
    expect(await cta.evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
    await noOverflow(page, width);
    await cta.click();
    await expect(page).toHaveURL(/\/dla-partnerow$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(labels.landingHeroTitle);
    for (const heading of [labels.benefitOffers, labels.benefitRfq, labels.benefitOrders, labels.howItWorksTitle, labels.whoForTitle, labels.conditionsTitle]) await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.getByRole("link", { name: labels.seeHowItWorks, exact: true }).click();
    await expect(page).toHaveURL(/#jak-to-dziala$/);
    const final = page.getByRole("region", { name: labels.finalTitle, exact: true });
    const contact = final.getByRole("link", { name: labels.becomePartner, exact: true });
    await expect(contact).toBeVisible();
    expect((await contact.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const destination = new URL((await contact.getAttribute("href"))!);
    expect(destination.protocol).toBe("mailto:");
    expect(destination.pathname).toBe("kontakt@logimarket.pl");
    expect(destination.searchParams.get("subject")).toBe("Współpraca partnerska — LogiMarket Marketplace");
    await expect(final.getByText(labels.contactProcessNotice, { exact: true })).toBeVisible();
    const direct = final.getByRole("region", { name: labels.directContactTitle, exact: true });
    await expect(direct.getByRole("heading", { name: "Kontakt bezpośredni", exact: true })).toBeVisible();
    await contact.focus();
    for (const person of PARTNER_RECRUITMENT_CONTACTS) {
      const phone = direct.getByRole("link", { name: `${person.name} ${person.phoneDisplay}`, exact: true });
      await expect(phone).toBeVisible();
      await expect(phone).toHaveAttribute("href", person.phoneHref);
      await expect(phone.getByText(person.name, { exact: true })).toBeVisible();
      await expect(phone.getByText(person.phoneDisplay, { exact: true })).toBeVisible();
      expect((await phone.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Tab");
      await expect(phone).toBeFocused();
      await expect.poll(() => phone.evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
    }
    const email = direct.getByRole("link", { name: labels.contactEmail, exact: true });
    await expect(email).toHaveCount(1);
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute("href", "mailto:kontakt@logimarket.pl");
    await page.keyboard.press("Tab");
    await expect(email).toBeFocused();
    await expect.poll(() => email.evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
    await expect(contact).toHaveAttribute("href", destination.href);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/dla-partnerow$/);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", /\/en\/for-partners$/);
    await expect(page.locator('form[action*="partner"]')).toHaveCount(0);
    await noOverflow(page, width);
    // Presentation regression only: use existing public links, without creating transactions.
    await page.locator("header").getByRole("link", { name: "LogiMarket B2B Marketplace", exact: true }).click();
    const offer = page.locator('main a[href^="/oferta/"]').first();
    await expect(offer).toBeVisible();
    await offer.click();
    await expect(page).toHaveURL(/\/oferta\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/katalog");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/login");
    const register = page.locator('a[href^="/register"]').first();
    await expect(register).toBeVisible();
    await register.click();
    await expect(page).toHaveURL(/\/register(?:\?.*)?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("EN and DE recruitment routes and language switch retain the cooperation page", async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 375, height: 900 });
  for (const [locale, dict] of [["en", en], ["de", de]] as const) {
    await page.goto(`/${locale}`);
    await page.getByRole("link", { name: dict.partnerRecruitment.checkConditions, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/for-partners$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(dict.partnerRecruitment.landingHeroTitle);
    await expect(page.getByRole("heading", { name: dict.partnerRecruitment.directContactTitle, exact: true })).toBeVisible();
    await expect(page.locator("header").getByText(branding, { exact: true })).toBeVisible();
    await page.locator("header").getByRole("button", { name: new RegExp(dict.nav.languageSwitcherAria) }).click();
    await expect(page.locator('#language-menu a[href="/dla-partnerow"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await noOverflow(page, 375);
  }
  expect(errors).toEqual([]);
});
