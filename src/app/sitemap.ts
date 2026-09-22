import type { MetadataRoute } from "next";
import { getSitemapOfferEntries, getSitemapCategoryEntries } from "@/lib/seo/repository";
import { getResilientSitemapEntries } from "@/lib/seo/sitemap-entries";

// Metadata routes are cached by default. This sitemap must query the catalog only at request time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getResilientSitemapEntries(async () => {
    const [offers, categories] = await Promise.all([
      getSitemapOfferEntries(),
      getSitemapCategoryEntries(),
    ]);

    return { offers, categories };
  });
}
