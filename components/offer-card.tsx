import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { CatalogOffer } from '@/lib/queries'
import { formatPrice } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RfqDialog } from '@/components/rfq-dialog'

export function OfferCard({ offer }: { offer: CatalogOffer }) {
  const attributes = Object.entries(offer.technicalAttributes).slice(0, 4)

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/oferta/${offer.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {offer.imageUrl ? (
          <Image
            src={offer.imageUrl}
            alt={offer.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {offer.isFeatured ? (
          <Badge className="absolute left-3 top-3 bg-teal text-teal-foreground hover:bg-teal">
            Wyróżnione
          </Badge>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-teal">
          {offer.categoryName}
        </span>
        <h3 className="mt-1 text-balance text-base font-semibold leading-snug text-card-foreground">
          <Link href={`/oferta/${offer.id}`} className="hover:underline">
            {offer.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{offer.partnerName}</p>

        {attributes.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md bg-muted/60 p-3 text-xs">
            {attributes.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="font-semibold text-card-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
          <p className="text-lg font-bold text-card-foreground">
            {formatPrice(offer.priceBrutto, offer.priceOnRequest)}
          </p>

          {offer.conversionType === 'rfq' ? (
            <RfqDialog
              offerId={offer.id}
              offerTitle={offer.title}
              partnerName={offer.partnerName}
              className="w-full"
            />
          ) : (
            <Button
              asChild
              className="w-full bg-teal text-teal-foreground hover:bg-teal/90"
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
      </div>
    </article>
  )
}
