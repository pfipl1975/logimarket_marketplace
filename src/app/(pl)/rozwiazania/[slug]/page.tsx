import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/app/_shared/LandingPage";
import { getLandingPage, getLandingSlugsForLocale } from "@/lib/landing";
import {
  createLandingMetadata,
  createSafeLandingNoIndexMetadata,
} from "@/lib/landing/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 86400;

export function generateStaticParams() {
  return getLandingSlugsForLocale("pl").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = getLandingPage("pl", slug);

  if (!landing) {
    return createSafeLandingNoIndexMetadata();
  }

  return createLandingMetadata(landing);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const landing = getLandingPage("pl", slug);

  if (!landing) {
    notFound();
  }

  return <LandingPage landing={landing} />;
}
