import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCategories } from "@/app/actions";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { getHomePath } from "@/lib/i18n/paths";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale } from "@/lib/i18n/config";
import { MVP_HOMEPAGE_ROOT_SLUGS } from "@/lib/catalog/homepage-groups";
import { getSectionIconPath } from "@/lib/catalog/group-icons";
import type { Locale } from "@/lib/i18n/types";

interface ProductGroupTilesProps {
  locale: Locale;
}

export async function ProductGroupTiles({ locale }: ProductGroupTilesProps) {
  const [dict, allCategories] = await Promise.all([
    getDictionary(locale),
    getCategories(),
  ]);

  const fallbackDict =
    locale === defaultLocale ? dict : await getDictionary(defaultLocale);

  const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
  const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;
  const localeIntrosBySlug = dict.categories?.introsBySlug as Record<string, string> | undefined;
  const fallbackIntrosBySlug = fallbackDict.categories?.introsBySlug as Record<string, string> | undefined;

  // Filter root categories (parentId === null) and sort by our defined MVP order
  const rootCategories = allCategories
    .filter((c) => c.parentId === null)
    .sort((a, b) => {
      const idxA = MVP_HOMEPAGE_ROOT_SLUGS.indexOf(a.slug);
      const idxB = MVP_HOMEPAGE_ROOT_SLUGS.indexOf(b.slug);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

  const basePath = getHomePath(locale);
  const homeDict = (dict as any).home?.procurementAreas;

  if (!homeDict || rootCategories.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex flex-col gap-1.5 mb-6">
        <h2 className="text-xl font-bold tracking-tight text-brand-navy">
          {homeDict.title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {homeDict.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rootCategories.map((category) => {
          const categoryLabel = resolveCategoryName({
            slug: category.slug,
            dbName: category.name,
            localeBySlug,
            fallbackBySlug,
          });

          const categoryIntro = resolveCategoryIntro({
            slug: category.slug,
            localeIntrosBySlug,
            fallbackIntrosBySlug,
            fallbackIntro: "",
          });

          const categoryHref = `${basePath === "/" ? "" : basePath}/katalog/c-${category.slug}`;

          return (
            <Link
              key={category.id}
              href={categoryHref}
              className="group flex flex-col justify-between rounded-lg border border-[#d9dde2] bg-white p-4 shadow-sm transition-all duration-200 hover:border-brand-teal hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-center justify-start">
                  <div className="relative h-12 w-12 shrink-0">
                    <Image
                      src={getSectionIconPath(category.slug)}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 object-contain"
                    />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-brand-navy transition-colors group-hover:text-brand-teal">
                  {categoryLabel}
                </h3>
                {categoryIntro && (
                  <p className="mt-1.5 text-[11px] leading-normal text-muted-foreground line-clamp-2">
                    {categoryIntro}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-brand-teal pt-2 border-t border-gray-50">
                <span>{homeDict.cta}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
