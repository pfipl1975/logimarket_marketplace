import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { locales } from "../../src/lib/i18n/config";
import { getDictionary } from "../../src/lib/i18n/dictionaries";
import { getPartnerRecruitmentLocaleLinks, getPartnerRecruitmentPath } from "../../src/lib/i18n/paths";
import { isProtectedRoute } from "../../src/lib/auth/route-classification";
import { getPartnerRecruitmentContactHref, getPartnerRecruitmentMetadata, PARTNER_RECRUITMENT_BENEFITS, PARTNER_RECRUITMENT_CONTACTS } from "../../src/lib/partner-recruitment";
import { getCoreSitemapEntries } from "../../src/lib/seo/sitemap-entries";
import { absoluteUrl } from "../../src/lib/seo/urls";

const branding = "MARKETPLACE B2B DLA LOGISTYKI / B2B LOGISTICS MARKETPLACE";
const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("direct Partner contacts have one canonical source, semantic links and localized headings", async () => {
  assert.deepEqual(PARTNER_RECRUITMENT_CONTACTS, [
    { name: "Piotr Fiszer", phoneDisplay: "+48 604 904 150", phoneHref: "tel:+48604904150" },
    { name: "Łukasz Antczak", phoneDisplay: "+48 788 750 273", phoneHref: "tel:+48788750273" },
  ]);
  const shared = await source("src/lib/partner-recruitment.ts");
  const landing = await source("src/app/_shared/PartnerRecruitmentPage.tsx");
  for (const person of PARTNER_RECRUITMENT_CONTACTS) {
    assert.equal(person.phoneHref, `tel:${person.phoneDisplay.replaceAll(" ", "")}`);
    for (const value of Object.values(person)) {
      assert.equal(shared.split(value).length - 1, 1);
      assert.equal(landing.includes(value), false);
    }
  }
  assert.match(landing, /PARTNER_RECRUITMENT_CONTACTS.map/);
  assert.match(landing, /<a href=\{person.phoneHref\}/);
  assert.match(landing, /\{person.name\}/);
  assert.match(landing, /\{person.phoneDisplay\}/);
  assert.equal((landing.match(/href=\{`mailto:\$\{labels.contactEmail\}`\}/g) ?? []).length, 1);
  assert.ok(landing.indexOf('id="partner-direct-contact-title"') > landing.indexOf('id="partner-final-contact-notice"'));
  const titles = { pl: "Kontakt bezpośredni", en: "Direct contact", de: "Direkter Kontakt", fr: "Contact direct", uk: "Прямий контакт", es: "Contacto directo", zh: "直接联系" };
  for (const locale of locales) {
    const dict = await getDictionary(locale);
    assert.equal(dict.partnerRecruitment.directContactTitle, titles[locale]);
    const dictionarySource = await source(`src/messages/${locale}.json`);
    for (const person of PARTNER_RECRUITMENT_CONTACTS) assert.equal(dictionarySource.includes(person.phoneDisplay), false);
  }
});

test("all seven locales have permanent branding and complete localized recruitment copy", async () => {
  const pl = await getDictionary("pl");
  for (const locale of locales) {
    const dict = await getDictionary(locale);
    assert.equal(dict.nav.marketplacePositioning, branding);
    assert.equal("constructionNotice" in dict.nav, false);
    assert.deepEqual(Object.keys(dict.partnerRecruitment).sort(), Object.keys(pl.partnerRecruitment).sort());
    for (const [key, value] of Object.entries(dict.partnerRecruitment)) {
      assert.ok(value.trim().length > 0, `${locale}: ${key}`);
      assert.doesNotMatch(value, /UNDER CONSTRUCTION|W BUDOWIE/);
    }
    const contact = new URL(getPartnerRecruitmentContactHref(dict.partnerRecruitment));
    assert.equal(contact.protocol, "mailto:");
    assert.equal(contact.pathname, "kontakt@logimarket.pl");
    assert.equal(contact.searchParams.get("subject"), dict.partnerRecruitment.contactSubject);
  }
  assert.equal(pl.partnerRecruitment.contactSubject, "Współpraca partnerska — LogiMarket Marketplace");
  assert.equal(pl.partnerRecruitment.checkConditions, "Sprawdź warunki współpracy");
  assert.equal(pl.partnerRecruitment.stepOffers, "Przygotowujesz oferty z pomocą LogiMarket. Ich publikacja następuje po moderacji.");
});

