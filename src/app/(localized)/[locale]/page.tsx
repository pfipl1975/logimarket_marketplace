import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { HomePage } from "@/app/_shared/HomePage";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LocalizedPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale: rawLocale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!isLocale(rawLocale)) {
    notFound();
  }

  if (rawLocale === defaultLocale) {
    redirect("/");
  }

  return <HomePage locale={rawLocale} searchParams={resolvedSearchParams} />;
}
