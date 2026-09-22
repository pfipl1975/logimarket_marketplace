import Image from "next/image";
import type { CatalogHomeSectionNode } from "@/lib/catalog/catalog-home";
import type { Dictionary } from "@/lib/i18n/types";

interface CatalogSectionIndexProps {
  sections: CatalogHomeSectionNode[];
  labels: Pick<
    Dictionary["catalogHome"],
    "sectionIndexHeading" | "sectionIndexIntro" | "groupsLabel" | "categoriesLabel"
  >;
}

export function CatalogSectionIndex({ sections, labels }: CatalogSectionIndexProps) {
  return (
    <nav aria-labelledby="catalog-section-index-heading">
      <h2
        id="catalog-section-index-heading"
        className="text-xl font-bold tracking-tight text-brand-navy"
      >
        {labels.sectionIndexHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {labels.sectionIndexIntro}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.anchorId}`}
              className="flex h-full items-center gap-3 rounded-[2px] border border-border bg-white px-4 py-3 transition-colors hover:border-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            >
              <Image
                src={section.iconPath}
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 object-contain"
              />
              <span className="min-w-0">
                <span className="block break-words text-sm font-bold text-brand-navy">
                  {section.label}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {labels.groupsLabel}: {section.groupCount} ·{" "}
                  {labels.categoriesLabel}: {section.categoryCount}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
