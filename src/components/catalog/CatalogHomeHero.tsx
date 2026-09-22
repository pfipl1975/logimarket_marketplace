import type { Dictionary } from "@/lib/i18n/types";

interface CatalogHomeHeroProps {
  labels: Pick<
    Dictionary["catalogHome"],
    "eyebrow" | "title" | "intro" | "modelNote" | "searchHint"
  >;
}

export function CatalogHomeHero({ labels }: CatalogHomeHeroProps) {
  return (
    <section
      aria-labelledby="catalog-home-heading"
      className="border-b border-border pb-8"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-brand-teal">
        {labels.eyebrow}
      </p>
      <h1
        id="catalog-home-heading"
        className="mt-2 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl"
      >
        {labels.title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {labels.intro}
      </p>
      <p className="mt-3 max-w-3xl border-l-2 border-brand-teal pl-3 text-sm font-semibold leading-relaxed text-brand-navy">
        {labels.modelNote}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{labels.searchHint}</p>
    </section>
  );
}
