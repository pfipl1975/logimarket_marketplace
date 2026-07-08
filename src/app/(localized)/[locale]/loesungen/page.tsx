import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SolutionsIndexPage, solutionsIndexPaths } from "@/app/_shared/SolutionsIndexPage";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "de") {
    return { robots: { index: false, follow: false } };
  }

  return {
    title: "Logistik- und Lagerlösungen — LogiMarket B2B",
    description:
      "Navigieren Sie zu Beschaffungsbereichen: Lagerausstattung, Intralogistik, Lagersysteme, Kommissionierung, Verpackung, Wareneingang und Versand. B2B-Katalog.",
    alternates: {
      canonical: absoluteUrl(solutionsIndexPaths.de),
      languages: {
        pl: absoluteUrl(solutionsIndexPaths.pl),
        en: absoluteUrl(solutionsIndexPaths.en),
        de: absoluteUrl(solutionsIndexPaths.de),
        es: absoluteUrl(solutionsIndexPaths.es),
        fr: absoluteUrl(solutionsIndexPaths.fr),
        uk: absoluteUrl(solutionsIndexPaths.uk),
        zh: absoluteUrl(solutionsIndexPaths.zh),
        "x-default": absoluteUrl(solutionsIndexPaths.pl),
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;

  if (locale !== "de") {
    notFound();
  }

  return <SolutionsIndexPage locale="de" />;
}
