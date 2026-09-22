import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";

export interface AdminOfferMediaItem {
  id: number;
  sortOrder: number;
  isPrimary: boolean;
  altText: string | null;
  url: string;
}

export type AdminOfferMediaResult =
  | { ok: true; media: AdminOfferMediaItem[] }
  | { ok: false; code?: string };

export interface AdminOfferDetailMediaDict {
  sectionMedia: string;
  mediaEmpty: string;
  mediaError: string;
  mediaPrimary: string;
  mediaImage: string;
}

interface AdminOfferDetailMediaGalleryProps {
  mediaResult: AdminOfferMediaResult;
  offerTitle: string;
  dict: AdminOfferDetailMediaDict;
}

export function AdminOfferDetailMediaGallery({
  mediaResult,
  offerTitle,
  dict,
}: AdminOfferDetailMediaGalleryProps) {
  return (
    <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
      <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-brand-teal" />
          <h2 className="font-medium text-brand-navy">{dict.sectionMedia}</h2>
        </div>
        {mediaResult.ok && mediaResult.media.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
            {mediaResult.media.length}
          </span>
        )}
      </div>

      {!mediaResult.ok ? (
        <div className="p-6">
          <div
            role="alert"
            className="rounded-industrial border border-destructive/20 bg-destructive/5 p-4"
          >
            <p className="text-sm font-medium text-destructive">{dict.mediaError}</p>
          </div>
        </div>
      ) : mediaResult.media.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-muted-foreground italic">{dict.mediaEmpty}</p>
        </div>
      ) : (
        <div className="p-6">
          <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaResult.media.map((item, index) => {
              const alt =
                item.altText || `${offerTitle} — ${dict.mediaImage} ${index + 1}`;
              return (
                <li
                  key={item.id}
                  className="min-w-0 rounded-industrial border border-border-industrial bg-white p-3 shadow-soft flex flex-col"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded bg-brand-light-gray flex items-center justify-center">
                    <Image
                      src={item.url}
                      alt={alt}
                      width={320}
                      height={240}
                      className="aspect-4/3 w-full rounded bg-brand-light-gray object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      {dict.mediaImage} {index + 1}
                    </span>
                    {item.isPrimary && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-navy text-white">
                        {dict.mediaPrimary}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
