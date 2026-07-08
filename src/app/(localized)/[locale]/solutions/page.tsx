import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SolutionsIndexPage } from "@/app/_shared/SolutionsIndexPage";
import { solutionsIndexPaths } from "@/lib/landing";
import type { LandingLocale } from "@/lib/landing/types";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 86400;

const ALLOWED_LOCALES = ["en", "fr", "uk", "zh"] as const;
type AllowedLocale = (typeof ALLOWED_LOCALES)[number];

const metaTitles: Record<AllowedLocale, string> = {
  en: "Logistics and Warehousing Solutions — LogiMarket B2B",
  fr: "Solutions logistiques et d'entreposage — LogiMarket B2B",
  uk: "Рішення для логістики та складування — LogiMarket B2B",
  zh: "物流与仓储解决方案 — LogiMarket B2B",
};

const metaDescriptions: Record<AllowedLocale, string> = {
  en: "Navigate to procurement areas: warehouse equipment, intralogistics, storage systems, picking, packing, receiving and shipping zone. B2B catalog.",
  fr: "Accédez aux zones d'approvisionnement : équipements d'entrepôt, intralogistique, systèmes de stockage, préparation de commandes, emballage, zone de réception et d'expédition. Catalogue B2B.",
  uk: "Перейдіть до зон закупівель: складське обладнання, інтралогістика, системи зберігання, комплектація, пакування, зона прийому та відправки. Каталог B2B.",
  zh: "前往采购区域：仓库设备、内部物流、存储系统、拣货、包装、收货和发货区。B2B目录。",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!ALLOWED_LOCALES.includes(locale as AllowedLocale)) {
    return { robots: { index: false, follow: false } };
  }

  const loc = locale as AllowedLocale;

  return {
    title: metaTitles[loc],
    description: metaDescriptions[loc],
    alternates: {
      canonical: absoluteUrl(solutionsIndexPaths[loc]),
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

  if (!ALLOWED_LOCALES.includes(locale as AllowedLocale)) {
    notFound();
  }

  return <SolutionsIndexPage locale={locale as LandingLocale} />;
}
