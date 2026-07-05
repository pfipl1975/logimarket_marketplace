import type { Metadata } from "next";
import { GlossaryIndexPage } from "@/app/_shared/GlossaryIndexPage";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 86400; // Cache for 24h

export const metadata: Metadata = {
  title: "Słownik Branżowy — Pojęcia B2B | LogiMarket.pl",
  description: "Baza wiedzy i słownik pojęć z logistyki, magazynowania, intralogistyki, opakowań oraz maszyn transportowych. Poznaj definicje techniczne B2B.",
  alternates: {
    canonical: absoluteUrl("/slownik-branzowy"),
  },
};

export default async function Page() {
  return <GlossaryIndexPage locale="pl" basePath="/slownik-branzowy" />;
}
