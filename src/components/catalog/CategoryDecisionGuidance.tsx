/**
 * CategoryDecisionGuidance — server-rendered decision guidance block.
 *
 * NULL RENDERING GATE: returns null when items array is empty or undefined.
 * No placeholders, no "coming soon" text, no empty wrappers.
 */

interface CategoryDecisionGuidanceProps {
  items: string[] | null | undefined;
  heading: string;
}

export function CategoryDecisionGuidance({
  items,
  heading,
}: CategoryDecisionGuidanceProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-brand-navy">{heading}</h2>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0 text-brand-teal" aria-hidden="true">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
