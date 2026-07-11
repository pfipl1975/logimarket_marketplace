import type { GlossaryContentMap } from "./types";

export const plGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "Pojemnik Euro",
    shortDefinition: "Znormalizowany pojemnik transportowo-magazynowy z tworzywa sztucznego, dostosowany wymiarami do standardowych modułów paletowych.",
    definition: [
      "Pojemniki Euro to uniwersalne jednostki ładunkowe w logistyce magazynowej, handlu detalicznym oraz procesach produkcyjnych. Ich wymiary zewnętrzne są znormalizowane i oparte na module logistycznym 1200x800 mm (odpowiadającym wymiarom europalety), co pozwala na optymalne wykorzystanie przestrzeni transportowej i regałowej.",
      "Wykonane są najczęściej z polipropylenu (PP) lub polietylenu wysokiej gęstości (HDPE), co zapewnia im odpowiednią wytrzymałość mechaniczną, odporność na pęknięcia oraz wybrane substancje chemiczne. Konstrukcja pojemników pozwala na ich sztaplowanie, czyli układanie jeden na drugim, zgodnie z zalecanymi przez producenta limitami obciążeń."
    ],
    applications: [
      "Przechowywanie i transport części na liniach produkcyjnych",
      "Kompletacja i pakowanie zamówień w centrach dystrybucyjnych i e-commerce",
      "Automatyczne magazyny drobnych elementów (systemy pojemnikowe mini-load)",
      "Transport produktów spożywczych (wersje dopuszczone do kontaktu z żywnością)"
    ],
    synonyms: ["Skrzynka Euro", "Pojemnik plastikowy Euro", "Kuweta Euro"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "Czym różni się dno wzmocnione od standardowego w pojemnikach Euro?",
        answer: "Dno wzmocnione (np. żebrowane) zapobiega nadmiernemu uginaniu się pojemnika pod wpływem dużych obciążeń punktowych. Rozwiązanie to jest często stosowane w magazynach automatycznych i na przenośnikach rolkowych, gdzie ugięcie dna mogłoby zakłócić pracę systemu transportowego."
      },
      {
        question: "Czy pojemniki Euro można myć automatycznie?",
        answer: "Tak, pojemniki wykonane z PP i HDPE można myć w myjkach przemysłowych. Parametry temperatury wody oraz stosowane środki chemiczne powinny być zgodne ze specyfikacją techniczną materiału i zaleceniami producenta."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Regał paletowy",
    shortDefinition: "System regałowy przeznaczony do składowania towarów na paletach w układzie wielopoziomowym.",
    definition: [
      "Regały paletowe rzędowe stanowią kluczowy element wyposażenia wielu hal magazynowych. Zapewniają swobodny dostęp do jednostek ładunkowych i pozwalają na wykorzystanie wysokości użytkowej budynku. Składają się z pionowych ram nośnych oraz poziomych belek (trawersów), na których umieszczane są palety.",
      "Projektowanie, montaż oraz eksploatacja systemów paletowych wymagają przestrzegania właściwych norm bezpieczeństwa (np. PN-EN 15635), przeprowadzania regularnych przeglądów technicznych oraz stosowania odpowiednich zabezpieczeń ochronnych słupów regałowych w strefach pracy wózków."
    ],
    applications: [
      "Wielopoziomowe magazyny składowania paletowego",
      "Hurtownie i strefy magazynowe w zakładach produkcyjnych",
      "Strefy buforowe i przeładunkowe w centrach logistycznych",
      "Chłodnie i mroźnie wymagające optymalizacji wykorzystania przestrzeni"
    ],
    synonyms: ["Regał wysokiego składowania", "Stojak paletowy", "Regał rzędowy"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Jakie są najczęstsze uszkodzenia regałów paletowych?",
        answer: "Najczęściej notuje się odkształcenia słupów ram pionowych oraz uszkodzenia stężeń wywołane uderzeniami wózków widłowych podczas manewrowania. W celu ograniczenia tego ryzyka stosuje się odbojnice ochronne."
      },
      {
        question: "Czy dopuszczalne jest samodzielne modyfikowanie poziomów regału?",
        answer: "Każda zmiana wysokości poziomów składowania zmienia parametry statyczne regału i wymaga weryfikacji oraz zgody producenta lub uprawnionego inżyniera przed zmianą konfiguracji."
      }
    ]
  },
  "antresola-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Antresola magazynowa",
    shortDefinition: "Konstrukcja stalowa tworząca dodatkowe poziomy użytkowe nad posadzką hali, pozwalająca zwiększyć powierzchnię operacyjną.",
    definition: [
      "Antresola magazynowa, nazywana również podestem roboczym, to system pozwalający na zagospodarowanie pionowej przestrzeni wysokich hal. Tworzy ona dodatkowe kondygnacje, na których można zlokalizować strefy kompletacji, pakowania, montażu lub lekkiego składowania.",
      "Konstrukcja opiera się na słupach nośnych, ryglach oraz podciągach. Poszycie podłogi wykonuje się najczęściej z płyt wiórowych (np. typu P5 o podwyższonej klasie odporności ogniowej) lub stalowych krat pomostowych, które ułatwiają wentylację i przepływ wody z instalacji zraszających."
    ],
    applications: [
      "Zwiększenie stref kompletacji w magazynach e-commerce i centrach fulfillment",
      "Pola odkładcze dla towarów lekkich i drobnicowych",
      "Tworzenie wydzielonych stref montażowych lub produkcyjnych",
      "Wykorzystanie wysokości hali na pomieszczenia socjalne lub pomocnicze"
    ],
    synonyms: ["Podest magazynowy", "Podest roboczy", "Antresola stalowa", "Lagerbühne"],
    relatedTerms: ["kompletacja-zamowien", "stol-pakowy"],
    relatedCategories: ["antresole-i-podesty-magazynowe"],
    faq: [
      {
        question: "Czy budowa antresoli stalowej wymaga pozwolenia na budowę?",
        answer: "Kwalifikacja prawna antresoli (jako urządzenia lub rozbudowy obiektu) zależy od jej konstrukcji, sposobu połączenia z budynkiem, przeznaczenia oraz lokalnych przepisów prawa budowlanego. Przed realizacją konieczna jest weryfikacja formalna, analiza konstrukcyjna posadzki oraz uzgodnienie z rzeczoznawcą ds. zabezpieczeń ppoż. w celu wypracowania bezpiecznego rozwiązania."
      },
      {
        question: "Jakie jest typowe dopuszczalne obciążenie antresoli?",
        answer: "Przykładowe obciążenie użytkowe podestów waha się zazwyczaj w przedziałach od 250 kg/m² do 1000 kg/m² i jest projektowane indywidualnie w zależności od planowanego przeznaczenia (np. ruch wózków paletowych, regały półkowe, obciążenie punktowe)."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Stół pakowy",
    shortDefinition: "Stanowisko pracy wyposażone w akcesoria pomocnicze, przeznaczone do weryfikacji i pakowania przesyłek.",
    definition: [
      "Stoły pakowe i kompletacyjne stanowią istotny element wyposażenia stref ekspedycyjnych w magazynach dystrybucyjnych, zwłaszcza w e-commerce. Ich celem jest usprawnienie procesu pakowania oraz wsparcie ergonomii pracy operatora poprzez optymalne rozmieszczenie materiałów i narzędzi pomocniczych.",
      "Modułowa budowa stołów pozwala na ich dostosowanie do konkretnego procesu. Wyposażenie opcjonalne obejmuje nadstawki z przegrodami na kartony, dyspensery folii lub papieru, uchwyty na monitory i drukarki etykiet oraz oświetlenie stanowiskowe."
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
        question: "Jakie wymiary blatu stołu pakowego są najczęściej stosowane?",
        answer: "W typowych konfiguracjach szerokość blatu wynosi od 1600 do 1800 mm, a głębokość około 800 mm. Pozwala to na wygodne ułożenie standardowych kartonów wysyłkowych i ergonomiczny dostęp do materiałów pomocniczych."
      },
      {
        question: "Dlaczego warto stosować stoły z regulacją wysokości?",
        answer: "Regulacja wysokości (np. elektryczna) pozwala dostosować blat do wzrostu pracownika oraz specyfiki pracy (stojącej, siedzącej lub systemu mieszanego), co zmniejsza obciążenie kręgosłupa i wspiera wydajność operacyjną."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Wózek widłowy",
    shortDefinition: "Pojazd o napędzie silnikowym przystosowany do podnoszenia, przewożenia i układania ładunków, najczęściej na paletach.",
    definition: [
      "Wózki widłowe (jezdniowe podnośnikowe) to urządzenia transportu bliskiego stosowane w magazynach, fabrykach oraz na placach składowych. Służą do pionowego podnoszenia ładunków oraz manewrowania w wyznaczonych drogach transportowych i korytarzach roboczych.",
      "Zależnie od napędu wyróżnia się wózki spalinowe (LPG, Diesel) dedykowane na otwarte przestrzenie oraz ciche wózki elektryczne (z akumulatorami kwasowo-ołowiowymi lub litowo-jonowymi) do pracy wewnątrz hal. Specjalistyczne wersje, takie jak wózki wysokiego składowania (Reach Truck) lub wózki systemowe (VNA), pozwalają na obsługę regałów na znacznych wysokościach."
    ],
    applications: [
      "Rozładunek i załadunek pojazdów dostawczych oraz kontenerów",
      "Obsługa regałów składowania paletowego (odkładanie i pobieranie palet)",
      "Poziomy transport wewnętrzny towarów na terenie zakładu",
      "Kompletacja zamówień z wyższych poziomów regałowych (wózki kompletacyjne)"
    ],
    synonyms: ["Wózek jezdniowy podnośnikowy", "Sztaplarka", "Widlak"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Czym charakteryzuje się wózek widłowy typu Reach Truck?",
        answer: "Reach Truck (wózek wysokiego składowania) posiada maszt wysuwany do przodu, co pozwala na ograniczenie gabarytów pojazdu i pracę w węższych korytarzach roboczych (często poniżej 2,9-3,1 m w zależności od modelu i ładunku) w porównaniu do klasycznych wózków czołowych."
      },
      {
        question: "Dlaczego baterie litowo-jonowe są coraz powszechniej stosowane w wózkach?",
        answer: "Baterie litowo-jonowe (Li-Ion) cechują się uproszczoną obsługą eksploatacyjną (brak konieczności uzupełniania wody), nie wymagają dedykowanych akumulatorowni z wentylacją wymuszoną (brak emisji gazów) oraz umożliwiają doładowywanie w czasie przerw."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Nośność regału",
    shortDefinition: "Maksymalne dopuszczalne obciążenie konstrukcji regałowej określone dla poziomu składowania lub dla całej kolumny regału.",
    definition: [
      "Nośność regału to kluczowy parametr techniczny wpływający na bezpieczeństwo eksploatacji magazynu. Dzieli się na nośność poziomu składowania (maksymalny dopuszczalny ciężar na parę belek nośnych) oraz nośność kolumny (maksymalne obciążenie pionu regału między sąsiednimi ramami, z uwzględnieniem rozstawu poziomów).",
      "Wartości nośności muszą być wyraźnie oznakowane na tabliczkach znamionowych (kartach obciążeń) zamontowanych na regałach. Przekroczenie parametrów projektowych stwarza ryzyko uszkodzenia lub katastrofy budowlanej. Deklarowana nośność dotyczy obciążenia statycznego równomiernie rozłożonego (UDL)."
    ],
    applications: [
      "Projektowanie i dobór systemów regałowych pod określoną specyfikację ładunków",
      "Weryfikacja parametrów bezpieczeństwa podczas regularnych przeglądów okresowych",
      "Planowanie rozmieszczenia towarów w magazynie z uwzględnieniem masy jednostek ładunkowych"
    ],
    synonyms: ["Dopuszczalne obciążenie regału", "Nośność półki", "Nośność ramy"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Co oznacza skrót UDL w kontekście nośności regału?",
        answer: "UDL (Uniformly Distributed Load) oznacza obciążenie równomiernie rozłożone na całej powierzchni poziomu składowania. Konstrukcje regałowe są projektowane z założeniem takiego rozkładu mas; duże obciążenie skupione punktowo może obniżyć rzeczywistą nośność elementu."
      },
      {
        question: "Gdzie powinny znajdować się informacje o nośności regału?",
        answer: "Karty obciążeń oraz tabliczki znamionowe muszą być zainstalowane w widocznych miejscach na konstrukcji regału (np. na czołach rzędów), zgodnie z wytycznymi bezpieczeństwa (np. PN-EN 15635)."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Kompletacja zamówień",
    shortDefinition: "Proces pobierania towarów z miejsc składowania w celu zestawienia ich zgodnie z zamówieniem odbiorcy.",
    definition: [
      "Kompletacja (ang. order picking) to jeden z najbardziej pracochłonnych procesów w logistyce magazynowej, który może stanowić znaczącą część całkowitych kosztów operacyjnych magazynu. Polega na pobraniu z zapasów artykułów w ilościach określonych w zamówieniu i dostarczeniu ich do strefy pakowania.",
      "Istnieje wiele metod zbiórki, w tym klasyczna 'człowiek do towaru' (operator przemieszcza się po magazynie) oraz automatyczna 'towar do człowieka' (gdzie systemy transportowe lub roboty dostarczają ładunki do stanowiska). W celu optymalizacji stosuje się technologie wspomagające, takie jak Pick-by-Light, systemy głosowe (Voice Picking) oraz systemy klasy WMS."
    ],
    applications: [
      "Zbiórka zamówień detalicznych w e-commerce",
      "Przygotowywanie zestawów produkcyjnych (kitting) w przemyśle produkcyjnym",
      "Dystrybucja towarów spożywczych i przemysłowych do sieci handlowych"
    ],
    synonyms: ["Kompletowanie", "Zbiórka towaru", "Order picking"],
    relatedTerms: ["pojemnik-euro", "stol-pakowy"],
    relatedCategories: ["pojemniki-plastikowe-euro", "stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "Jaka jest różnica między kompletacją jednostopniową a dwustopniową?",
        answer: "W kompletacji jednostopniowej operator zbiera artykuły bezpośrednio dla jednego konkretnego zamówienia. W dwustopniowej (Batch Picking) najpierw pobiera się łączną sumę towarów dla grupy zamówień do jednego nośnika, a następnie w strefie sortowania rozdziela je na poszczególne przesyłki."
      },
      {
        question: "Jak system klasy WMS wspiera proces kompletacji?",
        answer: "WMS (Warehouse Management System) automatycznie wyznacza sugerowaną ścieżkę zbiórki w celu ograniczenia pustych przebiegów, pomaga w grupowaniu zamówień o podobnym profilu i wskazuje optymalną kolejność pobierania towarów."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Transport wewnętrzny",
    shortDefinition: "Przemieszczanie surowców, komponentów i wyrobów w obrębie jednego obiektu przemysłowego lub magazynowego.",
    definition: [
      "Transport wewnętrzny (bliski lub intralogistyka) obejmuje procesy przemieszczania ładunków na terenie przedsiębiorstwa. Łączy strefy przyjęcia, składowania, produkcji i wydania towarów, wykorzystując zróżnicowane urządzenia pomocnicze.",
      "Infrastrukturę transportu bliskiego stanowią zarówno proste urządzenia ręczne (np. wózki paletowe ręczne), jak i systemy automatyczne: przenośniki wałkowe i taśmowe, windy pionowe, a także systemy bezzałogowe (AGV/AMR) zdolne do nawigowania w przestrzeni magazynowej."
    ],
    applications: [
      "Dostarczanie surowców z magazynu przyjęć na linie produkcyjne",
      "Przesyłanie skompletowanych ładunków do stref pakowania i ekspedycji",
      "Transport palet na poziomach antresol i podestów roboczych",
      "Przeładunek jednostek ładunkowych w strefach dokowych"
    ],
    synonyms: ["Intralogistyka", "Transport bliski", "Przepływ materiałów"],
    relatedTerms: ["wozek-widlowy", "pojemnik-euro"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Czym różnią się autonomiczne roboty mobilne AMR od tradycyjnych wózków AGV?",
        answer: "Wózki AGV (Automated Guided Vehicles) zazwyczaj poruszają się po z góry zaplanowanych i wyznaczonych trasach (np. za pomocą pętli indukcyjnych czy taśm magnetycznych), natomiast roboty AMR (Autonomous Mobile Robots) częściej wykorzystują mapowanie przestrzeni do bardziej elastycznego wyboru trasy. Rzeczywiste możliwości omijania przeszkód i zatrzymywania zależą od systemu bezpieczeństwa i specyfikacji danego producenta."
      },
      {
        question: "Jakie korzyści daje automatyzacja transportu bliskiego?",
        answer: "Automatyzacja może wspierać powtarzalność procesów, ograniczać ręczne operacje transportowe oraz zwiększać kontrolę nad przepływem materiałów. Wdrożenie wymaga jednak szczegółowej analizy procesowej, oceny bezpieczeństwa w strefach współdzielonych oraz planowania dostępności i serwisu."
      }
    ]
  }
};
