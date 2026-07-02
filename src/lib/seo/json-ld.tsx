import React from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { getHomeCanonical } from "./urls";
import { siteBrand, localeLanguageTags } from "./site";

type JsonLdPrimitive = string | number | boolean | null;

export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export function serializeJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLdScript({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function createHomeJsonLd(locale: Locale, dict: Dictionary): JsonLdValue {
  const canonicalUrl = getHomeCanonical(locale);
  const langTag = localeLanguageTags[locale];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteBrand.url}/#organization`,
        "name": siteBrand.name,
        "alternateName": siteBrand.alternateName,
        "url": siteBrand.url,
        "logo": {
          "@type": "ImageObject",
          "url": siteBrand.logoUrl,
        },
        "description": dict.meta.description,
      },
      {
        "@type": "WebSite",
        "@id": `${siteBrand.url}/#website`,
        "url": siteBrand.url,
        "name": siteBrand.name,
        "inLanguage": langTag,
        "publisher": {
          "@id": `${siteBrand.url}/#organization`,
        },
      },
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": dict.meta.title,
        "description": dict.meta.description,
        "inLanguage": langTag,
        "isPartOf": {
          "@id": `${siteBrand.url}/#website`,
        },
        "publisher": {
          "@id": `${siteBrand.url}/#organization`,
        },
        "about": "B2B marketplace for logistics, warehousing, intralogistics and warehouse equipment",
      },
    ],
  };
}
