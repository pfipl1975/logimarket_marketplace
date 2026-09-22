/**
 * CategoryFaqBlock — server-rendered FAQ block.
 *
 * NULL RENDERING GATE: returns null when items array is empty or undefined.
 * No placeholders, no "coming soon" text, no empty wrappers.
 *
 * Uses native HTML <details>/<summary> for accessibility and crawlability.
 * Rendered server-side — visible to Google and AI bots without JavaScript.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

interface CategoryFaqBlockProps {
  items: FaqItem[] | null | undefined;
  heading: string;
}

export function CategoryFaqBlock({ items, heading }: CategoryFaqBlockProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-white shadow-sm">
      <h2 className="border-b border-border px-5 py-4 text-base font-bold text-brand-navy">
        {heading}
      </h2>
      <div className="divide-y divide-gray-50">
        {items.map((item, idx) => (
          <details key={idx} className="group px-5 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand-navy select-none">
              {item.question}
              <span className="ml-2 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
