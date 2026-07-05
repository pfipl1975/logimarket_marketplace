import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/urls";
import type { LandingPageContent } from "./types";

export function createLandingMetadata(landing: LandingPageContent): Metadata {
  return {
    title: landing.seo.title,
    description: landing.seo.description,
    alternates: {
      canonical: absoluteUrl(landing.path),
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
