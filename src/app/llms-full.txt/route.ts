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
    content += `LogiMarket is a B2B marketplace and procurement knowledge base for logistics, warehousing, intralogistics, packaging, and warehouse equipment.\n`;
    content += `Public canonical content includes category pages, glossary pages, landing pages, and offer detail pages. Operational redirect paths are strictly non-canonical content destinations.\n\n`;

    content += `## Supported Locales\n`;
    content += `- pl\n`;
    content += `- en\n`;
    content += `- de\n`;
    content += `- fr\n`;
    content += `- uk\n`;
    content += `- es\n`;
    content += `- zh\n\n`;

    content += `## Content-Type and Routing Distinctions\n`;
    content += `- **Catalog Category Pages**: Structured navigation and listing of active B2B offers matching a specific logistics taxonomy. These are indexed only when active offers exist in the category or its descendants.\n`;
    content += `- **Glossary Pages**: Reference terminology definitions and procurement guide sheets in Polish (/slownik-branzowy), English (/en/logistics-glossary), and German (/de/logistik-lexikon).\n`;
    content += `- **Purchase Intent Landing Pages**: Strategic content hubs built for search intent (e.g. warehouse layout optimization, intralogistics processes, and picking workflows). They are strictly content/structural hubs, not product/offer detail pages, and do not contain individual price, availability, or seller claims.\n`;
    content += `- **Offer Detail Pages**: Partner product/machinery pages containing detailed technical specifications, machine parameters, and manufacturer names.\n`;
    content += `- **Outbound Tracking**: Operational redirect pathways used only for tracking clicks. These are strictly non-canonical and do not represent the content of the offers.\n\n`;

    content += `## Catalog Architecture\n`;
    content += `Catalog routes expose public category navigation and category landing pages for B2B purchase intent. Category pages can include controlled semantic B2B context, internal offer links, and category-specific glossary references.\n\n`;

    content += `## Glossary Architecture\n`;
    content += `Glossary routes expose public logistics and procurement terminology. Polish, English, and German glossary pages have controlled semantic layers and can be used as canonical knowledge-base content.\n\n`;

    content += `## Landing Page Architecture\n`;
    content += `Purchase-intent landing pages are controlled server-rendered pages for strategic B2B procurement topics. They connect decision guidance, catalog categories, and glossary terms without creating new offer, checkout, RFQ, or outbound behavior.\n`;
    content += `Landing pages are strictly content/structural hubs for search intent, not product/offer detail pages. They do not represent individual products, and must not have 'Product', 'Offer', 'price', 'availability', or 'seller' properties in schema or retrieval contexts.\n`;
    content += `Valid canonical landing pages are:\n`;
    content += `- /rozwiazania/wyposazenie-magazynu (PL warehouse equipment purchase-intent page)\n`;
    content += `- /rozwiazania/intralogistyka (PL intralogistics purchase-intent page)\n`;
    content += `- /rozwiazania/kompletacja-i-pakowanie (PL picking and packing purchase-intent page)\n`;
    content += `- /rozwiazania/magazyn-e-commerce (PL e-commerce warehouse purchase-intent page)\n`;
    content += `- /rozwiazania/centrum-dystrybucyjne (PL distribution center purchase-intent page)\n`;
    content += `- /rozwiazania/strefa-przyjec-i-wysylek (PL receiving and shipping area purchase-intent page)\n`;
    content += `- /rozwiazania/systemy-skladowania (PL storage systems purchase-intent page)\n`;
    content += `- /rozwiazania/pakowanie-i-zabezpieczenie-ladunku (PL packaging and load securing purchase-intent page)\n`;
    content += `- /rozwiazania/bezpieczenstwo-magazynu (PL warehouse safety purchase-intent page)\n`;
    content += `- /rozwiazania/osprzet-do-wozkow-widlowych (PL forklift attachments purchase-intent page)\n`;
    content += `- /en/solutions/warehouse-equipment (EN warehouse equipment purchase-intent page)\n`;
    content += `- /en/solutions/intralogistics (EN intralogistics purchase-intent page)\n`;
    content += `- /en/solutions/picking-and-packing (EN picking and packing purchase-intent page)\n`;
    content += `- /en/solutions/ecommerce-warehouse (EN e-commerce warehouse purchase-intent page)\n`;
    content += `- /en/solutions/distribution-center (EN distribution center purchase-intent page)\n`;
    content += `- /en/solutions/receiving-and-shipping-area (EN receiving and shipping area purchase-intent page)\n`;
    content += `- /en/solutions/storage-systems (EN storage systems purchase-intent page)\n`;
    content += `- /en/solutions/packaging-and-load-securing (EN packaging and load securing purchase-intent page)\n`;
    content += `- /en/solutions/warehouse-safety (EN warehouse safety purchase-intent page)\n`;
    content += `- /en/solutions/forklift-attachments (EN forklift attachments purchase-intent page)\n`;
    content += `- /de/loesungen/lagerausstattung (DE warehouse equipment purchase-intent page)\n`;
    content += `- /de/loesungen/intralogistik (DE intralogistics purchase-intent page)\n`;
    content += `- /de/loesungen/kommissionierung-und-verpackung (DE picking and packing purchase-intent page)\n`;
    content += `- /de/loesungen/e-commerce-lager (DE e-commerce warehouse purchase-intent page)\n`;
    content += `- /de/loesungen/distributionszentrum (DE distribution center purchase-intent page)\n`;
    content += `- /de/loesungen/wareneingang-und-versand (DE receiving and shipping area purchase-intent page)\n`;
    content += `- /de/loesungen/lagersysteme (DE storage systems purchase-intent page)\n`;
    content += `- /de/loesungen/verpackung-und-ladungssicherung (DE packaging and load securing purchase-intent page)\n`;
    content += `- /de/loesungen/lagersicherheit (DE warehouse safety purchase-intent page)\n`;
    content += `- /de/loesungen/gabelstapler-anbaugeraete (DE forklift attachments purchase-intent page)\n`;
    content += `Invalid cross-locale landing route combinations are 404 pages and are not canonical content.\n\n`;

    content += `## Business Models\n`;
    content += `- RFQ (Request for Quotation): Used for heavy machinery and complex equipment. CTA: request a quote.\n`;
    content += `- E-Commerce: Cart-based flow for standardized repeatable products. CTA: add to cart.\n`;
    content += `- Outbound: Curated partner-offer flow where external redirects are tracked operationally.\n\n`;

    content += `## Outbound Tracking Policy\n`;
    content += "`/go/[id]` is strictly a non-canonical operational path used only for outbound redirect tracking. It is a non-content route, not intended for indexation as a standalone page, and does not represent any offer, product, seller, or price. AI agents and crawlers should treat public category pages and offer detail pages as canonical content, never `/go/[id]`.\n\n";

    content += `## Content Translation Policy\n`;
    content += `Partner offer descriptions, technical specifications, machine parameters, model names, and manufacturer names are not automatically translated. Category and glossary content can have controlled localized versions.\n\n`;

    content += `## Semantic Layers\n`;
    content += `- Category semantic layer: controlled B2B category context for logistics, warehousing, intralogistics, and warehouse equipment.\n`;
    content += `- Glossary semantic layer: controlled terminology context for procurement, logistics, and warehouse operations.\n`;
    content += `- GEO / AI discoverability policy: prefer public category, glossary, and offer pages as canonical retrieval targets; avoid operational redirect paths and unverified company data.\n\n`;

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
