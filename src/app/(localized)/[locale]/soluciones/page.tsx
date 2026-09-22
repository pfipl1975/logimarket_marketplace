import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SolutionsIndexPage } from "@/app/_shared/SolutionsIndexPage";
import { solutionsIndexPaths } from "@/lib/landing";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "es") {
    return { robots: { index: false, follow: false } };
  }

  return {
    title: "Soluciones para logística y almacenamiento — LogiMarket B2B",
    description:
      "Acceda a áreas de aprovisionamiento: equipamiento de almacén, intralogística, sistemas de almacenaje, preparación de pedidos, embalaje, zona de recepción y envío. Catálogo B2B.",
    alternates: {
      canonical: absoluteUrl(solutionsIndexPaths.es),
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

  if (locale !== "es") {
    notFound();
  }

  return <SolutionsIndexPage locale="es" />;
}
