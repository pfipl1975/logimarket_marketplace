import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/authorization-errors";
import { getPartnerRfqDetail, getPartnerRfqList } from "@/lib/partner-rfq/read-model";
import { PARTNER_RFQ_FILTERS, partnerRfqUrl } from "@/lib/partner-rfq/query";
import { getRfqStatusLabel } from "@/lib/admin/rfq-status-label";
import { PartnerRfqStatusControl } from "@/components/partner/PartnerRfqStatusControl";

const panel = "min-w-0 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6";
const link = "inline-flex min-h-11 items-center justify-center rounded-industrial border border-border-industrial px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-light-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2";
const badge = "inline-flex rounded-industrial border border-border-industrial bg-brand-light-gray px-3 py-1 text-sm font-semibold text-brand-navy";
function basePath(locale: Locale, partnerId: number) {
  return locale === "pl" ? `/partner/${partnerId}/zapytania` : `/${locale}/partner/${partnerId}/rfq`;
}
function handleAuthError(error: unknown) {
  if (error instanceof ForbiddenError || error instanceof UnauthorizedError) notFound();
}
function dateLabel(value: string | null, locale: Locale, fallback: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : fallback;
}

export async function PartnerRfqListPage({ locale, partnerId, searchParams }: {
  locale: Locale; partnerId: number; searchParams: unknown;
}) {
  const { PartnerRfq: dict } = await getDictionary(locale);
  let model;
  try { model = await getPartnerRfqList(partnerId, searchParams); }
  catch (error) {
    handleAuthError(error);
    return <div role="alert" className={panel}><h1 className="text-xl font-semibold">{dict.title}</h1><p className="mt-3">{dict.unavailable}</p></div>;
  }
  const base = basePath(locale, partnerId);
  return (
    <div className="min-w-0 space-y-6">
      <header><h1 className="text-2xl font-bold text-brand-navy">{dict.title}</h1><p className="mt-2 max-w-3xl text-muted-foreground">{dict.intro}</p></header>
      <nav aria-label={dict.filtersLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {PARTNER_RFQ_FILTERS.map(status => (
          <Link key={status} href={partnerRfqUrl(base, status)} aria-current={model.query.status === status ? "page" : undefined}
            className={`${link} min-w-0 justify-between gap-3 ${model.query.status === status ? "border-brand-navy bg-brand-navy text-white underline decoration-2 underline-offset-4 hover:bg-brand-navy" : "bg-white"}`}>
            <span className="wrap-anywhere">{status === "all" ? dict.all : getRfqStatusLabel(status, dict)}</span>
            <span className="shrink-0 font-mono tabular-nums">{model.counts[status]}</span>
          </Link>
        ))}
      </nav>
      {model.items.length === 0 ? (
        <section className={`${panel} space-y-3`} aria-labelledby="rfq-empty">
          <Inbox className="size-6 text-brand-teal" aria-hidden="true" />
          <h2 id="rfq-empty" className="text-lg font-semibold text-brand-navy">{dict[`empty_${model.query.status}`]}</h2>
          <Link className={link} href={partnerRfqUrl(base, "all")}>{dict.viewAll}</Link>
        </section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {model.items.map(item => (
            <li key={item.id} className={`${panel} space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-brand-navy">RFQ #{item.id}</h2>
                <span className={badge}>{getRfqStatusLabel(item.status, dict)}</span>
              </div>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">{dict.created}</dt><dd>{item.createdAt ? <time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale, dict.unavailable)}</time> : dict.unavailable}</dd></div>
                <div><dt className="text-muted-foreground">{dict.buyer}</dt><dd className="font-semibold text-brand-navy wrap-anywhere">{item.companyName || dict.unavailable}</dd></div>
                <div><dt className="text-muted-foreground">{dict.offer}</dt><dd className="wrap-anywhere">{item.offerTitle || dict.unavailable}</dd></div>
              </dl>
              <Link href={`${base}/${item.id}`} className={link} aria-label={`${dict.details} — RFQ #${item.id}`}>{dict.details}</Link>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label={dict.pagination.replace("{current}", String(model.currentPage)).replace("{total}", String(model.pageCount))} className="flex flex-wrap items-center justify-between gap-3">
        {model.currentPage > 1 ? <Link className={link} href={partnerRfqUrl(base, model.query.status, model.currentPage - 1)}>{dict.previous}</Link> : <span />}
        <span className="text-sm text-muted-foreground">{dict.pagination.replace("{current}", String(model.currentPage)).replace("{total}", String(model.pageCount))}</span>
        {model.currentPage < model.pageCount ? <Link className={link} href={partnerRfqUrl(base, model.query.status, model.currentPage + 1)}>{dict.next}</Link> : <span />}
      </nav>
    </div>
  );
}

export async function PartnerRfqDetailPage({ locale, partnerId, rawId }: { locale: Locale; partnerId: number; rawId: string }) {
  const { PartnerRfq: dict } = await getDictionary(locale);
  const base = basePath(locale, partnerId);
  let rfq;
  try { rfq = await getPartnerRfqDetail(partnerId, rawId); }
  catch (error) {
    handleAuthError(error);
    return <div role="alert" className={panel}><h1 className="text-xl font-semibold">{dict.unavailable}</h1><Link className={`${link} mt-4`} href={base}>{dict.back}</Link></div>;
  }
  if (!rfq) notFound();
  const offerHref = rfq.ownedOfferId === null ? null : locale === "pl"
    ? `/partner/${partnerId}/oferty/${rfq.ownedOfferId}` : `/${locale}/partner/${partnerId}/offers/${rfq.ownedOfferId}`;
  return (
    <div className="min-w-0 space-y-6">
      <Link className={link} href={base}>{dict.back}</Link>
      <header className="flex flex-wrap items-start justify-between gap-4" aria-labelledby="rfq-heading">
        <div><h1 id="rfq-heading" className="text-2xl font-bold text-brand-navy">{dict.detailTitle} — RFQ #{rfq.id}</h1><p className="mt-2 text-sm text-muted-foreground">{dict.created}: {rfq.createdAt ? <time dateTime={rfq.createdAt}>{dateLabel(rfq.createdAt, locale, dict.unavailable)}</time> : dict.unavailable}</p></div>
        <span className={badge}>{getRfqStatusLabel(rfq.status, dict)}</span>
      </header>
      <div className="grid min-w-0 gap-6 xl:grid-cols-5">
        <div className="min-w-0 space-y-6 xl:col-span-3">
          <section className={panel} aria-labelledby="rfq-offer">
            <h2 id="rfq-offer" className="text-lg font-semibold text-brand-navy">{dict.offer}</h2>
            <p className="mt-3 font-medium wrap-anywhere">{rfq.offerTitle || dict.unavailable}</p>
            {offerHref ? <Link className={`${link} mt-4`} href={offerHref}>{dict.openOffer}</Link> : null}
          </section>
          <section className={panel} aria-labelledby="rfq-contact">
            <h2 id="rfq-contact" className="text-lg font-semibold text-brand-navy">{dict.contact}</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-muted-foreground">{dict.buyer}</dt><dd className="mt-1 font-semibold wrap-anywhere">{rfq.companyName || dict.unavailable}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">{dict.contactName}</dt><dd className="mt-1 wrap-anywhere">{rfq.contactName || dict.unavailable}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">{dict.email}</dt><dd>{rfq.email ? <a className="inline-flex min-h-11 max-w-full items-center text-brand-teal underline wrap-anywhere focus-visible:outline-2 focus-visible:outline-brand-teal" href={`mailto:${rfq.email}`}>{rfq.email}</a> : dict.unavailable}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">{dict.phone}</dt><dd>{rfq.phone ? <a className="inline-flex min-h-11 max-w-full items-center text-brand-teal underline wrap-anywhere focus-visible:outline-2 focus-visible:outline-brand-teal" href={`tel:${rfq.phone.replace(/[^+\d]/g, "")}`}>{rfq.phone}</a> : dict.unavailable}</dd></div>
            </dl>
            {rfq.email ? <a className={`${link} mt-4`} href={`mailto:${rfq.email}?subject=${encodeURIComponent(`RFQ #${rfq.id} — ${rfq.offerTitle ?? ""}`)}`}>{dict.replyEmail}</a> : null}
          </section>
          <section className={panel} aria-labelledby="rfq-message">
            <h2 id="rfq-message" className="text-lg font-semibold text-brand-navy">{dict.message}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">{rfq.message || dict.unavailable}</p>
          </section>
        </div>
        <section className={`${panel} self-start xl:col-span-2`} aria-labelledby="rfq-workflow">
          <h2 id="rfq-workflow" className="mb-4 text-lg font-semibold text-brand-navy">{dict.workflow}</h2>
          <PartnerRfqStatusControl key={rfq.status} partnerId={partnerId} rfqId={rfq.id} status={rfq.status} dict={dict} />
        </section>
      </div>
    </div>
  );
}
