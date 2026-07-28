import Link from "next/link";
import Image from "next/image";
import type {
  CatalogHomeCategoryNode,
  CatalogHomeSectionNode,
} from "@/lib/catalog/catalog-home";
import type { Dictionary } from "@/lib/i18n/types";

type CatalogSectionDirectoryLabels = Pick<
  Dictionary["catalogHome"],
  "directoryHeading" | "directoryIntro" | "groupsLabel" | "categoriesLabel"
>;

interface CatalogSectionDirectoryProps {
  sections: CatalogHomeSectionNode[];
  labels: CatalogSectionDirectoryLabels;
}

// Recursive nested-list renderer. Depth is preserved by DOM nesting, a left
// border per level and fixed spacing — never by dynamic Tailwind classes.
function CategoryLinkList({ nodes }: { nodes: CatalogHomeCategoryNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
      {nodes.map((node) => {
        const labelClassName = `break-words text-xs leading-relaxed ${
          node.depth === 2
            ? "font-semibold text-brand-navy/80"
            : "text-muted-foreground"
        }`;

        return (
          <li key={node.id} className="min-w-0">
            {node.href ? (
              <Link
                href={node.href}
                className={`${labelClassName} transition-colors hover:text-brand-teal`}
              >
                {node.label}
              </Link>
            ) : (
              <span className={labelClassName}>{node.label}</span>
            )}
            {node.children.length > 0 && <CategoryLinkList nodes={node.children} />}
          </li>
        );
      })}
    </ul>
  );
}

export function CatalogSectionDirectory({
  sections,
  labels,
}: CatalogSectionDirectoryProps) {
  return (
    <section aria-labelledby="catalog-directory-heading">
      <div className="max-w-3xl">
        <h2
          id="catalog-directory-heading"
          className="text-2xl font-bold tracking-tight text-brand-navy"
        >
          {labels.directoryHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {labels.directoryIntro}
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.anchorId}
            aria-labelledby={`${section.anchorId}-heading`}
            className="scroll-mt-28 rounded-[2px] border border-border bg-white p-4 md:p-5"
          >
            <div className="flex items-center gap-3 border-t-2 border-brand-navy pt-4">
              <Image
                src={section.iconPath}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 object-contain"
              />
              <div className="min-w-0 flex-1">
                <h2
                  id={`${section.anchorId}-heading`}
                  className="break-words text-lg font-bold text-brand-navy"
                >
                  {section.href ? (
                    <Link
                      href={section.href}
                      className="transition-colors hover:text-brand-teal"
                    >
                      {section.label}
                    </Link>
                  ) : (
                    section.label
                  )}
                </h2>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {labels.groupsLabel}: {section.groupCount} ·{" "}
                  {labels.categoriesLabel}: {section.categoryCount}
                </p>
              </div>
            </div>

            {section.children.length > 0 && (
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {section.children.map((group) => (
                  <div
                    key={group.id}
                    className="min-w-0 border-t border-border pt-3"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={group.iconPath}
                        alt=""
                        width={24}
                        height={24}
                        className="size-6 shrink-0 object-contain"
                      />
                      <h3 className="min-w-0 break-words text-sm font-bold text-brand-navy">
                        {group.href ? (
                          <Link
                            href={group.href}
                            className="transition-colors hover:text-brand-teal"
                          >
                            {group.label}
                          </Link>
                        ) : (
                          group.label
                        )}
                      </h3>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {labels.categoriesLabel}: {group.categoryCount}
                    </p>
                    <CategoryLinkList nodes={group.children} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
