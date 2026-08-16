import type { Dictionary } from "@/lib/i18n/types";

export function AdminEntryPage({
  dictionary,
}: {
  dictionary: Dictionary["admin"];
}) {
  return (
    <div className="max-w-4xl border border-border-industrial bg-card text-card-foreground p-8 sm:p-12 rounded-industrial shadow-sm">
      <header className="mb-8 border-b border-border-industrial pb-6">
        <p className="text-accent text-xs sm:text-sm font-semibold tracking-widest uppercase mb-2">
          {dictionary.eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-primary">
          {dictionary.title}
        </h1>
      </header>

      <div className="space-y-6 text-muted-foreground">
        <p className="text-base sm:text-lg leading-relaxed">
          {dictionary.description}
        </p>

        <div className="bg-secondary p-5 sm:p-6 border-l-4 border-accent">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {dictionary.scopeDescription}
          </p>
        </div>

        <section className="mt-8 pt-6 border-t border-border-industrial/50">
          <h2 className="text-xl font-medium text-primary mb-4">{dictionary.moduleAvailabilityHeading}</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span className="font-medium text-foreground">{dictionary.dashboardNav}</span>
              <span className="text-sm text-muted-foreground ml-auto">— {dictionary.moduleReadOnlyStatus}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span className="font-medium text-foreground">{dictionary.offersNav}</span>
              <span className="text-sm text-muted-foreground ml-auto">— {dictionary.moduleReadOnlyStatus}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span className="font-medium text-foreground">{dictionary.partnersNav}</span>
              <span className="text-sm text-muted-foreground ml-auto">— {dictionary.moduleReadOnlyStatus}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span className="font-medium text-foreground">{dictionary.rfqNav}</span>
              <span className="text-sm text-muted-foreground ml-auto">— {dictionary.moduleReadOnlyStatus}</span>
            </li>
            <li className="flex items-center gap-3 opacity-60">
              <span className="w-2 h-2 bg-border-industrial rounded-full"></span>
              <span className="font-medium text-foreground">{dictionary.taxonomyNav}</span>
              <span className="text-sm text-muted-foreground ml-auto">— {dictionary.plannedLabel}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
