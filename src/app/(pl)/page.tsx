import { defaultLocale } from "@/lib/i18n/config";
import { HomePage } from "@/app/_shared/HomePage";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <HomePage
      locale={defaultLocale}
      searchParams={resolvedSearchParams}
    />
  );
}
