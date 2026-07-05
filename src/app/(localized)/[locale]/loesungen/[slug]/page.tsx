import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/app/_shared/LandingPage";
import { getLandingPage, getLandingSlugsForLocale } from "@/lib/landing";
import {
  createLandingMetadata,
  createSafeLandingNoIndexMetadata,
} from "@/lib/landing/metadata";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 86400;

export function generateStaticParams() {
  return getLandingSlugsForLocale("de").map((slug) => ({
    locale: "de",
    slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  if (locale !== "de") {
    return createSafeLandingNoIndexMetadata();
  }

  const landing = getLandingPage("de", slug);

  if (!landing) {
    return createSafeLandingNoIndexMetadata();
  }

  return createLandingMetadata(landing);
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;

  if (locale !== "de") {
    notFound();
  }

  const landing = getLandingPage("de", slug);

  if (!landing) {
    notFound();
  }

  return <LandingPage landing={landing} />;
}
