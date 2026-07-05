import type { CategoryContentMap } from "./types";

export const plCategoryContent: CategoryContentMap = {
  "regaly-i-systemy-skladowania": {
    slug: "regaly-i-systemy-skladowania",
    locale: "pl",
    definition: "Systemy regałowe i konstrukcje magazynowe stanowią kluczową infrastrukturę intralogistyczną, służącą do bezpiecznego i zorganizowanego składowania towarów na różnych poziomach wysokości. Systemy te są dostosowywane do charakterystyki jednostek ładunkowych, wymogów rotacji oraz specyfikacji technicznej hali magazynowej.",
    applications: [
      "Magazyny wysokiego składowania i centra dystrybucyjne",
      "Strefy buforowe przy liniach produkcyjnych",
      "Magazyny chłodnicze i mroźnie (wymagające optymalizacji przestrzeni)",
      "Hurtownie i archiwa zakładowe"
    ],
    decisionFactors: [
      "Typ składowanych jednostek ładunkowych (palety EUR, palety przemysłowe, dłużyce, kartony, towary nietypowe)",
      "Nośność maksymalna na poziom składowania oraz dopuszczalne obciążenie całej kolumny regałowej",
      "Wymagana zasada rotacji towarów (LIFO - np. regały wjezdne, FIFO - np. regały przepływowe, rzędowe)",
      "Wymiary hali magazynowej, w tym wysokość użytkowa w świetle, rozstaw słupów konstrukcyjnych oraz nośność posadzki",
      "Szerokość korytarzy roboczych (AST) i kompatybilność z wózkami typu reach truck, VNA lub wózkami czołowymi",
      "Wymogi bezpieczeństwa pracy (odbojnice, siatki zabezpieczające tył regału, wygrodzenia BHP)",
      "Potrzeba przyszłej rozbudowy systemu regałowego lub integracji z automatyzacją magazynową",
      "Stan techniczny i parametry dylatacji posadzki betonowej wpływającej na kotwienie stóp regałów"
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-paletowe",
        relationType: "parent_child",
        priority: 1,
        context: "Główna grupa regałów do składowania paletowego"
      },
      {
        targetSlug: "regaly-polkowe-i-antresole",
        relationType: "parent_child",
        priority: 2,
        context: "Rozwiązania do składowania drobnicaowego i wielopoziomowego"
      },
      {
        targetSlug: "wozki-i-transport-wewnetrzny",
        relationType: "application_context",
        priority: 3,
        context: "Urządzenia do obsługi systemów regałowych"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Zabezpieczenia i odbojnice wymagane normami BHP dla regałów"
      }
    ]
  },
  "wozki-i-transport-wewnetrzny": {
    slug: "wozki-i-transport-wewnetrzny",
    locale: "pl",
    definition: "Urządzenia transportu bliskiego i transportu wewnętrznego to maszyny przeznaczone do przemieszczania, podnoszenia i układania jednostek ładunkowych wewnątrz obiektów logistycznych oraz produkcyjnych. Obejmują one zarówno proste wózki ręczne, jak i zaawansowane wózki widłowe z napędem mechanicznym oraz pojazdy autonomiczne.",
    applications: [
      "Rozładunek i załadunek jednostek transportowych na dokach przeładunkowych",
      "Poziomy transport towarów na duże dystanse wewnątrz hal",
      "Obsługa regałów wysokiego składowania (reach truck, VNA)",
      "Kompletacja zamówień w strefach niskiego i wysokiego składowania",
      "Zasilanie linii produkcyjnych w komponenty"
    ],
    decisionFactors: [
      "Masa maksymalna ładunku (udźwig nominalny i zredukowany na maksymalnej wysokości) oraz gabaryty ładunku",
      "Typ napędu (elektryczny kwasowo-ołowiowy, litowo-jonowy, spalinowy LPG/Diesel, ręczny hydrauliczny)",
      "Warunki środowiskowe (praca wewnątrz hal, na zewnątrz, chłodnia/mroźnia, strefy zagrożenia wybuchem EX)",
      "Wymagany korytarz roboczy w zależności od promienia skrętu wózka oraz długości przewożonej palety",
      "Intensywność pracy (liczba zmian roboczych, potrzeba szybkiej wymiany lub doładowywania baterii)",
      "Rodzaj nawierzchni i kół (koła poliuretanowe na gładką posadzkę, superelastyczne lub pneumatyczne na teren nierówny)",
      "Wymagania BHP i wyposażenie dodatkowe (kamery na widłach, radary zbliżeniowe, blue spot, ograniczniki prędkości)",
      "Kompatybilność z istniejącą infrastrukturą (wysokość bram przejazdowych, parametry ramp i doków przeładunkowych)"
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "wozki-widlowe-czolowe",
        relationType: "parent_child",
        priority: 1,
        context: "Klasyczne wózki czołowe z napędem spalinowym lub elektrycznym"
      },
      {
        targetSlug: "wozki-unoszace-i-kompaktowe",
        relationType: "parent_child",
        priority: 2,
        context: "Wózki paletowe elektryczne i ręczne do transportu poziomego"
      },
      {
        targetSlug: "regaly-i-systemy-skladowania",
        relationType: "compatibility",
        priority: 3,
        context: "Systemy regałowe przystosowane do obsługi przez wózki"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Lustra magazynowe, barierki i oznakowanie stref ruchu wózków"
      }
    ]
  },
  "pojemniki-plastikowe-euro": {
    slug: "pojemniki-plastikowe-euro",
    locale: "pl",
    definition: "Pojemniki plastikowe Euro to standaryzowane opakowania transportowo-magazynowe, których wymiary są zoptymalizowane pod kątem modułu logistycznego opartego na wymiarach palety EUR (1200x800 mm). Wykonane z wysokiej gęstości polietylenu (HDPE) lub polipropylenu (PP), zapewniają stabilność wymiarową, odporność chemiczną oraz mechaniczną w trudnych warunkach przemysłowych.",
    applications: [
      "Przechowywanie i transport części na liniach produkcyjnych",
      "Automatyczne magazyny drobnicy (AS/RS, mini-load)",
      "Konfekcjonowanie i kompletacja zamówień w branży e-commerce",
      "Transport produktów spożywczych i farmaceutycznych (wersje z atestem PZH)"
    ],
    decisionFactors: [
      "Wymiary zewnętrzne (standardowe moduły: 400x300, 600x400, 800x600 mm) i wysokość",
      "Konstrukcja ścian i dna (pełne gwarantujące szczelność, perforowane dla wentylacji, wzmocnione do dużych obciążeń)",
      "Rodzaj tworzywa (PP odporny na zarysowania, HDPE odporny na niskie temperatury)",
      "Wymagane akcesoria (pokrywy nakładane, pokrywy na zawiasach, przegrody wewnętrzne)",
      "Przystosowanie do pracy w przenośnikach taśmowych i rolkowych (ciche dno)"
    ],
    technicalParameters: [
      { label: "Standard wymiarowy", value: "Euro (zgodny z DIN EN 13626)" },
      { label: "Dostępne wymiary dna", value: "300x200, 400x300, 600x400, 800x600 mm" },
      { label: "Materiał wykonania", value: "Polipropylen (PP) / Polietylen wysokiej gęstości (HDPE)" },
      { label: "Odporność na temperatury", value: "-20°C do +60°C (PP), -40°C do +70°C (HDPE)" },
      { label: "Maksymalny udźwig", value: "od 15 kg do 50 kg (zależnie od wariantu dna)" },
      { label: "Dno pojemnika", value: "Gładkie, żebrowane, podwójne (wzmocnione)" },
      { label: "Możliwość sztaplowania", value: "Tak (struktura umożliwia stabilne piętrowanie)" }
    ],
    faq: [
      {
        question: "Czy pojemniki Euro nadają się do bezpośredniego kontaktu z żywnością?",
        answer: "Tak, warianty wykonane z dziewiczego surowca HDPE lub PP posiadają certyfikaty dopuszczające do kontaktu z żywnością (atest PZH). Pojemniki wykonane z regranulatów nie powinny być używane do nieopakowanej żywności."
      },
      {
        question: "Czym różni się dno wzmocnione od standardowego?",
        answer: "Dno wzmocnione (żebrowane lub podwójne) zapobiega ugięciu pojemnika pod dużym ciężarem. Jest to kluczowe w automatycznych magazynach przenośnikowych, gdzie ugięcie dna powyżej limitu mogłoby zablokować system rolkowy."
      },
      {
        question: "Czy pojemniki Euro są odporne na oleje i chemikalia?",
        answer: "Tak, polipropylen i polietylen wykazują bardzo wysoką odporność na większość kwasów, zasad, olejów oraz smarów przemysłowych."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-i-kuwety",
        relationType: "parent_child",
        priority: 1,
        context: "Nadrzędna grupa pojemników magazynowych"
      },
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 2,
        context: "Regały półkowe optymalne pod wymiary pojemników Euro"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 3,
        context: "Pojemniki wykorzystywane przy stanowiskach kompletacji"
      }
    ]
  },
  "stoly-pakowe-i-kompletacyjne": {
    slug: "stoly-pakowe-i-kompletacyjne",
    locale: "pl",
    definition: "Stoły pakowe i stanowiska kompletacji to ergonomiczne meble przemysłowe zaprojektowane w celu optymalizacji procesu pakowania przesyłek, weryfikacji zawartości oraz przygotowania towarów do wysyłki. Dzięki modularnej budowie umożliwiają integrację z uchwytami na folię stretch, kartony, wagami oraz systemami IT.",
    applications: [
      "Strefy pakowania i wysyłki w magazynach e-commerce",
      "Stanowiska kontroli jakości na liniach produkcyjnych",
      "Stacje kompletacji w centrach dystrybucyjnych",
      "Punkty nadań przesyłek kurierskich"
    ],
    decisionFactors: [
      "Wymiary blatu roboczego dostosowane do gabarytów pakowanych towarów",
      "Zakres regulacji wysokości (stała, manualna skokowa, płynna elektryczna pod standardy ergonomii)",
      "Wytrzymałość mechaniczna blatu i nośność stelaża",
      "Wyposażenie dodatkowe: nadbudowa z półkami na kartony, uchwyt na folię bąbelkową/stretch, oświetlenie LED, listwy zasilające, uchwyt na monitor i skaner",
      "Integracja z przenośnikami grawitacyjnymi lub napędzanymi"
    ],
    technicalParameters: [
      { label: "Szerokość blatu", value: "1200, 1600, 1800, 2000 mm" },
      { label: "Głębokość blatu", value: "700, 800, 900 mm" },
      { label: "Nośność konstrukcji", value: "do 300 kg (standard), do 600 kg (ciężka)" },
      { label: "Typ blatu", value: "MDF laminowany, blat z gumą olejoodporną, sklejka liściasta" },
      { label: "Regulacja wysokości", value: "Manualna (750-1050 mm) lub elektryczna płynna" },
      { label: "Wykończenie stelaża", value: "Malowanie proszkowe (konstrukcja stalowa)" }
    ],
    inquiryChecklist: {
      description: "Poniższa lista kontrolna dotyczy wyłącznie indywidualnych projektów stanowisk kompletacyjnych i stołów pakowych wykonywanych na wymiar. Pomaga ona dopasować parametry ergonomiczne i osprzęt do specyfiki Państwa procesów:",
      groups: [
        {
          groupLabel: "Stanowisko pracy i ergonomia",
          fields: [
            "Wymagana szerokość i głębokość blatu roboczego (dopasowana do rozmiaru kartonów)",
            "System regulacji wysokości (manualny na śrubach blokujących czy elektryczny sterowany przyciskiem)",
            "Typ pracy na stanowisku (stojąca ciągła, siedząco-stojąca ze stołkiem przemysłowym, siedząca)",
            "Wymagane pokrycie blatu (standardowy laminat melaminowy, gruba sklejka liściasta, guma antystatyczna ESD, mata olejoodporna)"
          ]
        },
        {
          groupLabel: "Proces pakowania i kompletacji",
          fields: [
            "Przewidywany wolumen i typ pakowanych przesyłek (liczba paczek na godzinę)",
            "Maksymalna waga kompletowanych i ważonych na stole pakietów",
            "Sposób podawania towarów do pakowania (z pojemników Euro, bezpośrednio z wózków, z linii przenośników)",
            "Sposób odbioru gotowych paczek (odkładanie na palety, zsuwanie na stół odbiorczy, taśmociąg)"
          ]
        },
        {
          groupLabel: "Konstrukcja stołu i akcesoria",
          fields: [
            "Pożądana konfiguracja półek nadblatowych (półki z przegrodami na kartony, półki na dokumenty)",
            "Systemy dozowania materiałów pakowych (uchwyt dolny/górny na folię bąbelkową, papier falisty, folię stretch)",
            "Wbudowane oprzyrządowanie (zintegrowana waga w blacie, szuflady podblatowe na drobne akcesoria, nożyk przesuwny do folii)",
            "Oświetlenie robocze LED (mocowane na stelażu pionowym z regulacją kąta nachylenia)"
          ]
        },
        {
          groupLabel: "Media i integracja IT",
          fields: [
            "Wymagane uchwyty systemowe dla urządzeń IT (uchwyt VESA na monitor, uchwyt na klawiaturę, półka na drukarkę etykiet)",
            "Zapotrzebowanie na instalacje zasilające i sieciowe (liczba gniazd 230V, gniazda LAN RJ45, porty USB)",
            "Zintegrowane przyłącza pneumatyczne (szybkozłączki do narzędzi na sprężone powietrze)",
            "Kompatybilność z liniami rolkowymi (potrzeba wbudowania blatu kulowego lub rolek kierunkowych)"
          ]
        },
        {
          groupLabel: "Wdrożenie i modularność",
          fields: [
            "Łączna liczba planowanych stanowisk pakowych w danej strefie magazynu",
            "Możliwość przyszłej rekonfiguracji (wymóg modułowej konstrukcji opartej na perforowanych profilach)",
            "Zakres montażu (dostawa stołów zmontowanych czy montaż na obiekcie przez ekipę serwisową)",
            "Planowany harmonogram wdrożenia i oczekiwany termin oddania stanowisk do użytku"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Czy stół pakowy można doposażyć w przyszłości o nowe akcesoria?",
        answer: "Tak, dzięki modułowej konstrukcji perforowanych profili pionowych, większość akcesoriów (półki, uchwyty, oświetlenie) można zamontować lub zmienić ich wysokość w dowolnym momencie."
      },
      {
        question: "Kiedy warto wybrać stół z elektryczną regulacją wysokości?",
        answer: "Elektryczna regulacja jest kluczowa w systemie pracy wielozmianowej, gdzie przy jednym stanowisku pracują osoby o różnym wzroście, lub gdy proces wymaga częstej zmiany pozycji pracy z siedzącej na stojącą w celu zachowania ergonomii."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-plastikowe-euro",
        relationType: "compatibility",
        priority: 1,
        context: "Pojemniki Euro jako standardowe wyposażenie półek stołu pakowego"
      },
      {
        targetSlug: "antresole-i-podesty-magazynowe",
        relationType: "application_context",
        priority: 2,
        context: "Strefy pakowania umieszczane często na antresolach magazynowych"
      }
    ]
  },
  "antresole-i-podesty-magazynowe": {
    slug: "antresole-i-podesty-magazynowe",
    locale: "pl",
    definition: "Antresole magazynowe (podesty robocze) to samonośne konstrukcje stalowe, które pozwalają na pełne wykorzystanie wysokości użytkowej hali poprzez stworzenie dodatkowych poziomów składowania lub stref roboczych. Rozwiązanie to pozwala na zwielokrotnienie powierzchni magazynowej bez konieczności kosztownej rozbudowy bryły budynku.",
    applications: [
      "Wielopoziomowe strefy kompletacji drobnicy (magazyny e-commerce)",
      "Powiększenie powierzchni składowania towarów objętościowych",
      "Strefy montażowe, produkcyjne lub konfekcyjne nad strefą magazynową",
      "Zabudowa biurowa (socjalna) wyniesiona na podest w celu oszczędności miejsca na posadzce"
    ],
    decisionFactors: [
      "Nośność użytkowa pomostu (standardowo od 250 do 1000 kg/m²)",
      "Wysokość użytkowa hali (optymalnie powyżej 5 metrów dla jednego poziomu podestu)",
      "Siatka słupów (rozpiętość konstrukcji stalowej wpływająca na swobodę ruchu pod antresolą)",
      "Parametry posadzki w hali (nośność punktowa stóp słupów antresoli)",
      "Rodzaj poszycia podłogi antresoli (płyta wiórowa P5 wysokiej gęstości, kraty pomostowe zgrzewane)",
      "Przepisy BHP i zabezpieczenia ppoż. (bramki załadowcze siatkowe/wahadłowe, schody z balustradami, instalacja tryskaczowa)"
    ],
    technicalParameters: [
      { label: "Nośność podestu", value: "250 - 1000+ kg/m²" },
      { label: "Materiał konstrukcji", value: "Stal walcowana na gorąco lub profile gięte na zimno" },
      { label: "Standardy projektowe", value: "Zgodność z Eurokodami (PN-EN 1993)" },
      { label: "Typ poszycia", value: "Płyta wiórowa P5, blacha trapezowa z płytą, krata pomostowa (stalowa)" },
      { label: "Wysokość w świetle", value: "Dostosowywana indywidualnie (zazwyczaj min. 2200 mm pod antresolą)" },
      { label: "Zabezpieczenia krawędzi", value: "Balustrady systemowe (barierka kolanowa, krawężnik)" },
      { label: "Bramki załadunkowe", value: "Przesuwne, wahadłowe (bramki bezpieczeństwa śluzy)" }
    ],
    inquiryChecklist: {
      description: "Dla przygotowania kompletnej koncepcji inżynieryjnej, kalkulacji statycznej oraz wyceny budżetowej antresoli magazynowej, prosimy o zebranie i dostarczenie poniższych danych technicznych obiektu:",
      groups: [
        {
          groupLabel: "Wymiary i układ przestrzenny hali",
          fields: [
            "Planowane wymiary zewnętrzne antresoli (szerokość x długość w metrach)",
            "Dokładna wysokość hali w świetle (od poziomu czystej posadzki do najniższego elementu więźby dachowej lub instalacji)",
            "Wymagana wysokość w świetle pod konstrukcją antresoli (wolna przestrzeń dla ruchu ludzi lub wózków)",
            "Lokalizacja podestu w hali (wolnostojący, w narożniku, przylegający do jednej lub kilku ścian)",
            "Wszelkie przeszkody budowlane lub instalacyjne w strefie montażu (słupy hali, centrale wentylacyjne, rury ppoż., bramy)"
          ]
        },
        {
          groupLabel: "Nośność posadzki i wymagania obciążeń",
          fields: [
            "Pożądane dopuszczalne obciążenie użytkowe podłogi antresoli (np. 300, 500, 800 czy ponad 1000 kg/m²)",
            "Rodzaj planowanego składowania na podeście (regały półkowe, towary na paletach, ruch ręcznych wózków paletowych)",
            "Dopuszczalna nośność posadzki hali (grubość płyty żelbetowej, dopuszczalny nacisk punktowy stopy słupa w kN)",
            "Sposób kotwienia konstrukcji do podłoża (czy posadzka posiada ogrzewanie podłogowe, instalacje podziemne)",
            "Występowanie specyficznych obciążeń punktowych (np. ciężkie maszyny, szafy sterownicze, wózki widłowe)"
          ]
        },
        {
          groupLabel: "Konstrukcja, wyposażenie i dostęp",
          fields: [
            "Preferowany rozstaw słupów nośnych (wymagany szeroki rozstaw dla swobody ruchu na dole czy dopuszczalny rozstaw gęstszy)",
            "Liczba klatek schodowych i ich preferowane usytuowanie ze względów ewakuacyjnych",
            "Rodzaj poszycia podłogi (standardowa płyta wiórowa P5 antypoślizgowa, krata stalowa zgrzewana z oczkiem, blacha ryflowana)",
            "Liczba miejsc wyładunkowych na palety (miejsca odbioru ładunków z wózka widłowego)",
            "Typ bramki bezpieczeństwa w punkcie odbioru palet (śluza wahadłowa kołyskowa chroniąca operatora, bramka przesuwna, łańcuch ochronny)"
          ]
        },
        {
          groupLabel: "Bezpieczeństwo, ppoż. i formalności",
          fields: [
            "Wymagane barierki i balustrady ochronne (standardowa wysokość 1100 mm, krawężnik przypodłogowy, barierka kolanowa)",
            "Wymagania ochrony przeciwpożarowej (klasa odporności ogniowej konstrukcji R30, R60 lub brak wymogu)",
            "Integracja z instalacjami bezpieczeństwa (potrzeba wykonania instalacji tryskaczowej pod antresolą, montaż oświetlenia awaryjnego)",
            "Weryfikacja dróg ewakuacyjnych i odległości do wyjść ewakuacyjnych z poziomów antresoli",
            "Czy projekt wymaga uzgodnienia z rzeczoznawcą ds. zabezpieczeń ppoż. oraz BHP przed montażem"
          ]
        },
        {
          groupLabel: "Operacje i warunki wdrożenia",
          fields: [
            "Planowany tryb pracy na antresoli (jednozmianowy, wielozmianowy o wysokim natężeniu)",
            "Możliwość prowadzenia prac montażowych w trakcie normalnego funkcjonowania magazynu (etapowanie montażu)",
            "Dostępność przestrzeni do rozładunku i składowania elementów konstrukcyjnych przed i w trakcie montażu",
            "Wymóg użycia specjalistycznego sprzętu do montażu (np. wózki widłowe, podnośniki nożycowe o określonym napędzie)",
            "Oczekiwany termin rozpoczęcia prac instalacyjnych i planowana data uruchomienia operacyjnego antresoli"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Czy budowa antresoli wymaga pozwolenia na budowę?",
        answer: "Samonośne podesty magazynowe kotwione wyłącznie do posadzki są traktowane jako urządzenia/konstrukcje wyposażenia wnętrza. Zazwyczaj nie wymagają pozwolenia na budowę w rozumieniu prawa budowlanego (nie zmieniają kubatury obiektu), o ile nie ingerują w konstrukcję nośną samej hali. Wymagane jest jednak zgłoszenie i zatwierdzenie projektu pod kątem BHP oraz przepisów ppoż."
      },
      {
        question: "Jakie poszycie podłogi antresoli jest najlepsze?",
        answer: "Najpopularniejszym i najbardziej ekonomicznym rozwiązaniem jest gęsta płyta wiórowa P5 (często z białym spodem odbijającym światło). W przypadku surowych wymogów ppoż. stosuje się stalowe kraty pomostowe (umożliwiające przenikanie wody z tryskaczy dachowych) lub blachę trapezową pokrytą płytą ogniochronną."
      },
      {
        question: "Czy na antresoli można jeździć ręcznymi wózkami paletowymi?",
        answer: "Tak, pod warunkiem zaprojektowania antresoli na odpowiednie obciążenia dynamiczne i punktowe (zazwyczaj min. 500 kg/m² oraz odpowiednie poszycie odporne na nacisk kół wózka, np. płyta P5 pokryta blachą lub sklejką)."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 1,
        context: "Regały półkowe instalowane na poziomach antresoli"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 2,
        context: "Stanowiska kompletacji umieszczane na antresoli"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 3,
        context: "Balustrady ochronne, siatki zabezpieczające i wygrodzenia"
      }
    ]
  }
};
