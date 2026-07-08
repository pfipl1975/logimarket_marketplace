import type { Metadata } from "next";
import { SolutionsIndexPage } from "@/app/_shared/SolutionsIndexPage";
import { solutionsIndexPaths } from "@/lib/landing";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 86400;

export function generateMetadata(): Metadata {
  return {
    title: "Rozwiązania dla logistyki i magazynowania — LogiMarket B2B",
    description:
      "Przejdź do obszarów zakupowych: wyposażenie magazynu, intralogistyka, systemy składowania, kompletacja, pakowanie, strefa przyjęć i wysyłek. Katalog B2B.",
    alternates: {
      canonical: absoluteUrl(solutionsIndexPaths.pl),
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

export default function Page() {
  return <SolutionsIndexPage locale="pl" />;
}
