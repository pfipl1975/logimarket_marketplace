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

const ALLOWED_LOCALES = ["en", "fr", "uk", "zh"] as const;

export function generateStaticParams() {
  return ALLOWED_LOCALES.flatMap((locale) => {
    return getLandingSlugsForLocale(locale as any).map((slug) => ({
      locale,
      slug,
    }));
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!ALLOWED_LOCALES.includes(locale as any)) {
    return createSafeLandingNoIndexMetadata();
  }

  const landing = getLandingPage(locale as any, slug);

  if (!landing) {
    return createSafeLandingNoIndexMetadata();
  }

  return createLandingMetadata(landing);
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;

  if (!ALLOWED_LOCALES.includes(locale as any)) {
    notFound();
  }

  const landing = getLandingPage(locale as any, slug);

  if (!landing) {
    notFound();
  }

  return <LandingPage landing={landing} />;
}
