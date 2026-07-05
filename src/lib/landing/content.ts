import type { LandingPageContent } from "./types";

export const landingPages = [
  {
    intent: "warehouse-equipment",
    locale: "pl",
    slug: "wyposazenie-magazynu",
    path: "/rozwiazania/wyposazenie-magazynu",
    sectionLabel: "Rozwiązania",
    title: "Wyposażenie magazynu",
    eyebrow: "B2B purchase intent",
    intro:
      "Dobór wyposażenia magazynu zaczyna się od procesów, obciążeń i sposobu pracy operatorów. Ta strona porządkuje decyzje zakupowe dla regałów, pojemników, stanowisk roboczych i infrastruktury magazynowej.",
    procurementContextTitle: "Kontekst zakupowy",
    procurementContext: [
      "Wyposażenie powinno wspierać realny przepływ materiałów: przyjęcie, składowanie, kompletację, pakowanie i wydanie.",
      "W procesie B2B istotne są zgodność z układem hali, bezpieczeństwo pracy, możliwość rozbudowy oraz spójność z istniejącym sprzętem.",
      "Zakupy warto prowadzić przez porównanie kategorii, parametrów technicznych i powiązanych pojęć branżowych.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Przepływ i ergonomia",
        description:
          "Oceń, które strefy magazynu generują najwięcej ruchu i gdzie wyposażenie może skrócić drogę operatora lub ograniczyć przeładunki.",
      },
      {
        title: "Nośność i kompatybilność",
        description:
          "Porównuj parametry konstrukcji, wymiarów, obciążeń i używanych jednostek ładunkowych zamiast wybierać pojedynczy produkt w oderwaniu od procesu.",
      },
      {
        title: "Skalowalność systemu",
        description:
          "Uwzględnij możliwość rozbudowy regałów, stanowisk, pojemników i podestów bez przebudowy całej organizacji magazynu.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Regały i systemy składowania",
        href: "/katalog/c-regaly-i-systemy-skladowania",
        context: "Podstawowa infrastruktura składowania dla palet, pojemników i komponentów.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        href: "/katalog/c-pojemniki-plastikowe-euro",
        context: "Jednostki magazynowe dla kompletacji, transportu wewnętrznego i odkładania części.",
      },
      {
        label: "Antresole i podesty magazynowe",
        href: "/katalog/c-antresole-i-podesty-magazynowe",
        context: "Rozbudowa powierzchni użytkowej bez zmiany lokalizacji magazynu.",
      },
      {
        label: "Stoły pakowe i kompletacyjne",
        href: "/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Stanowiska dla operacji kompletacji, kontroli i pakowania.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Regał paletowy",
        href: "/slownik-branzowy/regal-paletowy",
        context: "Definicja systemu składowania i jego roli w magazynie B2B.",
      },
      {
        label: "Pojemnik Euro",
        href: "/slownik-branzowy/pojemnik-euro",
        context: "Standardowy pojemnik logistyczny używany w przepływach magazynowych.",
      },
      {
        label: "Kompletacja zamówień",
        href: "/slownik-branzowy/kompletacja-zamowien",
        context: "Proces pobierania i przygotowania towaru do realizacji zamówień.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Od czego zacząć dobór wyposażenia magazynu?",
        answer:
          "Najpierw opisz przepływ materiałów, typ jednostek ładunkowych, ograniczenia hali i strefy pracy. Dopiero potem porównuj kategorie wyposażenia.",
      },
      {
        question: "Czy jedna kategoria wystarczy do zaplanowania magazynu?",
        answer:
          "Zwykle nie. Regały, pojemniki, stoły robocze i podesty tworzą wspólny system, dlatego decyzje warto analizować razem.",
      },
      {
        question: "Jak ograniczyć ryzyko nietrafionego zakupu?",
        answer:
          "Użyj checklisty procesowej: obciążenia, wymiary, ergonomia, bezpieczeństwo, możliwość rozbudowy i zgodność z używanym sprzętem.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz kategorię bazową",
    },
    seo: {
      title: "Wyposażenie magazynu B2B | LogiMarket",
      description:
        "Porównaj kategorie wyposażenia magazynu B2B: regały, pojemniki, podesty i stanowiska pakowania. Wsparcie decyzji zakupowych dla logistyki i magazynowania.",
    },
  },
  {
    intent: "intralogistics",
    locale: "pl",
    slug: "intralogistyka",
    path: "/rozwiazania/intralogistyka",
    sectionLabel: "Rozwiązania",
    title: "Intralogistyka",
    eyebrow: "B2B purchase intent",
    intro:
      "Intralogistyka łączy transport wewnętrzny, składowanie, kompletację i organizację przepływu w obiekcie. Strona pomaga uporządkować zakup sprzętu oraz kategorii wspierających ruch materiałów.",
    procurementContextTitle: "Kontekst zakupowy",
    procurementContext: [
      "Decyzje intralogistyczne powinny wynikać z mapy przepływu materiałów i obciążeń w strefach pracy.",
      "Ważna jest zgodność wózków, regałów, pojemników i punktów odkładczych z rytmem przyjęć oraz wysyłek.",
      "Dobre porównanie kategorii zmniejsza ryzyko wąskich gardeł między magazynowaniem, kompletacją i transportem.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Ruch materiałów",
        description:
          "Sprawdź, które jednostki przemieszczają się najczęściej i jak sprzęt transportu wewnętrznego współpracuje ze strefami składowania.",
      },
      {
        title: "Punkty odkładcze",
        description:
          "Dobierz pojemniki, regały i stanowiska tak, aby ograniczyć tymczasowe składowanie w ciągach komunikacyjnych.",
      },
      {
        title: "Bezpieczeństwo procesu",
        description:
          "Uwzględnij widoczność, szerokość przejazdów, obciążenia robocze i separację ruchu pieszych od sprzętu transportowego.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Wózki i transport wewnętrzny",
        href: "/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Sprzęt dla ruchu materiałów między strefami obiektu.",
      },
      {
        label: "Regały i systemy składowania",
        href: "/katalog/c-regaly-i-systemy-skladowania",
        context: "Miejsca składowania dopasowane do transportu i rotacji towaru.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        href: "/katalog/c-pojemniki-plastikowe-euro",
        context: "Nośniki procesu dla komponentów, kompletacji i odkładania.",
      },
      {
        label: "Antresole i podesty magazynowe",
        href: "/katalog/c-antresole-i-podesty-magazynowe",
        context: "Dodatkowe poziomy pracy i składowania w przepływie wewnętrznym.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Kompletacja zamówień",
        href: "/slownik-branzowy/kompletacja-zamowien",
        context: "Proces, który często determinuje układ intralogistyki.",
      },
      {
        label: "Regał paletowy",
        href: "/slownik-branzowy/regal-paletowy",
        context: "Element systemu składowania powiązany z ruchem palet.",
      },
      {
        label: "Pojemnik Euro",
        href: "/slownik-branzowy/pojemnik-euro",
        context: "Standardowy nośnik materiałów w procesach wewnętrznych.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Co obejmuje intralogistyka w zakupach B2B?",
        answer:
          "Obejmuje sprzęt i organizację przepływu wewnątrz obiektu: transport, składowanie, odkładanie, kompletację i przygotowanie wysyłki.",
      },
      {
        question: "Jak porównać kategorie intralogistyczne?",
        answer:
          "Porównuj je przez wpływ na przepływ, bezpieczeństwo, zgodność z jednostkami ładunkowymi i ograniczenia hali.",
      },
      {
        question: "Czy intralogistyka dotyczy tylko wózków?",
        answer:
          "Nie. Wózki są jednym z elementów, ale równie ważne są regały, pojemniki, stanowiska oraz punkty odkładcze.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz kategorię bazową",
    },
    seo: {
      title: "Intralogistyka B2B | LogiMarket",
      description:
        "Strona zakupowa B2B dla intralogistyki: transport wewnętrzny, regały, pojemniki i organizacja przepływu materiałów w magazynie.",
    },
  },
  {
    intent: "picking-packing",
    locale: "pl",
    slug: "kompletacja-i-pakowanie",
    path: "/rozwiazania/kompletacja-i-pakowanie",
    sectionLabel: "Rozwiązania",
    title: "Kompletacja i pakowanie",
    eyebrow: "B2B purchase intent",
    intro:
      "Kompletacja i pakowanie to strefy, w których wyposażenie bezpośrednio wpływa na tempo realizacji zamówień, ergonomię pracy i jakość przygotowania wysyłki.",
    procurementContextTitle: "Kontekst zakupowy",
    procurementContext: [
      "Zakup wyposażenia powinien uwzględniać typ zamówień, liczbę pozycji, sposób odkładania i wymagania kontroli jakości.",
      "Pojemniki, stoły kompletacyjne i regały przepływowe powinny tworzyć spójny układ pracy operatora.",
      "W B2B ważne jest dopasowanie stanowisk do powtarzalnych operacji i sezonowych zmian wolumenu.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Układ stanowiska",
        description:
          "Rozmieść pojemniki, narzędzia i materiały tak, aby operator mógł wykonać zadanie bez zbędnych ruchów i przełożeń.",
      },
      {
        title: "Kontrola i identyfikacja",
        description:
          "Ustal, gdzie następuje weryfikacja pozycji, etykietowanie i przygotowanie dokumentów lub oznaczeń wysyłkowych.",
      },
      {
        title: "Elastyczność pracy",
        description:
          "Dobierz wyposażenie, które można dostosować do zmiany asortymentu, liczby linii zamówień i wymaganej dokładności.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Stoły pakowe i kompletacyjne",
        href: "/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Stanowiska robocze dla przygotowania zamówień i wysyłek.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        href: "/katalog/c-pojemniki-plastikowe-euro",
        context: "Nośniki dla komponentów, kompletacji i odkładania międzyoperacyjnego.",
      },
      {
        label: "Wózki i transport wewnętrzny",
        href: "/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Przemieszczanie pojemników i materiałów między strefami.",
      },
      {
        label: "Regały i systemy składowania",
        href: "/katalog/c-regaly-i-systemy-skladowania",
        context: "Organizacja zapasu blisko stanowisk kompletacji.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Kompletacja zamówień",
        href: "/slownik-branzowy/kompletacja-zamowien",
        context: "Definicja procesu kompletacji i jego roli w realizacji zamówień.",
      },
      {
        label: "Pojemnik Euro",
        href: "/slownik-branzowy/pojemnik-euro",
        context: "Nośnik wykorzystywany w kompletacji, odkładaniu i transporcie.",
      },
      {
        label: "Regał paletowy",
        href: "/slownik-branzowy/regal-paletowy",
        context: "Element zaplecza składowania dla stref kompletacyjnych.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Co jest kluczowe przy zakupie wyposażenia do kompletacji?",
        answer:
          "Najważniejsze są ergonomia stanowiska, organizacja odkładania, widoczność asortymentu i możliwość szybkiej kontroli zamówienia.",
      },
      {
        question: "Czy stoły pakowe powinny być dobierane oddzielnie?",
        answer:
          "Nie zawsze. Najlepszy efekt daje analiza całej strefy: stołów, pojemników, regałów i transportu międzyoperacyjnego.",
      },
      {
        question: "Jak przygotować zapytanie zakupowe?",
        answer:
          "Opisz typ produktów, liczbę pozycji w zamówieniu, wymaganą dokładność, sposób pakowania i ograniczenia przestrzenne stanowisk.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz kategorię bazową",
    },
    seo: {
      title: "Kompletacja i pakowanie B2B | LogiMarket",
      description:
        "Landing page B2B dla kompletacji i pakowania: stoły pakowe, pojemniki, transport wewnętrzny i kategorie wspierające realizację zamówień.",
    },
  },
  {
    intent: "warehouse-equipment",
    locale: "en",
    slug: "warehouse-equipment",
    path: "/en/solutions/warehouse-equipment",
    sectionLabel: "Solutions",
    title: "Warehouse equipment",
    eyebrow: "B2B purchase intent",
    intro:
      "Warehouse equipment decisions start with workflows, loads and operator tasks. This page structures procurement choices for racking, containers, workstations and warehouse infrastructure.",
    procurementContextTitle: "Procurement context",
    procurementContext: [
      "Equipment should support the actual material flow: receiving, storage, picking, packing and dispatch.",
      "B2B purchasing should account for facility layout, work safety, expansion options and compatibility with existing handling equipment.",
      "A reliable buying process compares categories, technical parameters and connected industry terminology.",
    ],
    decisionGuidanceTitle: "Decision guidance",
    decisionFactors: [
      {
        title: "Flow and ergonomics",
        description:
          "Identify which warehouse zones create the most movement and where equipment can reduce travel distance or repeated handling.",
      },
      {
        title: "Load capacity and compatibility",
        description:
          "Compare structure, dimensions, working loads and load-unit standards instead of evaluating isolated products.",
      },
      {
        title: "System scalability",
        description:
          "Consider how racking, workstations, containers and mezzanines can expand without redesigning the entire warehouse setup.",
      },
    ],
    relatedCategoriesTitle: "Related catalog categories",
    relatedCategories: [
      {
        label: "Racking and storage systems",
        href: "/en/katalog/c-regaly-i-systemy-skladowania",
        context: "Core storage infrastructure for pallets, containers and components.",
      },
      {
        label: "Euro plastic containers",
        href: "/en/katalog/c-pojemniki-plastikowe-euro",
        context: "Warehouse load units for picking, internal transport and temporary storage.",
      },
      {
        label: "Warehouse mezzanines and platforms",
        href: "/en/katalog/c-antresole-i-podesty-magazynowe",
        context: "Additional usable work or storage levels inside an existing facility.",
      },
      {
        label: "Packing and picking tables",
        href: "/en/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Workstations for picking, inspection and packing operations.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Pallet racking",
        href: "/en/logistics-glossary/regal-paletowy",
        context: "Definition of a storage system and its role in B2B warehouses.",
      },
      {
        label: "Euro container",
        href: "/en/logistics-glossary/pojemnik-euro",
        context: "Standard logistics container used in warehouse flows.",
      },
      {
        label: "Order picking",
        href: "/en/logistics-glossary/kompletacja-zamowien",
        context: "The process of collecting and preparing goods for orders.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "Where should warehouse equipment selection start?",
        answer:
          "Start with material flow, load units, building constraints and work zones. Compare equipment categories after those requirements are clear.",
      },
      {
        question: "Is one category enough to plan warehouse equipment?",
        answer:
          "Usually not. Racking, containers, workstations and platforms form one operating system and should be assessed together.",
      },
      {
        question: "How can buyers reduce procurement risk?",
        answer:
          "Use a process checklist covering loads, dimensions, ergonomics, safety, expansion options and compatibility with existing equipment.",
      },
    ],
    cta: {
      primaryLabel: "Open catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "Open core category",
    },
    seo: {
      title: "Warehouse equipment B2B | LogiMarket",
      description:
        "Compare B2B warehouse equipment categories: racking, Euro containers, mezzanines and packing workstations for logistics procurement.",
    },
  },
  {
    intent: "intralogistics",
    locale: "en",
    slug: "intralogistics",
    path: "/en/solutions/intralogistics",
    sectionLabel: "Solutions",
    title: "Intralogistics",
    eyebrow: "B2B purchase intent",
    intro:
      "Intralogistics connects internal transport, storage, picking and material flow inside a facility. This page helps buyers structure equipment and category decisions around flow performance.",
    procurementContextTitle: "Procurement context",
    procurementContext: [
      "Intralogistics decisions should follow a map of material movements and load intensity across work zones.",
      "Handling equipment, racking, containers and buffer points need to match receiving and dispatch rhythms.",
      "Comparing related categories helps avoid bottlenecks between storage, picking and internal transport.",
    ],
    decisionGuidanceTitle: "Decision guidance",
    decisionFactors: [
      {
        title: "Material movement",
        description:
          "Check which units move most often and how internal transport equipment works with storage and picking zones.",
      },
      {
        title: "Buffer points",
        description:
          "Use containers, racking and workstations to avoid uncontrolled temporary storage in traffic routes.",
      },
      {
        title: "Process safety",
        description:
          "Include visibility, aisle width, working loads and separation between pedestrian and transport routes.",
      },
    ],
    relatedCategoriesTitle: "Related catalog categories",
    relatedCategories: [
      {
        label: "Internal transport and handling",
        href: "/en/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Equipment for moving materials between facility zones.",
      },
      {
        label: "Racking and storage systems",
        href: "/en/katalog/c-regaly-i-systemy-skladowania",
        context: "Storage locations matched to movement patterns and goods rotation.",
      },
      {
        label: "Euro plastic containers",
        href: "/en/katalog/c-pojemniki-plastikowe-euro",
        context: "Process carriers for components, picking and temporary storage.",
      },
      {
        label: "Warehouse mezzanines and platforms",
        href: "/en/katalog/c-antresole-i-podesty-magazynowe",
        context: "Additional work and storage levels for internal flows.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Order picking",
        href: "/en/logistics-glossary/kompletacja-zamowien",
        context: "A process that often defines intralogistics layout.",
      },
      {
        label: "Pallet racking",
        href: "/en/logistics-glossary/regal-paletowy",
        context: "Storage infrastructure connected to pallet movement.",
      },
      {
        label: "Euro container",
        href: "/en/logistics-glossary/pojemnik-euro",
        context: "A standard carrier for internal material flows.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "What does intralogistics cover in B2B purchasing?",
        answer:
          "It covers equipment and organization of internal flow: transport, storage, buffering, picking and preparation for dispatch.",
      },
      {
        question: "How should intralogistics categories be compared?",
        answer:
          "Compare their effect on flow, safety, load-unit compatibility and building constraints.",
      },
      {
        question: "Is intralogistics only about handling equipment?",
        answer:
          "No. Handling equipment matters, but racking, containers, workstations and buffer locations are equally important.",
      },
    ],
    cta: {
      primaryLabel: "Open catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "Open core category",
    },
    seo: {
      title: "Intralogistics B2B | LogiMarket",
      description:
        "B2B procurement page for intralogistics: internal transport, racking, containers and material-flow organization in warehouse operations.",
    },
  },
  {
    intent: "picking-packing",
    locale: "en",
    slug: "picking-and-packing",
    path: "/en/solutions/picking-and-packing",
    sectionLabel: "Solutions",
    title: "Picking and packing",
    eyebrow: "B2B purchase intent",
    intro:
      "Picking and packing zones directly affect order throughput, operator ergonomics and dispatch quality. This page structures equipment decisions for repeatable warehouse workstations.",
    procurementContextTitle: "Procurement context",
    procurementContext: [
      "Equipment selection should account for order profiles, line counts, buffering method and quality-control requirements.",
      "Containers, picking tables and nearby storage should form a coherent operator workflow.",
      "B2B buyers should match workstations to repeatable tasks and seasonal volume changes.",
    ],
    decisionGuidanceTitle: "Decision guidance",
    decisionFactors: [
      {
        title: "Workstation layout",
        description:
          "Place containers, tools and materials so operators can complete tasks with fewer unnecessary movements and transfers.",
      },
      {
        title: "Checking and identification",
        description:
          "Define where item verification, labeling and dispatch documentation or markings are handled.",
      },
      {
        title: "Operational flexibility",
        description:
          "Choose equipment that can adapt to changing assortment, order-line count and required accuracy.",
      },
    ],
    relatedCategoriesTitle: "Related catalog categories",
    relatedCategories: [
      {
        label: "Packing and picking tables",
        href: "/en/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Workstations for preparing orders and dispatch units.",
      },
      {
        label: "Euro plastic containers",
        href: "/en/katalog/c-pojemniki-plastikowe-euro",
        context: "Carriers for components, picking and intermediate buffering.",
      },
      {
        label: "Internal transport and handling",
        href: "/en/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Movement of containers and materials between zones.",
      },
      {
        label: "Racking and storage systems",
        href: "/en/katalog/c-regaly-i-systemy-skladowania",
        context: "Stock organization close to picking and packing work.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Order picking",
        href: "/en/logistics-glossary/kompletacja-zamowien",
        context: "Definition of the picking process and its B2B role.",
      },
      {
        label: "Euro container",
        href: "/en/logistics-glossary/pojemnik-euro",
        context: "Carrier used in picking, buffering and internal transport.",
      },
      {
        label: "Pallet racking",
        href: "/en/logistics-glossary/regal-paletowy",
        context: "Storage support for picking-zone replenishment.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "What matters most when buying equipment for picking?",
        answer:
          "Workstation ergonomics, buffering method, assortment visibility and fast order checking are the main decision factors.",
      },
      {
        question: "Should packing tables be selected separately?",
        answer:
          "Not always. The strongest results come from assessing tables, containers, racking and internal transport as one zone.",
      },
      {
        question: "How should a purchase inquiry be prepared?",
        answer:
          "Describe product types, order-line count, required accuracy, packing method and workstation space constraints.",
      },
    ],
    cta: {
      primaryLabel: "Open catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "Open core category",
    },
    seo: {
      title: "Picking and packing B2B | LogiMarket",
      description:
        "B2B landing page for picking and packing: workstations, Euro containers, internal transport and categories supporting order fulfillment.",
    },
  },
  {
    intent: "warehouse-equipment",
    locale: "de",
    slug: "lagerausstattung",
    path: "/de/loesungen/lagerausstattung",
    sectionLabel: "Lösungen",
    title: "Lagerausstattung",
    eyebrow: "B2B purchase intent",
    intro:
      "Die Auswahl von Lagerausstattung beginnt mit Prozessen, Lasten und Arbeitsabläufen. Diese Seite strukturiert Einkaufsentscheidungen für Regale, Behälter, Arbeitsplätze und Lagerinfrastruktur.",
    procurementContextTitle: "Einkaufskontext",
    procurementContext: [
      "Ausstattung sollte den tatsächlichen Materialfluss unterstützen: Wareneingang, Lagerung, Kommissionierung, Verpackung und Versand.",
      "Im B2B-Einkauf zählen Hallenlayout, Arbeitssicherheit, Erweiterbarkeit und Kompatibilität mit bestehender Technik.",
      "Ein belastbarer Vergleich verbindet Kategorien, technische Parameter und relevante Fachbegriffe.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Materialfluss und Ergonomie",
        description:
          "Ermitteln Sie, welche Lagerzonen die meiste Bewegung erzeugen und wo Ausstattung Wege oder Umladevorgänge reduzieren kann.",
      },
      {
        title: "Tragfähigkeit und Kompatibilität",
        description:
          "Vergleichen Sie Konstruktion, Abmessungen, Arbeitslasten und Ladeeinheiten statt einzelne Produkte isoliert zu bewerten.",
      },
      {
        title: "Skalierbarkeit des Systems",
        description:
          "Berücksichtigen Sie, wie Regale, Arbeitsplätze, Behälter und Bühnen ohne kompletten Umbau erweitert werden können.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Regale und Lagersysteme",
        href: "/de/katalog/c-regaly-i-systemy-skladowania",
        context: "Zentrale Lagerinfrastruktur für Paletten, Behälter und Komponenten.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        href: "/de/katalog/c-pojemniki-plastikowe-euro",
        context: "Ladungsträger für Kommissionierung, innerbetrieblichen Transport und Zwischenlagerung.",
      },
      {
        label: "Lagerbühnen und Podeste",
        href: "/de/katalog/c-antresole-i-podesty-magazynowe",
        context: "Zusätzliche Nutzflächen im bestehenden Lagergebäude.",
      },
      {
        label: "Pack- und Kommissioniertische",
        href: "/de/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Arbeitsplätze für Kommissionierung, Kontrolle und Verpackung.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Palettenregal",
        href: "/de/logistik-lexikon/regal-paletowy",
        context: "Definition eines Lagersystems und seiner Rolle im B2B-Lager.",
      },
      {
        label: "Eurobehälter",
        href: "/de/logistik-lexikon/pojemnik-euro",
        context: "Standardisierter Logistikbehälter für Lagerprozesse.",
      },
      {
        label: "Kommissionierung",
        href: "/de/logistik-lexikon/kompletacja-zamowien",
        context: "Prozess der Entnahme und Vorbereitung von Waren für Aufträge.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Womit beginnt die Auswahl von Lagerausstattung?",
        answer:
          "Beginnen Sie mit Materialfluss, Ladeeinheiten, Gebäudebeschränkungen und Arbeitszonen. Danach lassen sich Kategorien sinnvoll vergleichen.",
      },
      {
        question: "Reicht eine Kategorie für die Lagerplanung aus?",
        answer:
          "Meist nicht. Regale, Behälter, Arbeitsplätze und Bühnen bilden ein gemeinsames Betriebssystem.",
      },
      {
        question: "Wie lässt sich Einkaufsrisiko reduzieren?",
        answer:
          "Nutzen Sie eine Prozess-Checkliste zu Lasten, Abmessungen, Ergonomie, Sicherheit, Erweiterbarkeit und Kompatibilität.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Basiskategorie öffnen",
    },
    seo: {
      title: "Lagerausstattung B2B | LogiMarket",
      description:
        "Vergleichen Sie B2B-Kategorien für Lagerausstattung: Regale, Eurobehälter, Lagerbühnen und Packarbeitsplätze für Logistik-Einkauf.",
    },
  },
  {
    intent: "intralogistics",
    locale: "de",
    slug: "intralogistik",
    path: "/de/loesungen/intralogistik",
    sectionLabel: "Lösungen",
    title: "Intralogistik",
    eyebrow: "B2B purchase intent",
    intro:
      "Intralogistik verbindet innerbetrieblichen Transport, Lagerung, Kommissionierung und Materialfluss im Gebäude. Diese Seite strukturiert Einkaufsentscheidungen rund um den internen Fluss.",
    procurementContextTitle: "Einkaufskontext",
    procurementContext: [
      "Intralogistische Entscheidungen sollten aus einer Karte der Materialbewegungen und Belastungen je Arbeitszone entstehen.",
      "Transporttechnik, Regale, Behälter und Pufferpunkte müssen zu Wareneingang und Versand passen.",
      "Der Vergleich verwandter Kategorien hilft, Engpässe zwischen Lagerung, Kommissionierung und internem Transport zu vermeiden.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Materialbewegung",
        description:
          "Prüfen Sie, welche Einheiten sich am häufigsten bewegen und wie Transporttechnik mit Lager- und Kommissionierzonen zusammenarbeitet.",
      },
      {
        title: "Pufferpunkte",
        description:
          "Nutzen Sie Behälter, Regale und Arbeitsplätze, um ungeplante Zwischenlagerung in Verkehrswegen zu vermeiden.",
      },
      {
        title: "Prozesssicherheit",
        description:
          "Berücksichtigen Sie Sichtverhältnisse, Gangbreiten, Arbeitslasten und Trennung von Fußwegen und Transportwegen.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Innerbetrieblicher Transport",
        href: "/de/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Technik für Materialbewegungen zwischen Zonen.",
      },
      {
        label: "Regale und Lagersysteme",
        href: "/de/katalog/c-regaly-i-systemy-skladowania",
        context: "Lagerplätze passend zu Transportmustern und Umschlag.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        href: "/de/katalog/c-pojemniki-plastikowe-euro",
        context: "Prozessträger für Komponenten, Kommissionierung und Zwischenlagerung.",
      },
      {
        label: "Lagerbühnen und Podeste",
        href: "/de/katalog/c-antresole-i-podesty-magazynowe",
        context: "Zusätzliche Arbeits- und Lagerflächen für interne Flüsse.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Kommissionierung",
        href: "/de/logistik-lexikon/kompletacja-zamowien",
        context: "Ein Prozess, der häufig das Intralogistik-Layout bestimmt.",
      },
      {
        label: "Palettenregal",
        href: "/de/logistik-lexikon/regal-paletowy",
        context: "Lagerinfrastruktur im Zusammenhang mit Palettenbewegungen.",
      },
      {
        label: "Eurobehälter",
        href: "/de/logistik-lexikon/pojemnik-euro",
        context: "Standardträger für interne Materialflüsse.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Was umfasst Intralogistik im B2B-Einkauf?",
        answer:
          "Sie umfasst Technik und Organisation des internen Flusses: Transport, Lagerung, Pufferung, Kommissionierung und Versandvorbereitung.",
      },
      {
        question: "Wie sollten Intralogistik-Kategorien verglichen werden?",
        answer:
          "Vergleichen Sie den Einfluss auf Materialfluss, Sicherheit, Ladeeinheiten und Gebäudebeschränkungen.",
      },
      {
        question: "Geht es bei Intralogistik nur um Transporttechnik?",
        answer:
          "Nein. Transporttechnik ist wichtig, aber Regale, Behälter, Arbeitsplätze und Pufferpunkte sind ebenso relevant.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Basiskategorie öffnen",
    },
    seo: {
      title: "Intralogistik B2B | LogiMarket",
      description:
        "B2B-Einkaufsseite für Intralogistik: innerbetrieblicher Transport, Regale, Behälter und Materialfluss im Lagerbetrieb.",
    },
  },
  {
    intent: "picking-packing",
    locale: "de",
    slug: "kommissionierung-und-verpackung",
    path: "/de/loesungen/kommissionierung-und-verpackung",
    sectionLabel: "Lösungen",
    title: "Kommissionierung und Verpackung",
    eyebrow: "B2B purchase intent",
    intro:
      "Kommissionier- und Verpackungszonen beeinflussen Durchsatz, Ergonomie und Versandqualität direkt. Diese Seite ordnet Ausstattungsentscheidungen für wiederholbare Lagerarbeitsplätze.",
    procurementContextTitle: "Einkaufskontext",
    procurementContext: [
      "Die Auswahl sollte Auftragsprofile, Positionszahlen, Pufferung und Anforderungen an Qualitätskontrolle berücksichtigen.",
      "Behälter, Kommissioniertische und nahe Lagerplätze sollten einen zusammenhängenden Arbeitsablauf bilden.",
      "Im B2B-Einkauf zählt die Anpassung von Arbeitsplätzen an wiederholbare Aufgaben und saisonale Volumenschwankungen.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Arbeitsplatzlayout",
        description:
          "Ordnen Sie Behälter, Werkzeuge und Materialien so an, dass unnötige Bewegungen und Übergaben reduziert werden.",
      },
      {
        title: "Kontrolle und Identifikation",
        description:
          "Legen Sie fest, wo Artikelprüfung, Kennzeichnung und Versanddokumente oder Markierungen bearbeitet werden.",
      },
      {
        title: "Operative Flexibilität",
        description:
          "Wählen Sie Ausstattung, die sich an Sortiment, Auftragspositionen und Genauigkeitsanforderungen anpassen lässt.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Pack- und Kommissioniertische",
        href: "/de/katalog/c-stoly-pakowe-i-kompletacyjne",
        context: "Arbeitsplätze für Vorbereitung von Aufträgen und Versand.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        href: "/de/katalog/c-pojemniki-plastikowe-euro",
        context: "Träger für Komponenten, Kommissionierung und Zwischenpuffer.",
      },
      {
        label: "Innerbetrieblicher Transport",
        href: "/de/katalog/c-wozki-i-transport-wewnetrzny",
        context: "Bewegung von Behältern und Materialien zwischen Zonen.",
      },
      {
        label: "Regale und Lagersysteme",
        href: "/de/katalog/c-regaly-i-systemy-skladowania",
        context: "Organisation des Bestands nahe der Kommissionierzone.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Kommissionierung",
        href: "/de/logistik-lexikon/kompletacja-zamowien",
        context: "Definition des Kommissionierprozesses und seiner B2B-Rolle.",
      },
      {
        label: "Eurobehälter",
        href: "/de/logistik-lexikon/pojemnik-euro",
        context: "Träger für Kommissionierung, Pufferung und internen Transport.",
      },
      {
        label: "Palettenregal",
        href: "/de/logistik-lexikon/regal-paletowy",
        context: "Lagerunterstützung für Nachschub in Kommissionierzonen.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Was ist beim Kauf von Kommissionierausstattung entscheidend?",
        answer:
          "Ergonomie, Pufferung, Sichtbarkeit des Sortiments und schnelle Auftragskontrolle sind zentrale Entscheidungskriterien.",
      },
      {
        question: "Sollten Packtische separat ausgewählt werden?",
        answer:
          "Nicht immer. Bessere Ergebnisse entstehen, wenn Tische, Behälter, Regale und interner Transport als gemeinsame Zone bewertet werden.",
      },
      {
        question: "Wie sollte eine Einkaufsanfrage vorbereitet werden?",
        answer:
          "Beschreiben Sie Produkttypen, Anzahl der Auftragspositionen, Genauigkeitsanforderungen, Verpackungsmethode und Platzgrenzen.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Basiskategorie öffnen",
    },
    seo: {
      title: "Kommissionierung und Verpackung B2B | LogiMarket",
      description:
        "B2B-Landingpage für Kommissionierung und Verpackung: Arbeitsplätze, Eurobehälter, interner Transport und passende Katalogkategorien.",
    },
  },
] satisfies LandingPageContent[];
