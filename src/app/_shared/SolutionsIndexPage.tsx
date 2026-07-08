import Link from "next/link";
import {
  getLandingPagesByLocale,
  getSolutionsIndexPath,
} from "@/lib/landing";
import type { LandingLocale, LandingIntent } from "@/lib/landing/types";
import {
  JsonLdScript,
  createBreadcrumbListJsonLd,
  createLandingCollectionPageJsonLd,
  createCatalogItemListJsonLd,
  createFaqPageJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { locales, type Locale } from "@/lib/i18n/config";

// Deterministic B2B intent order
const INTENT_ORDER: LandingIntent[] = [
  "warehouse-equipment",
  "intralogistics",
  "storage-systems",
  "picking-packing",
  "packaging-load-securing",
  "receiving-shipping",
  "ecommerce-warehouse",
  "distribution-center",
  "warehouse-safety",
  "forklift-attachments",
];

// Locale-specific UI copy — kept in component following GlossaryIndexPage pattern
const labels: Record<
  LandingLocale,
  {
    breadcrumb: string;
    sectionLabel: string;
    h1: string;
    intro: string;
    gridHeading: string;
    guidanceHeading: string;
    guidanceBody: string;
    faqHeading: string;
    faq: { q: string; a: string }[];
    ctaLabel: string;
    ctaHref: string;
    catalogHref: string;
  }
> = {
  pl: {
    breadcrumb: "Rozwiązania",
    sectionLabel: "Rozwiązania B2B",
    h1: "Rozwiązania dla logistyki i magazynowania",
    intro:
      "Przejdź do obszaru zakupowego i porównaj kategorie wyposażenia, systemów składowania oraz osprzętu logistycznego dla Twojego magazynu lub centrum dystrybucyjnego.",
    gridHeading: "Obszary zakupowe",
    guidanceHeading: "Jak wybrać rozwiązanie?",
    guidanceBody:
      "Każda z poniższych stron to hub zakupowy skupiony na jednej intencji zakupowej. Zacznij od opisu procesu w magazynie, zidentyfikuj wąskie gardło, a następnie przejdź do odpowiedniego obszaru, aby porównać powiązane kategorie produktów B2B.",
    faqHeading: "Najczęściej zadawane pytania",
    faq: [
      {
        q: "Czym są strony rozwiązań?",
        a: "Strony rozwiązań to huby zakupowe B2B skupione na konkretnej intencji: wyposażeniu magazynu, intralogistyce, kompletacji, pakowaniu i innych obszarach procesowych. Każda strona prowadzi do powiązanych kategorii ofert w katalogu.",
      },
      {
        q: "Czy ceny ofert są podane na stronach rozwiązań?",
        a: "Nie. Strony rozwiązań są stronami informacyjnymi i nawigacyjnymi. Ceny, dostępność i dane partnerów podane są wyłącznie na stronach ofert w katalogu.",
      },
      {
        q: "Jak szybko znaleźć odpowiedni obszar zakupowy?",
        a: "Wybierz obszar odpowiadający Twojemu procesowi: wyposażenie ogólne, systemy składowania, kompletacja, pakowanie, strefa przyjęć/wysyłek, e-commerce lub bezpieczeństwo magazynu.",
      },
    ],
    ctaLabel: "Katalog ofert",
    ctaHref: "/katalog",
    catalogHref: "/katalog",
  },
  en: {
    breadcrumb: "Solutions",
    sectionLabel: "B2B Solutions",
    h1: "Logistics and Warehousing Solutions",
    intro:
      "Navigate to a procurement area and compare categories of warehouse equipment, storage systems, and logistics accessories for your warehouse or distribution center.",
    gridHeading: "Procurement Areas",
    guidanceHeading: "How to choose a solution?",
    guidanceBody:
      "Each page below is a B2B procurement hub focused on a single purchase intent. Start by describing your warehouse process, identify the bottleneck, then navigate to the relevant area to compare B2B product categories.",
    faqHeading: "Frequently Asked Questions",
    faq: [
      {
        q: "What are solution pages?",
        a: "Solution pages are B2B procurement hubs focused on a specific intent: warehouse equipment, intralogistics, picking, packing, and other process areas. Each page leads to related offer categories in the catalog.",
      },
      {
        q: "Are prices shown on solution pages?",
        a: "No. Solution pages are informational and navigational. Prices, availability, and partner data are only shown on offer pages in the catalog.",
      },
      {
        q: "How to quickly find the right procurement area?",
        a: "Choose the area matching your process: general equipment, storage systems, picking, packing, receiving/shipping zone, e-commerce, or warehouse safety.",
      },
    ],
    ctaLabel: "Offer catalog",
    ctaHref: "/en/katalog",
    catalogHref: "/en/katalog",
  },
  de: {
    breadcrumb: "Lösungen",
    sectionLabel: "B2B-Lösungen",
    h1: "Logistik- und Lagerlösungen",
    intro:
      "Navigieren Sie zu einem Beschaffungsbereich und vergleichen Sie Kategorien von Lagerausstattung, Lagersystemen und Logistikzubehör für Ihr Lager oder Distributionszentrum.",
    gridHeading: "Beschaffungsbereiche",
    guidanceHeading: "Wie wählt man eine Lösung?",
    guidanceBody:
      "Jede der folgenden Seiten ist ein B2B-Beschaffungs-Hub für eine bestimmte Kaufabsicht. Beginnen Sie mit der Beschreibung Ihres Lagerprozesses, identifizieren Sie den Engpass, und navigieren Sie dann zum relevanten Bereich, um B2B-Produktkategorien zu vergleichen.",
    faqHeading: "Häufig gestellte Fragen",
    faq: [
      {
        q: "Was sind Lösungsseiten?",
        a: "Lösungsseiten sind B2B-Beschaffungs-Hubs für eine bestimmte Kaufabsicht: Lagerausstattung, Intralogistik, Kommissionierung, Verpackung und andere Prozessbereiche. Jede Seite führt zu verwandten Angebotskategorien im Katalog.",
      },
      {
        q: "Werden Preise auf Lösungsseiten angezeigt?",
        a: "Nein. Lösungsseiten sind informativ und navigatorisch. Preise, Verfügbarkeit und Partnerdaten werden nur auf Angebotsseiten im Katalog angezeigt.",
      },
      {
        q: "Wie findet man schnell den richtigen Beschaffungsbereich?",
        a: "Wählen Sie den Bereich entsprechend Ihrem Prozess: allgemeine Ausstattung, Lagersysteme, Kommissionierung, Verpackung, Wareneingang/Versand, E-Commerce oder Lagersicherheit.",
      },
    ],
    ctaLabel: "Angebotskatalog",
    ctaHref: "/de/katalog",
    catalogHref: "/de/katalog",
  },
  es: {
    breadcrumb: "Soluciones",
    sectionLabel: "Soluciones B2B",
    h1: "Soluciones para logística y almacenamiento",
    intro:
      "Navegue a un área de aprovisionamiento y compare categorías de equipos de almacén, sistemas de almacenaje y accesorios logísticos para su almacén o centro de distribución.",
    gridHeading: "Áreas de aprovisionamiento",
    guidanceHeading: "¿Cómo elegir una solución?",
    guidanceBody:
      "Cada página a continuación es un hub de aprovisionamiento B2B centrado en una sola intención de compra. Comience describiendo su proceso en el almacén, identifique el cuello de botella y luego navegue al área correspondiente para comparar categorías de productos B2B.",
    faqHeading: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Qué son las páginas de soluciones?",
        a: "Las páginas de soluciones son hubs de aprovisionamiento B2B centrados en una intención específica: equipamiento de almacén, intralogística, preparación de pedidos, embalaje y otras áreas de proceso. Cada página conduce a categorías de ofertas relacionadas en el catálogo.",
      },
      {
        q: "¿Se muestran precios en las páginas de soluciones?",
        a: "No. Las páginas de soluciones son informativas y de navegación. Los precios, la disponibilidad y los datos de los socios solo se muestran en las páginas de ofertas del catálogo.",
      },
      {
        q: "¿Cómo encontrar rápidamente el área de aprovisionamiento correcta?",
        a: "Elija el área que corresponda a su proceso: equipamiento general, sistemas de almacenaje, preparación de pedidos, embalaje, zona de recepción/envío, e-commerce o seguridad en almacén.",
      },
    ],
    ctaLabel: "Catálogo de ofertas",
    ctaHref: "/es/katalog",
    catalogHref: "/es/katalog",
  },
  fr: {
    breadcrumb: "Solutions",
    sectionLabel: "Solutions B2B",
    h1: "Solutions logistiques et d'entreposage",
    intro:
      "Accédez à une zone d'approvisionnement et comparez les catégories d'équipements d'entrepôt, de systèmes de stockage et d'accessoires logistiques pour votre entrepôt ou centre de distribution.",
    gridHeading: "Zones d'approvisionnement",
    guidanceHeading: "Comment choisir une solution ?",
    guidanceBody:
      "Chaque page ci-dessous est un hub d'approvisionnement B2B axé sur une seule intention d'achat. Commencez par décrire votre processus en entrepôt, identifiez le goulot d'étranglement, puis accédez à la zone correspondante pour comparer les catégories de produits B2B.",
    faqHeading: "Questions fréquemment posées",
    faq: [
      {
        q: "Que sont les pages de solutions ?",
        a: "Les pages de solutions sont des hubs d'approvisionnement B2B axés sur une intention spécifique : équipement d'entrepôt, intralogistique, préparation de commandes, emballage et autres domaines de processus. Chaque page mène à des catégories d'offres connexes dans le catalogue.",
      },
      {
        q: "Les prix sont-ils affichés sur les pages de solutions ?",
        a: "Non. Les pages de solutions sont informatives et de navigation. Les prix, la disponibilité et les données des partenaires sont uniquement affichés sur les pages d'offres du catalogue.",
      },
      {
        q: "Comment trouver rapidement la bonne zone d'approvisionnement ?",
        a: "Choisissez la zone correspondant à votre processus : équipement général, systèmes de stockage, préparation de commandes, emballage, zone de réception/expédition, e-commerce ou sécurité en entrepôt.",
      },
    ],
    ctaLabel: "Catalogue d'offres",
    ctaHref: "/fr/katalog",
    catalogHref: "/fr/katalog",
  },
  uk: {
    breadcrumb: "Рішення",
    sectionLabel: "Рішення B2B",
    h1: "Рішення для логістики та складування",
    intro:
      "Перейдіть до зони закупівель та порівняйте категорії складського обладнання, систем зберігання та логістичного приладдя для вашого складу або розподільчого центру.",
    gridHeading: "Зони закупівель",
    guidanceHeading: "Як обрати рішення?",
    guidanceBody:
      "Кожна з наведених нижче сторінок є B2B-хабом закупівель, зосередженим на одному намірі покупки. Почніть з опису складського процесу, визначте вузьке місце, а потім перейдіть до відповідної зони для порівняння категорій продуктів B2B.",
    faqHeading: "Питання, що часто задаються",
    faq: [
      {
        q: "Що таке сторінки рішень?",
        a: "Сторінки рішень — це B2B-хаби закупівель, зосереджені на конкретному намірі: складське обладнання, інтралогістика, комплектація, пакування та інші процесні зони. Кожна сторінка веде до пов'язаних категорій пропозицій у каталозі.",
      },
      {
        q: "Чи відображаються ціни на сторінках рішень?",
        a: "Ні. Сторінки рішень є інформаційними та навігаційними. Ціни, наявність та дані партнерів відображаються лише на сторінках пропозицій у каталозі.",
      },
      {
        q: "Як швидко знайти відповідну зону закупівель?",
        a: "Оберіть зону, що відповідає вашому процесу: загальне обладнання, системи зберігання, комплектація, пакування, зона прийому/відправки, e-commerce або безпека складу.",
      },
    ],
    ctaLabel: "Каталог пропозицій",
    ctaHref: "/uk/katalog",
    catalogHref: "/uk/katalog",
  },
  zh: {
    breadcrumb: "解决方案",
    sectionLabel: "B2B解决方案",
    h1: "物流与仓储解决方案",
    intro:
      "前往采购区域，比较仓库设备、存储系统和物流配件的类别，适用于您的仓库或配送中心。",
    gridHeading: "采购区域",
    guidanceHeading: "如何选择解决方案？",
    guidanceBody:
      "以下每个页面都是专注于单一采购意图的B2B采购中心。首先描述您的仓库流程，找出瓶颈所在，然后前往相关区域比较B2B产品类别。",
    faqHeading: "常见问题",
    faq: [
      {
        q: "什么是解决方案页面？",
        a: "解决方案页面是专注于特定意图的B2B采购中心：仓库设备、内部物流、拣货、包装及其他流程领域。每个页面都链接到目录中的相关报价类别。",
      },
      {
        q: "解决方案页面上是否显示价格？",
        a: "不显示。解决方案页面是信息性和导航性页面。价格、库存情况和合作伙伴数据仅在目录的报价页面上显示。",
      },
      {
        q: "如何快速找到正确的采购区域？",
        a: "选择与您的流程相对应的区域：通用设备、存储系统、拣货、包装、收货/发货区、电商或仓库安全。",
      },
    ],
    ctaLabel: "产品目录",
    ctaHref: "/zh/katalog",
    catalogHref: "/zh/katalog",
  },
};

