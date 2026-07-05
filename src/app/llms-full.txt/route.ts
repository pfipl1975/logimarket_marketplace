import { getCategories, getOffers } from "@/app/actions";
import { getGlossaryTerms } from "@/lib/glossary";

export async function GET() {
  try {
    const [categories, offers] = await Promise.all([
      getCategories(),
      getOffers(),
    ]);

    let content = `# LogiMarket - Full RAG Directory\n\n`;

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
