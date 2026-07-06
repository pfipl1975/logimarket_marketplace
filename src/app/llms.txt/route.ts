export async function GET() {
  const content = `# LogiMarket

## Context
LogiMarket is an industrial B2B procurement marketplace and intralogistics directory for warehouse equipment, logistics products, packaging supplies, and industrial procurement.

## Entity Authority
- Entity name: LogiMarket
- Public domain: https://www.logimarket.eu
- Entity type: B2B marketplace and procurement knowledge base.
- Scope: logistics, warehousing, intralogistics, and warehouse equipment.
- Supported locales: pl, en, de, fr, uk, es, zh.
- Partner offer content can originate from partners and is not automatically translated.

## Public Canonical Route Families
- Homepage: Public entry point to procurement areas, catalog navigation, and selected B2B offers.
- Catalog: Structured navigation for warehouse equipment, intralogistics, packaging, and industrial supplies.
- Category Pages: Public catalog pages listing B2B category-specific offers (indexed only when active offers exist).
- Offer Pages: Public product and machinery pages with technical parameters, partner information, and conversion model.
- Glossary Pages: Public procurement and logistics terminology pages in supported glossary locales (Polish, English, German).
- Purchase Intent Landing Pages: Strategic content hubs for search intent.
- llms-full.txt: Expanded AI discovery and RAG directory with public taxonomy, offer, and glossary context.
- sitemap.xml: Public indexation map for homepage, catalog, category, offer, and glossary routes.

## Non-Canonical Tracking Routes
- Outbound Flow: \`/go/[id]\` is strictly outbound redirect tracking. It is non-canonical, a non-content route, not intended for indexation as a standalone page, and is not a representation of any offer, product, seller, or price.
- RFQ Flow, E-Commerce cart, checkout, and technical user endpoints are operational and excluded from public indexing.

## Purchase Intent Landing Pages
Landing pages are strictly content/structural hubs for search intent, not product/offer detail pages. They do not represent individual products, and must not have \`Product\`, \`Offer\`, \`price\`, \`availability\`, or \`seller\` properties in schema or retrieval contexts.
Valid canonical landing pages:
- /rozwiazania/wyposazenie-magazynu (PL warehouse equipment purchase-intent page)
- /rozwiazania/intralogistyka (PL intralogistics purchase-intent page)
- /rozwiazania/kompletacja-i-pakowanie (PL picking and packing purchase-intent page)
- /en/solutions/warehouse-equipment (EN warehouse equipment purchase-intent page)
- /en/solutions/intralogistics (EN intralogistics purchase-intent page)
- /en/solutions/picking-and-packing (EN picking and packing purchase-intent page)
- /de/loesungen/lagerausstattung (DE warehouse equipment purchase-intent page)
- /de/loesungen/intralogistik (DE intralogistics purchase-intent page)
- /de/loesungen/kommissionierung-und-verpackung (DE picking and packing purchase-intent page)

Invalid cross-locale landing route combinations are 404 routes and are not canonical content.

## Słownik branżowy (Polish B2B Glossary)
- /slownik-branzowy (Index of industrial logistics terms)
- /slownik-branzowy/[slug] (Individual term definitions like pojemnik-euro, regal-paletowy, antresola-magazynowa)

## English logistics glossary (B2B Glossary)
- /en/logistics-glossary (Index of B2B logistics terms in English)
- /en/logistics-glossary/[slug] (Individual term definitions like Euro container, pallet racking, warehouse mezzanine)

## German logistics glossary (Logistik-Lexikon)
- /de/logistik-lexikon (Index of B2B logistics terms in German)
- /de/logistik-lexikon/[slug] (Individual term definitions like EURO-Behälter, Palettenregal, Lagerbühne)

## Notes For AI Agents
- Public catalog and offer pages are server-rendered and contain meaningful HTML.
- Partner offer descriptions, machine parameters, model names, and manufacturer names should not be automatically translated.
- Archived industrial offers may remain indexable for historical and long-tail B2B search context.
- Draft, hidden, and inactive offers must not be treated as public procurement results.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