interface SolutionsIndexPageProps {
  locale: LandingLocale;
}

export async function SolutionsIndexPage({ locale }: SolutionsIndexPageProps) {
  const dict = await getDictionary(locale as Locale);
  const indexPath = getSolutionsIndexPath(locale);
  const pageUrl = absoluteUrl(indexPath);
  const homePath = getHomePath(locale as Locale);
  const t = labels[locale];

  // All 10 landings for this locale, sorted by INTENT_ORDER
  const allLandings = getLandingPagesByLocale(locale);
  const sortedLandings = INTENT_ORDER.map((intent) =>
    allLandings.find((p) => p.intent === intent)
  ).filter(Boolean) as typeof allLandings;

  // Language links for header
  const headerLanguageLinks = Object.fromEntries(
    locales.map((loc) => [loc, getSolutionsIndexPath(loc as LandingLocale)]),
  ) as Record<Locale, string>;

  // JSON-LD
  const breadcrumbJsonLd = createBreadcrumbListJsonLd([
    { name: "LogiMarket", url: absoluteUrl(homePath) },
    { name: t.breadcrumb, url: pageUrl },
  ]);

  const collectionJsonLd = createLandingCollectionPageJsonLd({
    pageUrl,
    name: t.h1,
    description: t.intro,
    locale: locale as Locale,
    about: "B2B solutions index for logistics, warehousing, intralogistics and warehouse equipment",
  });

  const itemListJsonLd = createCatalogItemListJsonLd(
    sortedLandings.map((landing) => ({
      name: landing.title,
      url: absoluteUrl(landing.path),
    }))
  );

  const faqJsonLd = createFaqPageJsonLd({
    faq: t.faq.map((item) => ({ question: item.q, answer: item.a })),
    pageUrl,
  });

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={collectionJsonLd} />
      <JsonLdScript data={itemListJsonLd} />
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}

      <SiteHeader
        locale={locale as Locale}
        languageLinks={headerLanguageLinks}
        navLabels={dict.nav}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href={homePath} className="transition-colors hover:text-foreground">
            LogiMarket
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground" aria-current="page">
            {t.breadcrumb}
          </span>
        </nav>

        {/* Hero */}
        <section className="border-b border-border pb-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
            {t.sectionLabel}
          </span>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            {t.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t.intro}
          </p>
          <div className="mt-7">
            <Link
              href={t.catalogHref}
              className="inline-flex items-center justify-center rounded-md bg-brand-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0e5a6a]"
            >
              {t.ctaLabel}
            </Link>
          </div>
        </section>

        {/* Grid of 10 intent cards */}
        <section className="py-10">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-brand-navy">
            {t.gridHeading}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedLandings.map((landing) => (
              <Link
                key={landing.intent}
                href={landing.path}
                className="group border border-border bg-white p-5 transition-colors hover:border-brand-teal"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block mb-2">
                  {landing.sectionLabel}
                </span>
                <h3 className="text-sm font-bold text-brand-navy group-hover:text-brand-teal leading-snug">
                  {landing.title}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {landing.intro}
                </p>
                <span className="mt-4 block text-xs font-semibold text-brand-teal group-hover:underline">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Procurement guidance */}
        <section className="border-t border-border py-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-brand-navy">
            {t.guidanceHeading}
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t.guidanceBody}
          </p>
        </section>

        {/* FAQ */}
        <section className="border-t border-border py-10">
          <h2 className="mb-5 text-xl font-bold tracking-tight text-brand-navy">
            {t.faqHeading}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {t.faq.map((item) => (
              <article key={item.q} className="border border-border bg-white p-5">
                <h3 className="text-sm font-semibold text-brand-navy">{item.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA to catalog */}
        <section className="border-t border-border py-10 flex justify-start">
          <Link
            href={t.catalogHref}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
          >
            {t.ctaLabel} →
          </Link>
        </section>
      </main>

      <SiteFooter
        locale={locale as Locale}
        navLabels={dict.nav}
        footerLabels={dict.footer}
      />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
      />
    </div>
  );
}
