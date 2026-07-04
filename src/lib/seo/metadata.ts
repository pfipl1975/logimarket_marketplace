import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import {
  getHomeCanonical,
  getHomeLanguageAlternates,
  getOfferCanonical,
  getOfferLanguageAlternates,
  absoluteUrl,
} from "./urls";
import { getOfferById } from "@/app/actions";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";

export async function generateHomeMetadata(locale: Locale): Promise<Metadata> {
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: getHomeCanonical(locale),
      languages: getHomeLanguageAlternates(),
    },
  };
}

export async function generateCatalogMetadata(locale: Locale): Promise<Metadata> {
  const dict = await getDictionary(locale);
  const catalogPath = locale === defaultLocale ? "/katalog" : `/${locale}/katalog`;

  return {
    title: `${dict.nav.catalog} | ${locale === defaultLocale ? "LogiMarket.pl" : "LogiMarket"}`,
    description: dict.meta.description,
    alternates: {
      canonical: absoluteUrl(catalogPath),
      languages: {
        pl: absoluteUrl("/katalog"),
        en: absoluteUrl("/en/katalog"),
        de: absoluteUrl("/de/katalog"),
        fr: absoluteUrl("/fr/katalog"),
        uk: absoluteUrl("/uk/katalog"),
        es: absoluteUrl("/es/katalog"),
        zh: absoluteUrl("/zh/katalog"),
        "x-default": absoluteUrl("/katalog"),
      },
    },
  };
}

export async function generateOfferMetadata(
  locale: Locale,
  offerId: string,
): Promise<Metadata> {
  const idNum = Number(offerId);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return {
      title: "LogiMarket",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const offer = await getOfferById(idNum);
  if (!offer) {
    return {
      title: "LogiMarket",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const dict = await getDictionary(locale);

  // Robots indexing logic from user instructions
  let robots = {
    index: false,
    follow: false,
  };

  if (offer.publicationStatus === "archived") {
    robots = {
      index: true,
      follow: false,
    };
  } else if (!offer.isActive) {
    robots = {
      index: false,
      follow: false,
    };
  } else if (offer.publicationStatus === "published") {
    robots = {
      index: true,
      follow: true,
    };
  } else {
    robots = {
      index: false,
      follow: false,
    };
  }

  // Title formatting
  const brandSuffix = locale === defaultLocale ? "LogiMarket.pl" : "LogiMarket";
  const title = `${offer.title} | ${brandSuffix}`;

  // Description formatting
  let description = "";
  if (offer.description) {
    const cleanDesc = offer.description
      .replace(/\s+/g, " ")
      .trim();
    if (cleanDesc.length > 165) {
      description = cleanDesc.slice(0, 162) + "...";
    } else {
      description = cleanDesc;
    }
  } else {
    const categoryLabels = dict.categories?.bySlug as Record<string, string> | undefined;
    const categoryLabel = getLocalizedCategoryLabel(
      categoryLabels,
      offer.categorySlug,
      offer.categoryName,
    );
    if (locale === defaultLocale) {
      description = `Kup lub zapytaj o ${offer.title} w kategorii ${categoryLabel} na platformie B2B LogiMarket.pl. Dane techniczne i kontakt.`;
    } else {
      description = `Buy or inquire about ${offer.title} in the category ${categoryLabel} on the B2B LogiMarket platform. Technical specs and contact.`;
    }
  }

  return {
    title,
    description,
    robots,
    alternates: {
      canonical: getOfferCanonical(locale, offerId),
      languages: getOfferLanguageAlternates(offerId),
    },
  };
}
