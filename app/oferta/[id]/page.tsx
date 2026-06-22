import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink, Info, ShieldCheck } from 'lucide-react'
import { RfqDialog } from '@/components/rfq-dialog'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/format'
import { getOfferById } from '@/lib/queries'

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const offerId = Number(id)
  if (Number.isNaN(offerId)) notFound()

  const offer = await getOfferById(offerId)
  if (!offer) notFound()

  const attributes = Object.entries(offer.technicalAttributes)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Link
          href={
            offer.categorySlug ? `/?kategoria=${offer.categorySlug}` : '/'
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-teal"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Wróć do katalogu
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card">
            {offer.imageUrl ? (
              <Image
                src={offer.imageUrl}
                alt={offer.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : null}
          </div>

          {/* Summary */}
          <div className="flex flex-col">
            <span className="text-sm font-medium uppercase tracking-wide text-teal">
              {offer.categoryName}
            </span>
            <h1 className="mt-1 text-balance text-2xl font-bold leading-tight text-foreground md:text-3xl">
              {offer.title}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" />
              Oferta partnera:{' '}
              <span className="font-semibold text-foreground">
                {offer.partnerName}
              </span>
            </div>

            {offer.description ? (
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                {offer.description}
              </p>
            ) : null}

            <Separator className="my-5" />

            <p className="text-2xl font-bold text-foreground">
              {formatPrice(offer.priceBrutto, offer.priceOnRequest)}
            </p>

            <div className="mt-4">
              {offer.conversionType === 'rfq' ? (
                <RfqDialog
                  offerId={offer.id}
                  offerTitle={offer.title}
                  partnerName={offer.partnerName}
                  size="lg"
                  className="w-full sm:w-auto"
                />
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-teal text-teal-foreground hover:bg-teal/90 sm:w-auto"
                >
                  <a
                    href={`/go/${offer.id}`}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    Zobacz ofertę u Partnera
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-teal"
                aria-hidden="true"
              />
              <span>
                Sprzedaż realizowana jest bezpośrednio przez partnera{' '}
                <strong className="font-semibold text-foreground">
                  poza portalem LogiMarket.pl
                </strong>
                . Portal pełni wyłącznie rolę katalogu ofertowego.
              </span>
            </div>
          </div>
        </div>

        {/* Technical attributes block */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">
            Parametry techniczne
          </h2>
          {attributes.length > 0 ? (
            <dl className="mt-4 grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-2">
              {attributes.map(([key, value], index) => (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/40'
                  }`}
                >
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Brak szczegółowych parametrów. Skontaktuj się z partnerem po
              więcej informacji.
            </p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
