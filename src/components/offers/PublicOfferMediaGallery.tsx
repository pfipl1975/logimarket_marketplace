"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import type { PublicOfferMediaItem } from "@/lib/offers/public-media-resolver";

type PublicOfferMediaGalleryProps = {
  media: PublicOfferMediaItem[];
  offerTitle: string;
  imageUnavailableLabel: string;
};

export function PublicOfferMediaGallery({
  media,
  offerTitle,
  imageUnavailableLabel,
}: PublicOfferMediaGalleryProps) {
  const [selectedId, setSelectedId] = useState<number | "legacy" | null>(() =>
    media.find((item) => item.isPrimary)?.id ?? media[0]?.id ?? null,
  );
  const selectedMedia =
    media.find((item) => item.id === selectedId) ??
    media.find((item) => item.isPrimary) ??
    media[0] ??
    null;

  if (!selectedMedia) {
    return (
      <div className="flex aspect-[4/3] w-full min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-border bg-brand-light-gray text-muted-foreground">
        <Package className="h-14 w-14" aria-hidden="true" />
        <span className="px-4 text-center text-sm">{imageUnavailableLabel}</span>
      </div>
    );
  }

  return (
    <section className="min-w-0" aria-label={offerTitle}>
      <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-lg border border-border bg-white">
        <Image
          key={selectedMedia.id}
          src={selectedMedia.url}
          alt={selectedMedia.altText}
          fill
          sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
          className="object-contain p-3 sm:p-5"
          unoptimized
          preload
        />
      </div>

      {media.length > 1 && (
        <ol className="mt-3 grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
          {media.map((item, index) => {
            const isSelected = item.id === selectedMedia.id;
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  aria-label={`${item.altText} (${index + 1}/${media.length})`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(item.id)}
                  className={`relative aspect-square w-full min-w-0 overflow-hidden rounded-md border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-teal ring-2 ring-brand-teal"
                      : "border-border hover:border-brand-teal/60"
                  }`}
                >
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 120px, 22vw"
                    className="object-contain p-1.5"
                    unoptimized
                  />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
