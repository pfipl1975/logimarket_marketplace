/**
 * CategoryTechnicalParameters — server-rendered technical parameter table.
 *
 * NULL RENDERING GATE: returns null when params object is empty or undefined.
 * No placeholders, no "coming soon" text, no empty wrappers.
 */

interface CategoryTechnicalParametersProps {
  params: Record<string, string> | null | undefined;
  heading: string;
}

export function CategoryTechnicalParameters({
  params,
  heading,
}: CategoryTechnicalParametersProps) {
  if (!params || Object.keys(params).length === 0) return null;

  const entries = Object.entries(params);

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <h2 className="border-b border-border px-5 py-3 text-base font-bold text-brand-navy">
        {heading}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {entries.map(([key, value]) => (
              <tr
                key={key}
                className="border-b border-gray-50 last:border-0 even:bg-gray-50/50"
              >
                <td className="w-1/2 px-5 py-2.5 font-medium text-brand-navy">{key}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
