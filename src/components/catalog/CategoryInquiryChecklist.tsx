/**
 * CategoryInquiryChecklist — server-rendered RFQ inquiry checklist.
 *
 * NULL RENDERING GATE: returns null when items array is empty or undefined.
 * No placeholders, no "coming soon" text, no empty wrappers.
 *
 * Uses native HTML <details>/<summary> for progressive disclosure —
 * server-rendered and crawlable by Google and AI bots.
 * Fully accessible without JavaScript.
 */

export interface InquiryChecklistGroup {
  groupLabel: string;
  fields: string[];
}

interface CategoryInquiryChecklistProps {
  groups: InquiryChecklistGroup[] | null | undefined;
  heading: string;
  /** Optional short description shown above the checklist */
  description?: string | null;
}

export function CategoryInquiryChecklist({
  groups,
  heading,
  description,
}: CategoryInquiryChecklistProps) {
  if (!groups || groups.length === 0) return null;

  const hasAnyFields = groups.some((g) => g.fields.length > 0);
  if (!hasAnyFields) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-brand-navy">{heading}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {groups.map((group, gi) =>
          group.fields.length === 0 ? null : (
            <details key={gi} className="group px-5 py-3" open={gi === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand-navy select-none">
                {group.groupLabel}
                <span className="ml-2 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
                  ▾
                </span>
              </summary>
              <ul className="mt-3 space-y-1.5">
                {group.fields.map((field, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0 font-medium text-brand-teal" aria-hidden="true">□</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </details>
          )
        )}
      </div>
    </section>
  );
}