test("homepage banner uses the approved PL copy, three benefits and informational landing link", async () => {
  const labels = (await getDictionary("pl")).partnerRecruitment;
  assert.equal(labels.overline, "DLA DOSTAWCÓW I OPERATORÓW");
  assert.equal(labels.headline, "Dołącz do sieci Partnerów LogiMarket");
  assert.equal(labels.description, "Docieraj do nowych klientów B2B, prezentuj swoją ofertę i obsługuj zapytania oraz zamówienia przez Marketplace.");
  assert.deepEqual(PARTNER_RECRUITMENT_BENEFITS.map(benefit => labels[benefit.title]), ["Oferty w Marketplace", "Zapytania RFQ", "Zamówienia B2B"]);
  const banner = await source("src/components/home/PartnerRecruitmentBanner.tsx");
  for (const key of ["overline", "headline", "description", "checkConditions"]) assert.ok(banner.includes(`labels.${key}`));
  assert.match(banner, /href=\{getPartnerRecruitmentPath\(locale\)\}/);
  assert.doesNotMatch(banner, /mailto:|<form|\/register/);
  const home = await source("src/app/_shared/HomePage.tsx");
  assert.ok(home.indexOf("<PartnerRecruitmentBanner") > home.indexOf("<main"));
  assert.ok(home.indexOf("<PartnerRecruitmentBanner") < home.indexOf("<ProductGroupTiles"));
});

test("recruitment routes are public and canonical with complete language alternates and sitemap entries", async () => {
  const links = getPartnerRecruitmentLocaleLinks();
  const entries = getCoreSitemapEntries();
  for (const locale of locales) {
    const path = getPartnerRecruitmentPath(locale);
    assert.equal(path, locale === "pl" ? "/dla-partnerow" : `/${locale}/for-partners`);
    assert.equal(isProtectedRoute(path), false);
    const metadata = getPartnerRecruitmentMetadata(locale, (await getDictionary(locale)).partnerRecruitment);
    assert.equal(metadata.alternates?.canonical, absoluteUrl(path));
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    for (const language of locales) assert.equal(metadata.alternates?.languages?.[language], absoluteUrl(links[language]));
    assert.equal(metadata.alternates?.languages?.["x-default"], absoluteUrl(links.pl));
    const matches = entries.filter(entry => entry.url === absoluteUrl(path));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].alternates?.languages?.[locale], absoluteUrl(path));
  }
  const localized = await source("src/app/(localized)/[locale]/for-partners/page.tsx");
  assert.match(localized, /if \(!isLocale\(locale\)\) notFound\(\)/);
  assert.match(localized, /redirect\(getPartnerRecruitmentPath\(defaultLocale\)\)/);
});

test("header retains Marketplace and Buyer navigation; landing uses honest contact without signup or mutations", async () => {
  const header = await source("src/components/SiteHeader.tsx");
  assert.match(header, /navLabels.marketplacePositioning/);
  assert.doesNotMatch(header, /constructionNotice|UNDER CONSTRUCTION|W BUDOWIE/);
  for (const navigation of ["navState.loginUrl", "navState.registerUrl", "buyerOrdersHref", "LanguageSwitcher", "CartButton", "CatalogSearchSuggestions"]) assert.ok(header.includes(navigation));
  const landing = await source("src/app/_shared/PartnerRecruitmentPage.tsx");
  assert.equal((landing.match(/<h1\b/g) ?? []).length, 1);
  assert.match(landing, /<a href=\{contactHref\}/);
  assert.match(landing, /labels.contactProcessNotice/);
  assert.match(landing, /href="\/dokumenty-prawne"/);
  assert.doesNotMatch(landing, /<form|\/register|use server|@\/lib\/db|\.insert\(/);
});
