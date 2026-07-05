import { getCategories, getOffers } from "@/app/actions";
import { getGlossaryTerms } from "@/lib/glossary";

export async function GET() {
  try {
    const [categories, offers] = await Promise.all([
      getCategories(),
      getOffers(),
    ]);

    let content = `# LogiMarket - Full RAG Directory

## Public Category Taxonomy
`;

    if (categories.length === 0) {
      content += "- No categories defined.\n";
    } else {
      categories.forEach((cat) => {
        content += `- ${cat.name} (Slug: c-${cat.slug})\n`;
      });
    }

    content += "\n## Active B2B Offers\n";

    if (offers.length === 0) {
      content += "- No active offers available.\n";
    } else {
      offers.forEach((offer) => {
        const descSnippet = offer.description
          ? offer.description.replace(/\s+/g, " ").trim().slice(0, 120) + "..."
          : "No description available.";
        content += `- ${offer.title} (Category: ${offer.categoryName}, Offer model: ${offer.offerModel})\n`;
        content += `  Path: /oferta/${offer.id}\n`;
        content += `  Description: ${descSnippet}\n\n`;
      });
    }

    const glossaryTerms = getGlossaryTerms();
    content += "\n## Słownik branżowy (B2B Glossary)\n";
    if (glossaryTerms.length === 0) {
      content += "- No glossary terms defined.\n";
    } else {
      glossaryTerms.forEach((term) => {
        content += `- ${term.term} (Slug: ${term.slug})\n`;
        content += `  Path: /slownik-branzowy/${term.slug}\n`;
        content += `  Description: ${term.shortDefinition}\n\n`;
      });
    }

    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    // Return a safe static fallback on DB or initialization error to satisfy RAG and avoid breaking the build/crawling.
    const fallbackContent = `# LogiMarket - Full RAG Directory (Limited)

Due to a temporary database connection limit or maintenance, the dynamic catalog and offer index is currently unavailable.

Please refer to:
- Homepage: /
- Main Catalog: /katalog
- Static LLM Profile: /llms.txt
`;
    return new Response(fallbackContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  }
}
