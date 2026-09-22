import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../../globals.css";
import { RootShell } from "@/app/_shared/RootShell";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { siteOrigin } from "@/lib/seo/urls";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(defaultLocale);

  return {
    metadataBase: new URL(siteOrigin),
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function LocalizedRootLayout({
  children,
  params,
}: LayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  return <RootShell lang={rawLocale}>{children}</RootShell>;
}
