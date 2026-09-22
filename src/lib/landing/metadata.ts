import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/urls";
import { getLandingLanguageLinks } from "./index";
import type { LandingPageContent } from "./types";

export function createLandingMetadata(landing: LandingPageContent): Metadata {
  const languageLinks = getLandingLanguageLinks(landing.intent);
  const languages = Object.fromEntries(
    Object.entries(languageLinks).map(([locale, path]) => [locale, absoluteUrl(path)]),
  );

  return {
    title: landing.seo.title,
    description: landing.seo.description,
    alternates: {
      canonical: absoluteUrl(landing.path),
      languages,
    },
  };
}
export function createSafeLandingNoIndexMetadata(): Metadata {
  return {
    title: "LogiMarket",
    robots: {
      index: false,
      follow: false,
    },
  };
}
