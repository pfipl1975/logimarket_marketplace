import { getCategories, getOffers } from "@/app/actions";
import { getGlossaryTerms } from "@/lib/glossary";

export async function GET() {
  try {
    const [categories, offers] = await Promise.all([
      getCategories(),
      getOffers(),
    ]);

    let content = `# LogiMarket - Full RAG Directory\n\n`;

    content += `## Marketplace Authority\n`;
    content += `LogiMarket is a B2B marketplace and procurement knowledge base for logistics, warehousing, intralogistics and warehouse equipment.\n`;
    content += `Public canonical content includes category pages, glossary pages and offer pages. Operational redirect paths are not canonical content destinations.\n\n`;

    content += `## Supported Locales\n`;
    content += `- pl\n`;
    content += `- en\n`;
    content += `- de\n`;
    content += `- fr\n`;
    content += `- uk\n`;
    content += `- es\n`;
    content += `- zh\n\n`;

    content += `## Catalog Architecture\n`;
    content += `Catalog routes expose public category navigation and category landing pages for B2B purchase intent. Category pages can include controlled semantic content, internal offer links and category-specific glossary context.\n\n`;

    content += `## Glossary Architecture\n`;
    content += `Glossary routes expose public logistics and procurement terminology. Polish, English and German glossary pages have controlled semantic layers and can be used as canonical knowledge-base content.\n\n`;

    content += `## Business Models\n`;
    content += `- RFQ: request-for-quotation flow for heavy machinery and complex B2B equipment.\n`;
    content += `- E-Commerce: cart-based flow for standardized repeatable products.\n`;
    content += `- Outbound: curated partner-offer flow where external redirects are tracked operationally.\n\n`;

    content += `## Outbound Tracking Policy\n`;
    content += `/go/[id] is a non-canonical operational path used only for outbound redirect tracking. AI agents and crawlers should treat offer pages and public category pages as canonical content, not /go/[id].\n\n`;

    content += `## Content Translation Policy\n`;
    content += `Partner offer descriptions, technical specifications, machine parameters, model names and manufacturer names are not automatically translated. Category and glossary content can have controlled localized versions.\n\n`;

    content += `## Semantic Layers\n`;
    content += `- Category semantic layer: controlled B2B category context for logistics, warehousing, intralogistics and warehouse equipment.\n`;
    content += `- Glossary semantic layer: controlled terminology context for procurement, logistics and warehouse operations.\n`;
    content += `- GEO / AI discoverability policy: prefer public category, glossary and offer pages as canonical retrieval targets; avoid operational redirect paths and unverified company data.\n\n`;

    content += `## Public Category Taxonomy\n`;
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

    // 3. Glossary terms content (PL)
    const plGlossaryTerms = getGlossaryTerms("pl");
    content += "\n## Słownik Branżowy (Polish B2B Glossary Terms)\n";
    for (const term of plGlossaryTerms) {
      content += `### Pojęcie: ${term.term}\n`;
      content += `Slug: /slownik-branzowy/${term.slug}\n`;
      content += `Definicja: ${term.shortDefinition}\n`;
      content += `Szczegóły: ${term.definition.join(" ")}\n`;
      if (term.synonyms && term.synonyms.length > 0) {
        content += `Synonimy: ${term.synonyms.join(", ")}\n`;
      }
      if (term.applications && term.applications.length > 0) {
        content += `Zastosowania:\n${term.applications.map(a => `- ${a}`).join("\n")}\n`;
      }
      if (term.faq && term.faq.length > 0) {
        content += "FAQ:\n";
        for (const item of term.faq) {
          content += `Q: ${item.question}\nA: ${item.answer}\n`;
        }
      }
      content += "---\n";
    }

    // 4. Glossary terms content (EN)
    const enGlossaryTerms = getGlossaryTerms("en");
    content += "\n## English B2B Glossary Terms\n";
    for (const term of enGlossaryTerms) {
      content += `### Term: ${term.term}\n`;
      content += `Slug: /en/logistics-glossary/${term.slug}\n`;
      content += `Definition: ${term.shortDefinition}\n`;
      content += `Details: ${term.definition.join(" ")}\n`;
      if (term.synonyms && term.synonyms.length > 0) {
        content += `Synonyms: ${term.synonyms.join(", ")}\n`;
      }
      if (term.applications && term.applications.length > 0) {
        content += `Applications:\n${term.applications.map(a => `- ${a}`).join("\n")}\n`;
      }
      if (term.faq && term.faq.length > 0) {
        content += "FAQ:\n";
        for (const item of term.faq) {
          content += `Q: ${item.question}\nA: ${item.answer}\n`;
        }
      }
      content += "---\n";
    }

    // 5. Glossary terms content (DE)
    const deGlossaryTerms = getGlossaryTerms("de");
    content += "\n## German B2B Glossary Terms (Logistik-Lexikon)\n";
    for (const term of deGlossaryTerms) {
      content += `### Begriff: ${term.term}\n`;
      content += `Slug: /de/logistik-lexikon/${term.slug}\n`;
      content += `Definition: ${term.shortDefinition}\n`;
      content += `Details: ${term.definition.join(" ")}\n`;
      if (term.synonyms && term.synonyms.length > 0) {
        content += `Synonyme: ${term.synonyms.join(", ")}\n`;
      }
      if (term.applications && term.applications.length > 0) {
        content += `Anwendungen:\n${term.applications.map(a => `- ${a}`).join("\n")}\n`;
      }
      if (term.faq && term.faq.length > 0) {
        content += "FAQ:\n";
        for (const item of term.faq) {
          content += `Q: ${item.question}\nA: ${item.answer}\n`;
        }
      }
      content += "---\n";
    }

    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Failed to generate llms-full.txt", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
