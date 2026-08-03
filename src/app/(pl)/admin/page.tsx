import { getDictionary } from "@/lib/i18n/dictionaries";
import { AdminEntryPage } from "@/app/_shared/AdminEntryPage";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
  
  return {
    title: dictionary.admin.metaTitle,
    description: dictionary.admin.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function AdminPage() {
  const dictionary = await getDictionary("pl");

  return <AdminEntryPage locale="pl" dictionary={dictionary.admin} />;
}
