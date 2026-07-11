import Link from "next/link";

export interface RelatedSolutionLink {
  href: string;
  label: string;
}

interface RelatedSolutionsProps {
  links: RelatedSolutionLink[];
  heading: string;
  intro: string;
}

export function RelatedSolutions({ links, heading, intro }: RelatedSolutionsProps) {
  if (links.length === 0) return null;

  return (
    <section className="mt-8 border-t border-border pt-8" aria-labelledby="related-solutions-heading">
      <div className="max-w-3xl">
        <h2 id="related-solutions-heading" className="text-base font-bold text-brand-navy">
          {heading}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex border border-border bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
