/**
 * CategoryRelatedLinks — server-rendered related categories block.
 *
 * NULL RENDERING GATE: returns null when links array is empty or undefined.
 * No placeholders, no "coming soon" text, no empty wrappers.
 * All hrefs are internal — no direct partner URLs.
 */

import Link from "next/link";

export interface CategoryRelatedLink {
  label: string;
  href: string;
}

interface CategoryRelatedLinksProps {
  links: CategoryRelatedLink[] | null | undefined;
  heading: string;
}

export function CategoryRelatedLinks({
  links,
  heading,
}: CategoryRelatedLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-brand-navy">{heading}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="rounded-full border border-border bg-brand-light-gray px-4 py-1.5 text-sm font-medium text-brand-navy transition-all hover:border-brand-teal hover:text-brand-teal"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
