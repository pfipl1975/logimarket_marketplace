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
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Podstawowa infrastruktura składowania dla palet, pojemników i komponentów.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Jednostki magazynowe dla kompletacji, transportu wewnętrznego i odkładania części.",
      },
      {
        label: "Antresole i podesty magazynowe",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Rozbudowa powierzchni użytkowej bez zmiany lokalizacji magazynu.",
      },
      {
        label: "Stoły pakowe i kompletacyjne",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Stanowiska dla operacji kompletacji, kontroli i pakowania.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Regał paletowy",
        glossarySlug: "regal-paletowy",
        context: "Definicja systemu składowania i jego roli w magazynie B2B.",
      },
      {
        label: "Pojemnik Euro",
        glossarySlug: "pojemnik-euro",
        context: "Standardowy pojemnik logistyczny używany w przepływach magazynowych.",
      },
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
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
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Sprzęt dla ruchu materiałów między strefami obiektu.",
      },
      {
        label: "Regały i systemy składowania",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Miejsca składowania dopasowane do transportu i rotacji towaru.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Nośniki procesu dla komponentów, kompletacji i odkładania.",
      },
      {
        label: "Antresole i podesty magazynowe",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Dodatkowe poziomy pracy i składowania w przepływie wewnętrznym.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
        context: "Proces, który często determinuje układ intralogistyki.",
      },
      {
        label: "Regał paletowy",
        glossarySlug: "regal-paletowy",
        context: "Element systemu składowania powiązany z ruchem palet.",
      },
      {
        label: "Pojemnik Euro",
        glossarySlug: "pojemnik-euro",
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
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Stanowiska robocze dla przygotowania zamówień i wysyłek.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Nośniki dla komponentów, kompletacji i odkładania międzyoperacyjnego.",
      },
      {
        label: "Wózki i transport wewnętrzny",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Przemieszczanie pojemników i materiałów między strefami.",
      },
      {
        label: "Regały i systemy składowania",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Organizacja zapasu blisko stanowisk kompletacji.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
        context: "Definicja procesu kompletacji i jego roli w realizacji zamówień.",
      },
      {
        label: "Pojemnik Euro",
        glossarySlug: "pojemnik-euro",
        context: "Nośnik wykorzystywany w kompletacji, odkładaniu i transporcie.",
      },
      {
        label: "Regał paletowy",
        glossarySlug: "regal-paletowy",
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
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Core storage infrastructure for pallets, containers and components.",
      },
      {
        label: "Euro plastic containers",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Warehouse load units for picking, internal transport and temporary storage.",
      },
      {
        label: "Warehouse mezzanines and platforms",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Additional usable work or storage levels inside an existing facility.",
      },
      {
        label: "Packing and picking tables",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Workstations for picking, inspection and packing operations.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Pallet racking",
        glossarySlug: "regal-paletowy",
        context: "Definition of a storage system and its role in B2B warehouses.",
      },
      {
        label: "Euro container",
        glossarySlug: "pojemnik-euro",
        context: "Standard logistics container used in warehouse flows.",
      },
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
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
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Equipment for moving materials between facility zones.",
      },
      {
        label: "Racking and storage systems",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Storage locations matched to movement patterns and goods rotation.",
      },
      {
        label: "Euro plastic containers",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Process carriers for components, picking and temporary storage.",
      },
      {
        label: "Warehouse mezzanines and platforms",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Additional work and storage levels for internal flows.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
        context: "A process that often defines intralogistics layout.",
      },
      {
        label: "Pallet racking",
        glossarySlug: "regal-paletowy",
        context: "Storage infrastructure connected to pallet movement.",
      },
      {
        label: "Euro container",
        glossarySlug: "pojemnik-euro",
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
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Workstations for preparing orders and dispatch units.",
      },
      {
        label: "Euro plastic containers",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Carriers for components, picking and intermediate buffering.",
      },
      {
        label: "Internal transport and handling",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Movement of containers and materials between zones.",
      },
      {
        label: "Racking and storage systems",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Stock organization close to picking and packing work.",
      },
    ],
    relatedGlossaryTitle: "Related glossary terms",
    relatedGlossaryTerms: [
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
        context: "Definition of the picking process and its B2B role.",
      },
      {
        label: "Euro container",
        glossarySlug: "pojemnik-euro",
        context: "Carrier used in picking, buffering and internal transport.",
      },
      {
        label: "Pallet racking",
        glossarySlug: "regal-paletowy",
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
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Zentrale Lagerinfrastruktur für Paletten, Behälter und Komponenten.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Ladungsträger für Kommissionierung, innerbetrieblichen Transport und Zwischenlagerung.",
      },
      {
        label: "Lagerbühnen und Podeste",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Zusätzliche Nutzflächen im bestehenden Lagergebäude.",
      },
      {
        label: "Pack- und Kommissioniertische",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Arbeitsplätze für Kommissionierung, Kontrolle und Verpackung.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Palettenregal",
        glossarySlug: "regal-paletowy",
        context: "Definition eines Lagersystems und seiner Rolle im B2B-Lager.",
      },
      {
        label: "Eurobehälter",
        glossarySlug: "pojemnik-euro",
        context: "Standardisierter Logistikbehälter für Lagerprozesse.",
      },
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
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
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Technik für Materialbewegungen zwischen Zonen.",
      },
      {
        label: "Regale und Lagersysteme",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Lagerplätze passend zu Transportmustern und Umschlag.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Prozessträger für Komponenten, Kommissionierung und Zwischenlagerung.",
      },
      {
        label: "Lagerbühnen und Podeste",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Zusätzliche Arbeits- und Lagerflächen für interne Flüsse.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
        context: "Ein Prozess, der häufig das Intralogistik-Layout bestimmt.",
      },
      {
        label: "Palettenregal",
        glossarySlug: "regal-paletowy",
        context: "Lagerinfrastruktur im Zusammenhang mit Palettenbewegungen.",
      },
      {
        label: "Eurobehälter",
        glossarySlug: "pojemnik-euro",
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
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Arbeitsplätze für Vorbereitung von Aufträgen und Versand.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Träger für Komponenten, Kommissionierung und Zwischenpuffer.",
      },
      {
        label: "Innerbetrieblicher Transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Bewegung von Behältern und Materialien zwischen Zonen.",
      },
      {
        label: "Regale und Lagersysteme",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Organisation des Bestands nahe der Kommissionierzone.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
        context: "Definition des Kommissionierprozesses und seiner B2B-Rolle.",
      },
      {
        label: "Eurobehälter",
        glossarySlug: "pojemnik-euro",
        context: "Träger für Kommissionierung, Pufferung und internen Transport.",
      },
      {
        label: "Palettenregal",
        glossarySlug: "regal-paletowy",
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
  {
    intent: "ecommerce-warehouse",
    locale: "pl",
    slug: "magazyn-e-commerce",
    path: "/rozwiazania/magazyn-e-commerce",
    sectionLabel: "Rozwiązania",
    title: "Magazyn e-commerce",
    eyebrow: "B2B purchase intent",
    intro:
      "Logistyka e-commerce wymaga dużej elastyczności, szybkości kompletacji oraz sprawnej obsługi zwrotów. Ta strona wspiera decyzje zakupowe w zakresie regałów półkowych, wózków kompletacyjnych, stanowisk pakowania i pojemników plastikowych.",
    procurementContextTitle: "Kontekst zakupowy B2B",
    procurementContext: [
      "Wysoka rotacja towarów oraz duża zmienność zamówień wymuszają dynamiczną adaptację przestrzeni składowej.",
      "Zakupy wyposażenia powinny skupiać się na skalowalności i modułowości – systemy regałowe i stoły pakowe muszą rosnąć wraz z wolumenem paczek.",
      "Kluczowym kryterium jest integracja procesów: składowanie drobnych towarów, kompletacja wielopozycyjna oraz ergonomiczne pakowanie.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Szybkość picking-u",
        description:
          "Oceń ergonomię sięgania po towary. Półkowe regały o wysokim stopniu regulacji i przejrzyste kuwety Euro skracają czas kompletacji.",
      },
      {
        title: "Stanowisko pakowania",
        description:
          "Wybieraj stoły pakowe z regulacją wysokości i nadstawkami na materiały eksploatacyjne, co ogranicza zmęczenie operatora.",
      },
      {
        title: "Rotacja i nośność",
        description:
          "Dostosuj obciążenie regałów do lżejszych, lecz liczniejszych partii asortymentu charakterystycznych dla handlu online.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Stoły pakowe i kompletacyjne",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Ergonomiczne stanowiska pakowe przyspieszające przygotowanie przesyłek do kuriera.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Podstawowe nośniki drobnego asortymentu w strefach kompletacji i transportu.",
      },
      {
        label: "Wózki i transport wewnętrzny",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Środki transportu ułatwiające zbiórkę wielu zamówień jednocześnie.",
      },
      {
        label: "Regały i systemy składowania",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Konstrukcje półkowe idealne do składowania produktów drobnicowych.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
        context: "Główny proces logistyczny decydujący o wydajności wysyłek e-commerce.",
      },
      {
        label: "Pojemnik Euro",
        glossarySlug: "pojemnik-euro",
        context: "Znormalizowana jednostka składowania kompatybilna z regałami i przenośnikami.",
      },
      {
        label: "Transport wewnętrzny",
        glossarySlug: "transport-wewnetrzny",
        context: "Ruch materiałów w strefach składowania i pakowania w centrum logistycznym.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Jak dobrać regały do magazynu e-commerce?",
        answer:
          "Wybierz regały półkowe o łatwej regulacji poziomów, dostosowane do wymiarów najczęściej używanych pojemników Euro.",
      },
      {
        question: "Dlaczego ergonomia stołów pakowych jest ważna?",
        answer:
          "Praca stojąca przy pakowaniu generuje obciążenie. Regulacja wysokości i łatwy dostęp do kartonów zwiększają wydajność.",
      },
      {
        question: "Czy pojemniki Euro są niezbędne?",
        answer:
          "Zapewniają standaryzację – pasują do regałów, wózków i automatycznych przenośników, zapobiegając uszkodzeniom towaru.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz rozwiązania",
    },
    seo: {
      title: "Wyposażenie magazynu e-commerce B2B | LogiMarket",
      description:
        "Dobór wyposażenia do magazynów e-commerce: ergonomiczne stoły pakowe, wózki kompletacyjne, pojemniki Euro i regały półkowe dla logistyki B2B.",
    },
  },
  {
    intent: "ecommerce-warehouse",
    locale: "en",
    slug: "ecommerce-warehouse",
    path: "/en/solutions/ecommerce-warehouse",
    sectionLabel: "Solutions",
    title: "E-commerce warehouse",
    eyebrow: "B2B purchase intent",
    intro:
      "E-commerce logistics requires high flexibility, fast order picking, and efficient returns management. This page coordinates purchasing decisions for shelving systems, picking carts, packing stations, and plastic bins.",
    procurementContextTitle: "B2B Procurement Context",
    procurementContext: [
      "High inventory turnover and small, multi-item orders demand dynamic layout configuration.",
      "Equipment procurement must focus on scalability – packing tables and shelving units must adapt to seasonal volume peaks.",
      "Optimal flow integration connects small parts storage, multi-order picking, and ergonomic pack-out zones.",
    ],
    decisionGuidanceTitle: "Decision Guidance",
    decisionFactors: [
      {
        title: "Picking speed",
        description:
          "Evaluate picker ergonomics. Highly adjustable shelving and clear Euro containers minimize pick times.",
      },
      {
        title: "Packing station",
        description:
          "Select packing tables with adjustable heights and built-in supply storage to reduce worker fatigue.",
      },
      {
        title: "Flexibility and capacity",
        description:
          "Match rack capacities to light, high-density item configurations typical in online retail logistics.",
      },
    ],
    relatedCategoriesTitle: "Related Catalog Categories",
    relatedCategories: [
      {
        label: "Packing and picking tables",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Ergonomic stations accelerating order consolidation and dispatch.",
      },
      {
        label: "Plastic Euro containers",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Standard carriers for picking, buffering, and organizing loose items.",
      },
      {
        label: "Carts and internal transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Handling equipment facilitating multi-batch order collection.",
      },
      {
        label: "Racking and storage systems",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Shelving structures ideal for high-density small parts storage.",
      },
    ],
    relatedGlossaryTitle: "Related Glossary Terms",
    relatedGlossaryTerms: [
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
        context: "Primary warehouse process directly affecting order cycle times.",
      },
      {
        label: "Euro container",
        glossarySlug: "pojemnik-euro",
        context: "Standardized storage bin compatible with shelving and conveyors.",
      },
      {
        label: "Internal transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Material flow logic within storage and packing zones.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "How do I choose shelving for an e-commerce facility?",
        answer:
          "Select boltless shelving with easily adjustable shelf levels configured to standard Euro container dimensions.",
      },
      {
        question: "Why is packing table ergonomics critical?",
        answer:
          "Repetitive packing actions cause strain. Height-adjustable tables with organizers improve packing throughput.",
      },
      {
        question: "Are Euro bins necessary for e-commerce picking?",
        answer:
          "Standardized bins ensure compatibility across storage shelving, picking carts, and automated conveyor loops.",
      },
    ],
    cta: {
      primaryLabel: "Go to catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "View solutions",
    },
    seo: {
      title: "E-commerce Warehouse Equipment B2B | LogiMarket",
      description:
        "Procurement guide for e-commerce warehouse setup: packing tables, picking carts, Euro containers, and adjustable shelving for B2B buyers.",
    },
  },
  {
    intent: "ecommerce-warehouse",
    locale: "de",
    slug: "e-commerce-lager",
    path: "/de/loesungen/e-commerce-lager",
    sectionLabel: "Lösungen",
    title: "E-Commerce-Lager",
    eyebrow: "B2B purchase intent",
    intro:
      "E-Commerce-Logistik erfordert hohe Flexibilität, schnelle Kommissionierung und effiziente Retourenabwicklung. Diese Seite strukturiert Kaufentscheidungen für Fachbodenregale, Kommissionierwagen, Packtische und Kunststoffbehälter.",
    procurementContextTitle: "B2B-Einkaufskontext",
    procurementContext: [
      "Hoher Warenumschlag und kleinteilige Bestellungen verlangen eine dynamische Raumnutzung.",
      "Die Beschaffung sollte auf Skalierbarkeit ausgerichtet sein – Packtische und Regale müssen mit saisonalen Volumenpeaks mitwachsen.",
      "Ein optimaler Prozess verbindet Kleinteilelagerung, Mehrbehälter-Kommissionierung und ergonomische Verpackungsplätze.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Zugriffsgeschwindigkeit",
        description:
          "Achten Sie auf ergonomischen Griffbereich. Verstellbare Fachböden und transparente Euroboxen verkürzen Kommissionierzeiten.",
      },
      {
        title: "Ergonomie",
        description:
          "Wählen Sie Packtische mit Höhenverstellung und Ablagen für Verpackungsmaterialien, um Ermüdung zu reduzieren.",
      },
      {
        title: "Strukturelle Kapazität",
        description:
          "Passen Sie Regalträger an leichte, hochdichte Produktkonfigurationen des Onlinehandels an.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Pack- und Kommissioniertische",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Ergonomische Packplätze zur Beschleunigung von Verpackung und Versand.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Standardträger für Kommissionierung, Pufferung und Kleinteilelagerung.",
      },
      {
        label: "Innerbetrieblicher Transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Transportmittel zur effizienten Sammelkommissionierung.",
      },
      {
        label: "Regale und Lagersysteme",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Fachbodenkonstruktionen ideal für die e-commerce Kleinteilelagerung.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
        context: "Zentraler Lagerprozess mit direktem Einfluss auf Durchlaufzeiten.",
      },
      {
        label: "Eurobehälter",
        glossarySlug: "pojemnik-euro",
        context: "Standardisierte Transporteinheit kompatibel mit Fachbodenregalen.",
      },
      {
        label: "Innerbetrieblicher Transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Materialflusslogistik innerhalb der e-commerce Logistikbereiche.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Wie wähle ich Regale für ein e-commerce Lager aus?",
        answer:
          "Bevorzugen Sie schraublose Fachbodenregale mit flexibler Ebenenverstellung passend zu Ihren Eurobehälter-Dimensionen.",
      },
      {
        question: "Warum ist die Ergonomie von Packtischen so wichtig?",
        answer:
          "Wiederholtes Verpacken belastet den Körper. Höhenverstellbare Tische mit Zubehörhaltern steigern die Verpackungsleistung.",
      },
      {
        question: "Sind Euroboxen für die Kommissionierung zwingend erforderlich?",
        answer:
          "Sie bieten Standardisierung – sie passen exakt auf Regalböden, Wagen und Bänder, was Warenschäden vorbeugt.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Lösungen anzeigen",
    },
    seo: {
      title: "E-Commerce-Lagerausstattung B2B | LogiMarket",
      description:
        "B2B-Leitfaden für e-commerce Logistik: Packtische, Kommissionierwagen, Eurobehälter und Fachbodenregale für industrielle Einkäufer.",
    },
  },
  {
    intent: "distribution-center",
    locale: "pl",
    slug: "centrum-dystrybucyjne",
    path: "/rozwiazania/centrum-dystrybucyjne",
    sectionLabel: "Rozwiązania",
    title: "Centrum dystrybucyjne",
    eyebrow: "B2B purchase intent",
    intro:
      "Centra dystrybucyjne opierają się na masowym przepływie palet, buforowaniu zapasów oraz wydajnej konsolidacji ładunków. Ta strona ułatwia dobór regałów wysokiego składowania, wózków widłowych, podestów magazynowych oraz systemów oznakowania stref.",
    procurementContextTitle: "Kontekst zakupowy B2B",
    procurementContext: [
      "Decyzje w centrum dystrybucyjnym determinowane są przez wysoki przepływ jednostek paletowych (palety Euro, palety przemysłowe).",
      "Konieczne jest zachowanie równowagi pomiędzy strefą składowania a strefą szybkiej kompletacji i buforowania.",
      "Zakupy wyposażenia magazynowego muszą spełniać najwyższe standardy nośności i bezpieczeństwa mechanicznego.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Wykorzystanie wysokości",
        description:
          "Zmaksymalizuj przestrzeń pionową. Regały paletowe rzędowe lub systemy podestów magazynowych pozwalają podwoić pojemność składowania.",
      },
      {
        title: "Bezpieczeństwo pracy",
        description:
          "W strefach intensywnego ruchu wózków widłowych niezbędne są stalowe lub elastyczne osłony ram i słupów regałowych.",
      },
      {
        title: "Układ stref i oznakowanie",
        description:
          "Jasne rozgraniczenie stref za pomocą znaków pionowych i poziomych podnosi płynność procesów i ogranicza kolizje.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Regały i systemy składowania",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Regały paletowe i półkowe tworzące trzon infrastruktury centrum dystrybucyjnego.",
      },
      {
        label: "Antresole i podesty magazynowe",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Wielopoziomowe konstrukcje zwiększające powierzchnię użytkową hali.",
      },
      {
        label: "Wózki i transport wewnętrzny",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Wózki widłowe czołowe, reach trucki i wózki paletowe do obsługi ładunków.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Regał paletowy",
        glossarySlug: "regal-paletowy",
        context: "Pojęcie definiujące konstrukcje ramowe do masowego składowania towarów paletowych.",
      },
      {
        label: "Transport wewnętrzny",
        glossarySlug: "transport-wewnetrzny",
        context: "Ruch wózków, maszyn i operatorów w obrębie hali dystrybucyjnej.",
      },
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
        context: "Zbiórka towarów z poziomów zerowych regałów paletowych lub stref kompletacyjnych.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Jak dobrać system regałowy do centrum dystrybucyjnego?",
        answer:
          "Podstawą są regały paletowe rzędowe, które zapewniają bezpośredni dostęp do każdej palety. Uzupełnij je regałami wjezdnymi lub przepływowymi dla towarów szybkorotujących.",
      },
      {
        question: "Kiedy warto zainwestować w antresolę magazynową?",
        answer:
          "Gdy potrzebujesz dodatkowej powierzchni do kompletacji lub pakowania lekkich towarów bez rozbudowy samej hali.",
      },
      {
        question: "Jakie zabezpieczenia regałów są wymagane?",
        answer:
          "Zgodnie z normą PN-EN 15635 słupy narożne i narażone na uderzenia wózków widłowych muszą posiadać osłony o wysokości min. 400 mm.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz rozwiązania",
    },
    seo: {
      title: "Wyposażenie centrum dystrybucyjnego B2B | LogiMarket",
      description:
        "Wybór wyposażenia do centrów dystrybucyjnych: regały paletowe, antresole, wózki widłowe, zabezpieczenia i oznakowanie magazynu B2B.",
    },
  },
  {
    intent: "distribution-center",
    locale: "en",
    slug: "distribution-center",
    path: "/en/solutions/distribution-center",
    sectionLabel: "Solutions",
    title: "Distribution center",
    eyebrow: "B2B purchase intent",
    intro:
      "Distribution centers rely on high-volume pallet flow, inventory buffering, and efficient cargo consolidation. This page coordinates procurement for selective pallet racks, forklifts, warehouse mezzanines, and aisle marking systems.",
    procurementContextTitle: "B2B Procurement Context",
    procurementContext: [
      "Inbound and outbound flows are defined by high-volume pallet handling (Euro pallets, industrial pallets).",
      "Balancing reserve storage zones with active picking and sorting areas is key to warehouse efficiency.",
      "Procured equipment must meet maximum load capacities and rigid structural safety standards.",
    ],
    decisionGuidanceTitle: "Decision Guidance",
    decisionFactors: [
      {
        title: "Vertical storage",
        description:
          "Maximize vertical space utilization. Heavy-duty pallet racking and mezzanine platforms double effective footprint.",
      },
      {
        title: "Asset protection",
        description:
          "Implement structural column guards and barrier rails in high-traffic forklift transit lanes.",
      },
      {
        title: "Aisle layout",
        description:
          "Ensure clear separation of pedestrian and machinery paths with professional markings to maintain flow.",
      },
    ],
    relatedCategoriesTitle: "Related Catalog Categories",
    relatedCategories: [
      {
        label: "Racking and storage systems",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Pallet racks and heavy shelving forming the core infrastructure of distribution hubs.",
      },
      {
        label: "Antresole and warehouse mezzanines",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Multi-level structural platforms maximizing usable height.",
      },
      {
        label: "Carts and internal transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Counterbalance trucks, reach trucks, and pallet jacks for pallet manipulation.",
      },
    ],
    relatedGlossaryTitle: "Related Glossary Terms",
    relatedGlossaryTerms: [
      {
        label: "Pallet racking",
        glossarySlug: "regal-paletowy",
        context: "Framework structures designed for high-density storage of palletized loads.",
      },
      {
        label: "Internal transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Material handling traffic flow inside distribution facilities.",
      },
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
        context: "Consolidation of items from lower racking levels or dedicated picking zones.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "How do I choose racking for a distribution hub?",
        answer:
          "Start with selective pallet racking for 100% accessibility. Consider drive-in or gravity flow racks for high-density, low-SKU product buffers.",
      },
      {
        question: "When should I consider a mezzanine floor?",
        answer:
          "When you need additional floor space for assembly, sorting, or packing without expanding the physical building envelope.",
      },
      {
        question: "What rack protection is mandatory?",
        answer:
          "Uprights exposed to forklift collisions must be fitted with crash protectors (at least 400 mm high) to prevent collapse risks.",
      },
    ],
    cta: {
      primaryLabel: "Go to catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "View solutions",
    },
    seo: {
      title: "Distribution Center Equipment B2B | LogiMarket",
      description:
        "Procurement guide for B2B distribution centers: heavy pallet racks, industrial mezzanines, reach trucks, and aisle markings.",
    },
  },
  {
    intent: "distribution-center",
    locale: "de",
    slug: "distributionszentrum",
    path: "/de/loesungen/distributionszentrum",
    sectionLabel: "Lösungen",
    title: "Distributionszentrum",
    eyebrow: "B2B purchase intent",
    intro:
      "Distributionszentrum basieren auf hohem Palettendurchsatz, Bestandspufferung und effizienter Frachtkonsolidierung. Diese Seite unterstützt die Beschaffung von Palettenregalen, Gabelstaplern, Lagerbühnen und Kennzeichnungssystemen.",
    procurementContextTitle: "B2B-Einkaufskontext",
    procurementContext: [
      "Der Umschlag wird durch hohe Frequenzen von Ladungsträgern (Europaletten, Einwegpaletten) definiert.",
      "Die Abstimmung zwischen Blocklagerung, Regallagerung und Kommissionierzone ist entscheidend.",
      "Beschaffte Systeme müssen höchste Tragfähigkeiten aufweisen und mechanischen Belastungen standhalten.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Höhennutzung",
        description:
          "Nutzen Sie die Raumhöhe. Palettenregale und mehrgeschossige Lagerbühnen verdoppeln die nutzbare Fläche.",
      },
      {
        title: "Sicherer Betrieb",
        description:
          "Installieren Sie Rammschutzvorrichtungen und Leitplanken an allen Verkehrswegen von Flurförderzeugen.",
      },
      {
        title: "Zonenorganisation",
        description:
          "Trennen Sie Fußgänger- und Staplerwege durch Bodenmarkierungen und Schilder, um Unfälle zu vermeiden.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Regale und Lagersysteme",
        categorySlug: "c-regaly-i-systemy-skladowania",
        context: "Schwerlast- und Palettenregale für geordnete Lagerung im Distributionszentrum.",
      },
      {
        label: "Lagerbühnen und Podeste",
        categorySlug: "c-antresole-i-podesty-magazynowe",
        context: "Mehrgeschossige Stahletagen zur Erhöhung der Nutzfläche ohne Anbau.",
      },
      {
        label: "Innerbetrieblicher Transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Frontstapler, Schubmaststapler und Hubwagen für Palettenbewegungen.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Palettenregal",
        glossarySlug: "regal-paletowy",
        context: "System zur mehrstufigen Aufnahme schwerer Ladungsträger.",
      },
      {
        label: "Innerbetrieblicher Transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Fluss von Fahrzeugen und Materialien im Distributionsbereich.",
      },
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
        context: "Zusammenstellung von Palettenladungen für den Weitertransport.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Welches Regalsystem eignet sich für ein Distributionszentrum?",
        answer:
          "Breitgang-Palettenregale bieten Flexibilität. Nutzen Sie Durchlaufregale für das FIFO-Prinzip bei schnellem Warenumschlag.",
      },
      {
        question: "Wann lohnen sich Lagerbühnen?",
        answer:
          "Wenn Deckenhöhen vorhanden sind und zusätzliche Flächen für Verpackung, Sortierung oder Konfektionierung benötigt werden.",
      },
      {
        question: "Welcher Anprallschutz ist Pflicht?",
        answer:
          "Gemäß DIN EN 15635 müssen Eckpfosten von Regalen durch einen mindestens 400 mm hohen, bodenverankerten Schutz gesichert sein.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Lösungen anzeigen",
    },
    seo: {
      title: "Ausstattung für Distributionszentren B2B | LogiMarket",
      description:
        "B2B-Einkaufsführer für Distributionszentren: Palettenregale, Lagerbühnen, Stapler und Schutzplanken für Logistikentscheider.",
    },
  },
  {
    intent: "receiving-shipping",
    locale: "pl",
    slug: "strefa-przyjec-i-wysylek",
    path: "/rozwiazania/strefa-przyjec-i-wysylek",
    sectionLabel: "Rozwiązania",
    title: "Strefa przyjęć i wysyłek",
    eyebrow: "B2B purchase intent",
    intro:
      "Strefa wejścia i wyjścia towarów to krytyczny punkt każdego magazynu, gdzie odbywa się kontrola jakości, ważenie, foliowanie i konsolidacja wysyłek. Strona porządkuje dobór stołów pakowych, wózków paletowych, owijarek i zabezpieczeń ochronnych.",
    procurementContextTitle: "Kontekst zakupowy B2B",
    procurementContext: [
      "Strefa przeładunku (doki, rampy) łączy transport zewnętrzny z wewnętrznym przepływem towarów.",
      "Kluczowa jest prędkość operacji – wózki paletowe i stanowiska kontroli muszą działać bez przestojów.",
      "Zakupy powinny uwzględniać ochronę infrastruktury dokowej oraz stanowisk kontrolno-pakowych.",
    ],
    decisionGuidanceTitle: "Wskazówki decyzyjne",
    decisionFactors: [
      {
        title: "Stanowisko kontroli i pakowania",
        description:
          "Zorganizuj stanowiska kontroli jakości blisko doków. Stoły o regulowanej wysokości z uchwytami na etykiety podnoszą sprawność.",
      },
      {
        title: "Sprawność rozładunku",
        description:
          "Wybieraj solidne ręczne lub elektryczne wózki paletowe, które radzą sobie z nierównościami doków i częstym użytkowaniem.",
      },
      {
        title: "Ochrona infrastruktury",
        description:
          "Stosuj słupki ochronne, bariery oraz odbojnice naprowadzające wózków przy dokach przeładunkowych.",
      },
    ],
    relatedCategoriesTitle: "Powiązane kategorie katalogu",
    relatedCategories: [
      {
        label: "Stoły pakowe i kompletacyjne",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Stanowiska kontroli jakości, ważenia i etykietowania przesyłek przed wysyłką.",
      },
      {
        label: "Pojemniki plastikowe Euro",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Nośniki dla towarów odrzucanych na kontroli lub konsolidowanych.",
      },
      {
        label: "Wózki i transport wewnętrzny",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Wózki paletowe (paleciaki) oraz wózki unoszące do pracy w dokach.",
      },
    ],
    relatedGlossaryTitle: "Powiązane pojęcia",
    relatedGlossaryTerms: [
      {
        label: "Transport wewnętrzny",
        glossarySlug: "transport-wewnetrzny",
        context: "Ruch ładunków pomiędzy dokami przeładunkowymi a regałami wysokiego składowania.",
      },
      {
        label: "Pojemnik Euro",
        glossarySlug: "pojemnik-euro",
        context: "Znormalizowany nośnik ułatwiający transport drobnych partii na przyjęciu towaru.",
      },
      {
        label: "Kompletacja zamówień",
        glossarySlug: "kompletacja-zamowien",
        context: "Etap poprzedzający strefę wysyłki i ostateczną konsolidację paczek.",
      },
    ],
    faqTitle: "FAQ zakupowe",
    faq: [
      {
        question: "Jak usprawnić kontrolę jakości na przyjęciu?",
        answer:
          "Zainstaluj dedykowane stanowiska kontrolne z wagami i skanerami blisko doków rozładunkowych, co ograniczy zbędny ruch towaru.",
      },
      {
        question: "Jakie wózki są najlepsze do strefy dokowej?",
        answer:
          "Elektryczne wózki unoszące z platformą dla operatora znacząco przyspieszają rozładunek naczep tirów.",
      },
      {
        question: "Czy odbojnice w dokach są konieczne?",
        answer:
          "Tak, amortyzują uderzenia cofających ciężarówek, chroniąc ścianę budynku i rampę przed kosztownymi naprawami.",
      },
    ],
    cta: {
      primaryLabel: "Przejdź do katalogu",
      primaryHref: "/katalog",
      secondaryLabel: "Zobacz rozwiązania",
    },
    seo: {
      title: "Wyposażenie strefy przyjęć i wysyłek B2B | LogiMarket",
      description:
        "Wyposażenie strefy przyjęć i wysyłek B2B: stoły pakowe, wózki paletowe, ochrona doków i stanowiska kontroli ładunków na platformie LogiMarket.",
    },
  },
  {
    intent: "receiving-shipping",
    locale: "en",
    slug: "receiving-and-shipping-area",
    path: "/en/solutions/receiving-and-shipping-area",
    sectionLabel: "Solutions",
    title: "Receiving and shipping area",
    eyebrow: "B2B purchase intent",
    intro:
      "The inbound and outbound dock area is a critical warehouse node where quality control, weighing, wrapping, and shipment consolidation take place. This page coordinates procurement for packing tables, pallet jacks, stretch wrappers, and safety barriers.",
    procurementContextTitle: "B2B Procurement Context",
    procurementContext: [
      "The loading dock area links inbound/outbound road freight with the warehouse's internal flow.",
      "Speed and safety are key – pallet jacks and check stations must operate reliably during peak hours.",
      "Purchasing focus should center on protecting loading ramp infrastructure and packing stations.",
    ],
    decisionGuidanceTitle: "Decision Guidance",
    decisionFactors: [
      {
        title: "Quality check stations",
        description:
          "Position check desks close to shipping doors. Height-adjustable tables with monitor mounts streamline processing.",
      },
      {
        title: "Dock unloading speed",
        description:
          "Procure robust hand pallet trucks or electric walkie jacks built to cross dock levelers repeatedly.",
      },
      {
        title: "Infrastructure guards",
        description:
          "Install safety bollards, column barriers, and heavy rubber dock bumpers to protect loading bays.",
      },
    ],
    relatedCategoriesTitle: "Related Catalog Categories",
    relatedCategories: [
      {
        label: "Packing and picking tables",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Stations for quality check, weighing, and labeling before final dispatch.",
      },
      {
        label: "Plastic Euro containers",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Standard boxes for buffering consolidated packages or return merchandise.",
      },
      {
        label: "Carts and internal transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Pallet trucks, electric lifters, and platform carts for dock operations.",
      },
    ],
    relatedGlossaryTitle: "Related Glossary Terms",
    relatedGlossaryTerms: [
      {
        label: "Internal transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Movement of incoming pallets from docks to high-bay storage racks.",
      },
      {
        label: "Euro container",
        glossarySlug: "pojemnik-euro",
        context: "Standard container simplifying item sortation during receiving checks.",
      },
      {
        label: "Order picking",
        glossarySlug: "kompletacja-zamowien",
        context: "The pick process preceding consolidation in the dispatch lane.",
      },
    ],
    faqTitle: "Procurement FAQ",
    faq: [
      {
        question: "How do I improve incoming quality checks?",
        answer:
          "Set up check desks equipped with integrated scales and label printers next to unloading bays to reduce material transport times.",
      },
      {
        question: "Which pallet trucks are best for loading bays?",
        answer:
          "Ride-on electric pallet trucks with folding platforms greatly accelerate trailer loading and unloading.",
      },
      {
        question: "Are dock bumpers necessary?",
        answer:
          "Yes, they absorb the impact of backing trailers, protecting the dock levelers and the building facade from damage.",
      },
    ],
    cta: {
      primaryLabel: "Go to catalog",
      primaryHref: "/en/katalog",
      secondaryLabel: "View solutions",
    },
    seo: {
      title: "Receiving and Shipping Area Equipment B2B | LogiMarket",
      description:
        "Procurement guide for B2B dock areas: heavy check tables, pallet jacks, bay bumpers, and safety guards for warehouse buyers.",
    },
  },
  {
    intent: "receiving-shipping",
    locale: "de",
    slug: "wareneingang-und-versand",
    path: "/de/loesungen/wareneingang-und-versand",
    sectionLabel: "Lösungen",
    title: "Wareneingang und Versand",
    eyebrow: "B2B purchase intent",
    intro:
      "Die Warenein- und -ausgangszone ist eine kritische Lagerschnittstelle für Qualitätskontrolle, Verwiegung, Palettenwicklung und Versandkonsolidierung. Diese Seite koordiniert die Beschaffung von Packtischen, Hubwagen, Stretchwicklern und Rammschutzvorrichtungen.",
    procurementContextTitle: "B2B-Einkaufskontext",
    procurementContext: [
      "Der Ladebereich (Rampen, Tore) verbindet externen Lkw-Transport mit dem internen Warenfluss.",
      "Geschwindigkeit ist Trumpf – Hubwagen und Kontrollstationen müssen im Dauereinsatz standhalten.",
      "Beschaffungsentscheidungen sollten auf den Schutz der Torkonstruktion und Kontrollarbeitsplätze abzielen.",
    ],
    decisionGuidanceTitle: "Entscheidungshilfe",
    decisionFactors: [
      {
        title: "Kontrollarbeitsplätze",
        description:
          "Platzieren Sie Prüftische nahe den Verladetoren. Höhenverstellbare Tische mit Monitorhaltern beschleunigen die Abwicklung.",
      },
      {
        title: "Entladegeschwindigkeit",
        description:
          "Wählen Sie robuste Handhubwagen oder Elektro-Niederhubwagen für den ständigen Einsatz auf Überladebrücken.",
      },
      {
        title: "Infrastrukturschutz",
        description:
          "Installieren Sie Schutzpoller, Säulenschutz und Gummipuffer, um Schäden an Verladestationen zu vermeiden.",
      },
    ],
    relatedCategoriesTitle: "Verwandte Katalogkategorien",
    relatedCategories: [
      {
        label: "Pack- und Kommissioniertische",
        categorySlug: "c-stoly-pakowe-i-kompletacyjne",
        context: "Arbeitsstationen für Wareneingangsprüfung, Waagen und Labeldruck.",
      },
      {
        label: "Euro-Kunststoffbehälter",
        categorySlug: "c-pojemniki-plastikowe-euro",
        context: "Standardbehälter für Retourenprüfung und vorsortierte Bauteile.",
      },
      {
        label: "Innerbetrieblicher Transport",
        categorySlug: "c-wozki-i-transport-wewnetrzny",
        context: "Gabelhubwagen und Mitfahr-Flurförderzeuge für den Rampeneinsatz.",
      },
    ],
    relatedGlossaryTitle: "Verwandte Fachbegriffe",
    relatedGlossaryTerms: [
      {
        label: "Innerbetrieblicher Transport",
        glossarySlug: "transport-wewnetrzny",
        context: "Warenfluss von den Laderampen zu den Palettenhochregallagern.",
      },
      {
        label: "Eurobehälter",
        glossarySlug: "pojemnik-euro",
        context: "Modulare Behälter zur Sortierung von Waren im Wareneingang.",
      },
      {
        label: "Kommissionierung",
        glossarySlug: "kompletacja-zamowien",
        context: "Vorschreitender Prozess vor der Konsolidierung in der Versandzone.",
      },
    ],
    faqTitle: "Einkaufs-FAQ",
    faq: [
      {
        question: "Wie optimiere ich die Wareneingangskontrolle?",
        answer:
          "Richten Sie Kontrolltische mit integrierten Waagen und Scannern nahe den Toren ein, um unnötige Transportwege zu vermeiden.",
      },
      {
        question: "Welche Hubwagen eignen sich für Verladearbeiten?",
        answer:
          "Elektro-Niederhubwagen mit Fahrerstandplattform beschleunigen das Be- und Entladen von Lkw-Aufliegern erheblich.",
      },
      {
        question: "Sind Anfahrpuffer an den Toren notwendig?",
        answer:
          "Ja, sie dämpfen den Aufprall andockender Lkw und schützen Überladebrücken und das Gebäude vor teuren Schäden.",
      },
    ],
    cta: {
      primaryLabel: "Katalog öffnen",
      primaryHref: "/de/katalog",
      secondaryLabel: "Lösungen anzeigen",
    },
    seo: {
      title: "Ausstattung für Wareneingang und Versand B2B | LogiMarket",
      description:
        "B2B-Ausstattungsführer für Verladebereiche: Packtische, Hubwagen, Rampenschutz und Qualitätskontrollplätze auf LogiMarket.",
    },
  },
] satisfies LandingPageContent[];
