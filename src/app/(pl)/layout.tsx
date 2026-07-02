import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { RootShell } from "@/app/_shared/RootShell";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(defaultLocale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default function PolishRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RootShell lang={defaultLocale}>{children}</RootShell>;
}
