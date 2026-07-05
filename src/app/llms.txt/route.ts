export async function GET() {
  const content = `# LogiMarket

## Context
LogiMarket is an industrial B2B procurement marketplace and intralogistics directory for warehouse equipment, logistics products, packaging supplies and industrial procurement.

## Entity Authority
- Entity name: LogiMarket
- Public domain: https://www.logimarket.eu
- Entity type: B2B marketplace and procurement knowledge base.
- Scope: logistics, warehousing, intralogistics and warehouse equipment.
- Supported locales: pl, en, de, fr, uk, es, zh.
- Partner offer content can originate from partners and is not automatically translated.

## Main Information
- Homepage: Public entry point to procurement areas, catalog navigation and selected B2B offers.
- Catalog: Structured navigation for warehouse equipment, intralogistics, packaging and industrial supplies.
- Category Pages: Public landing pages for B2B purchase intents and warehouse applications.
- Offer Pages: Public product and machinery pages with technical parameters, partner information and conversion model.
- Glossary Pages: Public procurement and logistics terminology pages in supported glossary locales.
- llms-full.txt: Expanded AI discovery and RAG directory with public taxonomy, offer and glossary context.
- sitemap.xml: Public indexation map for homepage, catalog, category, offer and glossary routes.
- RFQ Flow: Procurement inquiry path for heavy machinery and complex B2B equipment.
- E-Commerce Flow: Cart-based order path for standardized supplies and consumables.
- Outbound Flow: /go/[id] is used only for outbound redirect tracking and is not canonical content.

## Business Model
- RFQ: Used for heavy machinery and complex equipment. CTA: request a quote.
- E-Commerce: Used for standardized repeatable products. CTA: add to cart.
- Outbound: Used for curated partner offers. /go/[id] is operational tracking, not canonical content.

## Focus Areas
- Warehouse racking and storage systems
- Forklifts and material handling equipment
- Packaging materials and consumables
- Pallets, boxes and warehouse supplies
- Workshop furniture and industrial equipment
- Safety systems and warehouse marking
- Intralogistics and warehouse procurement

## Core Paths
- /
- /katalog
- /katalog/[categorySlug]
- /oferta/[id]
- /slownik-branzowy
- /slownik-branzowy/[slug]
- /en/logistics-glossary
- /en/logistics-glossary/[slug]
- /de/logistik-lexikon
- /de/logistik-lexikon/[slug]
- /en
- /de
- /fr
- /uk
- /es
- /zh
- /llms-full.txt
- /sitemap.xml

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
- Partner offer descriptions, machine parameters, model names and manufacturer names should not be automatically translated.
- Archived industrial offers may remain indexable for historical and long-tail B2B search context.
- Draft, hidden and inactive offers must not be treated as public procurement results.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
