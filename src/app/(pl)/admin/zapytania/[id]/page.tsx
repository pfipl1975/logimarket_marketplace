import { AdminRfqDetailPage } from "@/app/_shared/AdminRfqDetailPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
  const dict = dictionary.adminRfq;
  return {
    title: dict.detailMetaTitle,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <AdminRfqDetailPage locale="pl" rawId={resolvedParams.id} />;
}
