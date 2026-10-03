import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getPartnerRecruitmentPath } from "@/lib/i18n/paths";
import { PARTNER_RECRUITMENT_BENEFITS, type PartnerRecruitmentLabels } from "@/lib/partner-recruitment";

export function PartnerRecruitmentBanner({ locale, labels }: { locale: Locale; labels: PartnerRecruitmentLabels }) {
  return (
    <section aria-labelledby="partner-recruitment-banner-title" className="mb-8 grid min-w-0 gap-6 rounded-industrial border border-border-industrial border-l-4 border-l-brand-teal bg-white p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">{labels.overline}</p>
        <h2 id="partner-recruitment-banner-title" className="mt-3 text-balance text-2xl font-bold leading-tight text-brand-navy sm:text-3xl">{labels.headline}</h2>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">{labels.description}</p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-brand-navy">
          {PARTNER_RECRUITMENT_BENEFITS.map(benefit => <li key={benefit.title} className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 shrink-0 bg-brand-teal" />{labels[benefit.title]}</li>)}
        </ul>
      </div>
      <Link href={getPartnerRecruitmentPath(locale)} className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-industrial bg-brand-teal px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:w-fit">
        {labels.checkConditions}<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
      </Link>
    </section>
  );
}
