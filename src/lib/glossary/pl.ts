import type { GlossaryContentMap } from "./types";

export const plGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "Pojemnik Euro",
    shortDefinition: "Znormalizowany pojemnik transportowo-magazynowy z tworzywa sztucznego, dostosowany wymiarami do wymiarów europalety.",
    definition: [
      "Pojemniki Euro to podstawowe jednostki ładunkowe w logistyce magazynowej, handlu detalicznym oraz przemyśle produkcyjnym. Ich wymiary zewnętrzne są ściśle ustandaryzowane i oparte na module logistycznym 1200x800 mm (wymiary europalety), co pozwala na optymalne wykorzystanie przestrzeni transportowej i magazynowej.",
      "Wykonane są najczęściej z polipropylenu (PP) lub polietylenu wysokiej gęstości (HDPE), co zapewnia im doskonałą wytrzymałość mechaniczną, odporność na pęknięcia, działanie kwasów, olejów i zasad. Konstrukcja pojemników pozwala na ich bezpieczne sztaplowanie, czyli układanie jeden na drugim, bez ryzyka uszkodzenia zawartości."
    ],
    applications: [
      "Przechowywanie i transport części na liniach produkcyjnych",
      "Kompletacja i pakowanie zamówień w centrach dystrybucyjnych i e-commerce",
      "Automatyczne magazyny drobnych elementów (systemy AKL / mini-load)",
      "Bezpieczny transport produktów spożywczych (wersje z atestem PZH)"
    ],
    synonyms: ["Skrzynka Euro", "Pojemnik plastikowy Euro", "Kuweta Euro"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "Czym różni się dno wzmocnione od standardowego w pojemnikach Euro?",
        answer: "Dno wzmocnione (np. żebrowane lub podwójne) zapobiega uginaniu się pojemnika pod wpływem dużych obciążeń punktowych. Jest to kluczowe w magazynach automatycznych (przenośnikach rolkowych), gdzie ugięcie dna mogłoby zablokować system transportowy."
      },
      {
        question: "Czy pojemniki Euro można myć automatycznie?",
        answer: "Tak, tworzywa PP i HDPE są odporne na temperaturę wody stosowaną w przemysłowych myjkach automatycznych (zazwyczaj do +80°C) oraz na chemiczne środki czyszczące."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Regał paletowy",
    shortDefinition: "System regałowy przeznaczony do bezpiecznego składowania towarów na paletach w układzie wielopoziomowym.",
    definition: [
      "Regały paletowe (przede wszystkim rzędowe) stanowią trzon większości nowoczesnych hal magazynowych. Zapewniają bezpośredni dostęp do każdej palety (zasada 100% dostępności) i pozwalają na pełne wykorzystanie wysokości użytkowej budynku. Składają się z pionowych ram stalowych oraz poziomych trawersów (belek nośnych), na których opierane są jednostki ładunkowe.",
      "Projektowanie i montaż systemów paletowych wymagają ścisłego przestrzegania norm bezpieczeństwa (w tym normy PN-EN 15635), przeprowadzania regularnych przeglądów technicznych oraz stosowania odpowiednich odbojnic i osłon chroniących słupy regału przed uderzeniami wózków widłowych."
    ],
    applications: [
      "Wielopoziomowe magazyny wysokiego składowania",
      "Hurtownie materiałów budowlanych i przemysłowych",
      "Strefy buforowe i przeładunkowe w centrach logistycznych",
      "Chłodnie i mroźnie (wymagające optymalnego wykorzystania kubatury)"
    ],
    synonyms: ["Regał wysokiego składowania", "Stojak paletowy", "Regał rzędowy"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Jakie są najczęstsze uszkodzenia regałów paletowych?",
        answer: "Najczęstsze uszkodzenia to odkształcenia słupów ram pionowych oraz uszkodzenia stężeń spowodowane uderzeniami wózków widłowych podczas manewrowania. Dlatego kluczowe jest stosowanie odbojnic ochronnych."
      },
      {
        question: "Czy dopuszczalne jest samodzielne modyfikowanie poziomów regału?",
        answer: "Każda zmiana wysokości poziomów składowania zmienia parametry statyczne regału i wymaga zgody producenta lub ponownego przeliczenia nośności konstrukcji przez inżyniera."
      }
    ]
  },
  "antresole-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Antresola magazynowa",
    shortDefinition: "Samonośna konstrukcja stalowa tworząca dodatkowe poziomy użytkowe nad posadzką hali, zwiększająca powierzchnię użytkową bez rozbudowy budynku.",
    definition: [
      "Antresola magazynowa, nazywana również podestem roboczym lub antresolą przemysłową, to zaawansowany system pozwalający na optymalne zagospodarowanie pionowej przestrzeni wysokich hal. Tworzy ona dodatkowe kondygnacje, na których można zlokalizować strefy kompletacji, pakowania, montażu, a nawet pomieszczenia biurowe.",
      "Konstrukcja opiera się na stalowych słupach nośnych, ryglach oraz podciągach. Poszycie podłogi wykonuje się najczęściej z wytrzymałych płyt wiórowych P5 (często o podwyższonej odporności na ogień) lub stalowych krat pomostowych (tzw. krat grzejnikowych), które zapewniają lepszą wentylację i ułatwiają działanie instalacji tryskaczowych."
    ],
    applications: [
      "Zwiększenie stref kompletacji w magazynach e-commerce (magazyny wielopoziomowe)",
      "Pola odkładcze dla towarów lekkich i objętościowych",
      "Tworzenie wydzielonych stref montażowych lub produkcyjnych na wysokości",
      "Budowa zapleczy socjalnych i biur na antresoli wewnątrz hali produkcyjnej"
    ],
    synonyms: ["Podest magazynowy", "Podest roboczy", "Antresola stalowa", "Lagerbühne"],
    relatedTerms: ["kompletacja-zamowien", "stol-pakowy"],
    relatedCategories: ["antresole-i-podesty-magazynowe"],
    faq: [
      {
        question: "Czy budowa antresoli stalowej wymaga pozwolenia na budowę?",
        answer: "Konstrukcje wolnostojące, kotwione wyłącznie do posadzki i demontowalne, są zazwyczaj traktowane jako urządzenia magazynowe, a nie jako rozbudowa budynku, dlatego często nie wymagają pozwolenia na budowę. Niezbędne jest jednak zgłoszenie konstrukcji i weryfikacja nośności posadzki oraz instalacji ppoż."
      },
      {
        question: "Jakie jest typowe dopuszczalne obciążenie antresoli?",
        answer: "Standardowe obciążenie użytkowe podestów wynosi od 250 kg/m² do 1000 kg/m² i jest dobierane indywidualnie w zależności od planowanego przeznaczenia (np. ruch wózków paletowych, regały półkowe)."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Stół pakowy",
    shortDefinition: "Ergonomiczne stanowisko pracy wyposażone w uchwyty na materiały opakowaniowe, przeznaczone do sprawnej weryfikacji i pakowania przesyłek.",
    definition: [
      "Stoły pakowe i kompletacyjne stanowią kluczowy element wyposażenia stref ekspedycyjnych w magazynach dystrybucyjnych, zwłaszcza w branży e-commerce. Ich celem jest skrócenie czasu przygotowania paczki do wysyłki oraz zminimalizowanie zmęczenia operatora poprzez zachowanie zasad ergonomii (regulacja wysokości blatu, łatwy dostęp do akcesoriów).",
      "Modułowa budowa stołów pozwala na ich konfigurację pod konkretny proces pakowania. Standardowe wyposażenie obejmuje nadstawki z przegrodami na kartony, dyspensery folii stretch lub papieru nacinanego, półki na monitory i drukarki etykiet, a także oświetlenie stanowiskowe LED."
    ],
    applications: [
      "Stanowiska pakowania paczek kurierskich w e-commerce",
      "Kontrola jakości produktów przed wysyłką do klienta",
      "Stanowiska montażowo-pakowe w zakładach produkcyjnych",
      "Centra sortowania i konsolidacji przesyłek"
    ],
    synonyms: ["Stanowisko pakowania", "Stół kompletacyjny", "Stół do pakowania paczek"],
    relatedTerms: ["pojemnik-euro", "kompletacja-zamowien"],
    relatedCategories: ["stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "Jakie wymiary blatu stołu pakowego są najbardziej optymalne?",
        answer: "Najbardziej popularna szerokość blatu to 1600-1800 mm, a głębokość to 800 mm. Pozwala to na swobodne ułożenie dużych kartonów wysyłkowych i wygodny dostęp do materiałów pomocniczych."
      },
      {
        question: "Dlaczego warto stosować stoły z regulacją wysokości?",
        answer: "Regulacja wysokości (zwłaszcza elektryczna) pozwala dopasować blat do wzrostu pracownika oraz specyfiki pracy (na siedząco, na stojąco lub system mieszany), co redukuje obciążenie kręgosłupa i zwiększa wydajność o kilkanaście procent."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Wózek widłowy",
    shortDefinition: "Flurförderzeug o napędzie silnikowym przystosowany do podnoszenia, przewożenia i układania ładunków umieszczonych na paletach.",
    definition: [
      "Wózki widłowe (jezdniowe podnośnikowe) to kluczowe maszyny transportu bliskiego stosowane w magazynach, portach, fabrykach oraz na placach budowy. Ich główną zaletą jest zdolność do pionowego podnoszenia ładunków na duże wysokości oraz precyzyjnego manewrowania w wąskich korytarzach roboczych.",
      "Zależnie od napędu wyróżnia się wózki spalinowe (LPG, Diesel) dedykowane na zewnątrz oraz ciche i ekologiczne wózki elektryczne (z akumulatorami kwasowo-ołowiowymi lub nowoczesnymi Li-Ion) do pracy wewnątrz hal. Specjalistyczne wersje, takie jak wózki wysokiego składowania (Reach Truck) lub wózki systemowe (VNA), pozwalają na obsługę regałów na wysokościach przekraczających 12 metrów."
    ],
    applications: [
      "Rozładunek i załadunek naczep samochodów ciężarowych oraz kontenerów",
      "Obsługa regałów wysokiego składowania (odkładanie i pobieranie palet)",
      "Poziomy transport wewnętrzny towarów na terenie zakładu",
      "Kompletacja zamówień z wyższych poziomów regałowych"
    ],
    synonyms: ["Wózek jezdniowy podnośnikowy", "Sztaplarka", "Widlak"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Czym charakteryzuje się wózek widłowy typu Reach Truck?",
        answer: "Reach Truck (wózek wysokiego składowania) ma wysuwany maszt, co pozwala na zmniejszenie wózka i pracę w znacznie węższych korytarzach roboczych (zazwyczaj o szerokości poniżej 2,9 m) niż tradycyjne wózki czołowe."
      },
      {
        question: "Dlaczego baterie litowo-jonowe zastępują kwasowo-ołowiowe w wózkach?",
        answer: "Baterie Li-Ion nie wymagają konserwacji (uzupełniania wody), nie gazują podczas ładowania (brak konieczności budowy specjalnych akumulatorowni) oraz umożliwiają szybkie doładowywanie podczas przerw w pracy."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Nośność regału",
    shortDefinition: "Maksymalne dopuszczalne obciążenie konstrukcji regałowej przypadające na jedną parę belek nośnych lub na całą kolumnę regału.",
    definition: [
      "Nośność regału to kluczowy parametr techniczny gwarantujący bezpieczeństwo pracy w magazynie. Dzieli się na nośność poziomu składowania (maksymalny ciężar, jaki można umieścić na jednej parze belek nośnych / półce) oraz nośność kolumny regałowej (maksymalne zsumowane obciążenie wszystkich poziomów pionu regału między dwiema sąsiednimi ramami).",
      "Wartość nośności musi być wyraźnie oznakowana na tabliczkach znamionowych umieszczonych na czołach rzędów regałowych. Przekroczenie tych wartości grozi katastrofą budowlaną (zawaleniem się regałów). Obciążenie musi być rozkładane równomiernie (obciążenie statyczne równomiernie rozłożone - UDL)."
    ],
    applications: [
      "Projektowanie systemów regałowych pod konkretną specyfikację ładunków",
      "Weryfikacja parametrów bezpieczeństwa podczas rocznych przeglądów eksperckich PRSES",
      "Planowanie rozmieszczenia towarów w magazynie ze względu na ich wagę"
    ],
    synonyms: ["Dopuszczalne obciążenie regału", "Nośność półki", "Nośność ramy"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Co oznacza skrót UDL w kontekście nośności regału?",
        answer: "UDL (Uniformly Distributed Load) to obciążenie równomiernie rozłożone na całej powierzchni półki lub belek nośnych. Konstrukcje regałowe są projektowane pod kątem takiego obciążenia; punktowe umieszczenie ciężkiej paczki drastycznie obniża rzeczywistą wytrzymałość elementu."
      },
      {
        question: "Gdzie powinny znajdować się informacje o nośności regału?",
        answer: "Tabliczki znamionowe z informacją o nośności muszą być zamontowane w widocznym miejscu na każdym regale lub rzędzie regałów, zgodnie z normą PN-EN 15635."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Kompletacja zamówień",
    shortDefinition: "Proces pobierania określonych towarów z miejsc składowania w celu zestawienia ich zgodnie z zamówieniem odbiorcy.",
    definition: [
      "Kompletacja (ang. order picking) to jeden z najbardziej pracochłonnych i kosztownych procesów w logistyce magazynowej, stanowiący nawet do 50-60% całkowitych kosztów operacyjnych magazynu. Polega na pobraniu z zapasów artykułów w ilościach określonych w zamówieniu klienta i dostarczeniu ich do strefy pakowania.",
      "Istnieje wiele metod kompletacji, np. 'człowiek do towaru' (operator przemieszcza się po magazynie) lub automatyczna metoda 'towar do człowieka' (systemy przenośników i roboty dostarczają ładunki do stanowiska). W celu optymalizacji stosuje się technologie wspomagające, takie jak Pick-by-Light, Voice Picking czy systemy WMS optymalizujące ścieżki zbiórki."
    ],
    applications: [
      "Zbiórka zamówień detalicznych w e-commerce",
      "Przygotowywanie zestawów produkcyjnych (kitting) w przemyśle motoryzacyjnym",
      "Dystrybucja towarów spożywczych i farmaceutycznych do sieci handlowych"
    ],
    synonyms: ["Kompletowanie", "Zbiórka towaru", "Order picking"],
    relatedTerms: ["pojemnik-euro", "stol-pakowy"],
    relatedCategories: ["pojemniki-plastikowe-euro", "stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "Jaka jest różnica między kompletacją jednostopniową a dwustopniową?",
        answer: "W kompletacji jednostopniowej operator zbiera artykuły bezpośrednio dla jednego konkretnego zamówienia. W dwustopniowej (Batch Picking) najpierw zbiera się łączną sumę towarów dla wielu zamówień do jednego wózka, a następnie w strefie sortowania dzieli je na poszczególne paczki klienta."
      },
      {
        question: "Jak technologia WMS skraca czas kompletacji?",
        answer: "System WMS (Warehouse Management System) automatycznie wyznacza najkrótszą ścieżkę zbiórki, eliminuje puste przebiegi, grupuje zamówienia o podobnym profilu i wskazuje pracownikowi optymalną kolejność pobierania towarów."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Transport wewnętrzny",
    shortDefinition: "Przemieszczanie surowców, półproduktów i wyrobów gotowych w obrębie jednego obiektu przemysłowego lub magazynowego.",
    definition: [
      "Transport wewnętrzny (bliski lub intralogistyka) obejmuje wszelkie procesy przemieszczania ładunków na terenie przedsiębiorstwa. Jest elementem integrującym procesy przyjęcia, składowania, produkcji i wydania towarów. Do jego realizacji wykorzystuje się szerokie spektrum urządzeń pomocniczych.",
      "Infrastrukturę transportu bliskiego stanowią zarówno proste urządzenia ręczne (wózki paletowe ręczne), jak i systemy automatyczne: przenośniki wałkowe i taśmowe, windy pionowe, a także fahrerlose Transportsysteme (AGV/AMR) zdolne do samodzielnego nawigowania w przestrzeni bez udziału operatora."
    ],
    applications: [
      "Przesyłanie surowców z magazynu przyjęć na linie produkcyjne",
      "Dystrybucja skompletowanych ładunków do stref pakowania i wysyłki",
      "Automatyczny załadunek i rozładunek wind technologicznych na poziomach antresol",
      "Przeładunek palet w strefach dokowych"
    ],
    synonyms: ["Intralogistyka", "Transport bliski", "Przepływ materiałów"],
    relatedTerms: ["wozek-widlowy", "pojemnik-euro"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Czym różnią się autonomiczne roboty mobilne AMR od tradycyjnych wózków AGV?",
        answer: "Roboty AMR (Autonomous Mobile Robots) nawigują samodzielnie na podstawie mapy laserowej i potrafią dynamicznie omijać przeszkody. Tradycyjne wózki AGV poruszają się po ściśle wytyczonej trasie (np. taśmie magnetycznej) i zatrzymują się przed przeszkodą, czekając na jej usunięcie."
      },
      {
        question: "Jakie korzyści daje automatyzacja transportu bliskiego?",
        answer: "Automatyzacja pozwala na ciągły przepływ towarów 24/7, eliminuje błędy ludzkie, drastycznie zmniejsza liczbę wypadków w magazynie oraz obniża koszty operacyjne intralogistyki."
      }
    ]
  }
};
