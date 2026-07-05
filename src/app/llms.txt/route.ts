export async function GET() {
  const content = `# LogiMarket

## Context
LogiMarket is an industrial B2B procurement marketplace and intralogistics directory for warehouse equipment, logistics products, packaging supplies and industrial procurement.

## Main Information
- Homepage: Public entry point to procurement areas, catalog navigation and selected B2B offers.
- Catalog: Structured navigation for warehouse equipment, intralogistics, packaging and industrial supplies.
- Category Pages: Public landing pages for B2B purchase intents and warehouse applications.
- Offer Pages: Public product and machinery pages with technical parameters, partner information and conversion model.
- RFQ Flow: Procurement inquiry path for heavy machinery and complex B2B equipment.
- E-Commerce Flow: Cart-based order path for standardized supplies and consumables.
- Outbound Flow: Partner offer redirects are tracked only through /go/[id].

## Business Model
- RFQ: Used for heavy machinery and complex equipment. CTA: request a quote.
- E-Commerce: Used for standardized repeatable products. CTA: add to cart.
- Outbound: Used for curated partner offers. External redirects go through /go/[id].

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
- /en
- /de
- /fr
- /uk
- /es
- /zh

## Słownik branżowy (Polish B2B Glossary)
- /slownik-branzowy (Index of industrial logistics terms)
- /slownik-branzowy/[slug] (Individual term definitions like pojemnik-euro, regal-paletowy, antresola-magazynowa)

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
