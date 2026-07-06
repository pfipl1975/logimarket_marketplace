import type { CategoryContentMap } from "./types";

export const deCategoryContent: CategoryContentMap = {
  "regaly-i-systemy-skladowania": {
    slug: "regaly-i-systemy-skladowania",
    locale: "de",
    definition: "Regalsysteme und Lagerkonstruktionen bilden eine grundlegende intralogistische Infrastruktur für die sichere und organisierte Lagerung von Waren auf verschiedenen Höhenebenen. Diese Systeme werden an die Eigenschaften der Ladeeinheiten, die Rotationsanforderungen sowie die technischen Spezifikationen der Lagerhalle angepasst.",
    applications: [
      "Hochregallager und Distributionszentren",
      "Pufferzonen an Produktionslinien",
      "Kühl- und Tiefkühllager (erfordern Platzoptimierung)",
      "Großhandelslager und Firmenarchive"
    ],
    decisionFactors: [
      "Art der gelagerten Ladeeinheiten (EUR-Paletten, Industriepaletten, Langgut, Kartons, Sonderteile)",
      "Maximale Tragfähigkeit pro Lagerebene und maximale Belastbarkeit der Regalsäule",
      "Erforderliches Rotationsprinzip der Waren (LIFO - z. B. Einfahrregale, FIFO - z. B. Durchlaufregale, Mehrplatzregale)",
      "Abmessungen der Lagerhalle, einschließlich lichter Höhe, Stützenraster und Bodenbelastbarkeit",
      "Arbeitsgangbreite (AST) und Kompatibilität mit Schubmaststaplern, VNA-Schmalgangstaplern oder Frontstaplern",
      "Anforderungen an die Arbeitssicherheit (Anfahrschutz, Rückgitterpaneele, Sicherheitszäune)",
      "Bedarf an zukünftiger Regalerweiterung oder Integration mit Lagerautomatisierung",
      "Technischer Zustand und Dehnungsfugen der Betonbodenplatte, die die Fußplattenverankerung beeinflussen",
      "Feuerwiderstandsklasse der Stahlbauteile und Anforderungen an Sprinkleranlagen (ESFR)",
      "Einfluss von Montagetoleranzen und Lotabweichungen der Stützen auf die Tragwerksstabilität nach DIN EN 15620"
    ],
    technicalParameters: [
      { label: "Planungsnormen", value: "Konform mit DIN EN 15620 / DIN EN 15635" },
      { label: "Maximale Bauhöhe", value: "Bis zu 30+ Meter (in Silobauweise / dach- und wandgetragenen Systemen)" },
      { label: "Zulässige Trägerdurchbiegung", value: "L/200 (nach FEM-Richtlinien)" },
      { label: "Schutzbeschichtung", value: "Pulverbeschichtet (Epoxid-Polyester) / Feuerverzinkt (HDG)" }
    ],
    faq: [
      {
        question: "Wie oft müssen Experteninspektionen von Lagerregalen durchgeführt werden?",
        answer: "Gemäß der DIN EN 15635 müssen Experteninspektionen durch einen zertifizierten Prüfer mindestens alle 12 Monate durchgeführt werden. Zusätzlich sind wöchentliche interne Sichtprüfungen durch den Sicherheitsbeauftragten für Regale (PRSES) erforderlich."
      },
      {
        question: "Was bedeuten die Schadenstufen bei Regalen (grün, orange, rot)?",
        answer: "Die Schadenstufen definieren den Deformationsgrad. Grün bedeutet Verformung innerhalb der Toleranz (weiterer Betrieb zulässig). Orange bedeutet Beschädigung, die bei nächster Gelegenheit behoben werden muss (kein Wiederbeladen nach Entladung). Rot bedeutet eine kritische Einsturzgefahr — das Regalfeld muss sofort entladen und gesperrt werden."
      },
      {
        question: "Ist der Einsatz von Gitterrostböden in Palettenregalen zulässig?",
        answer: "Ja, Gitterrostböden (Auflagegitter) werden häufig eingesetzt, um die Lagerung von Sonderladehilfsmitteln zu ermöglichen oder das Herabfallen von Einzelkartons zu verhindern. Sie sind auch brandschutztechnisch vorteilhaft, da das Löschwasser von Sprinklern ungehindert durchfließen kann."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-paletowe",
        relationType: "parent_child",
        priority: 1,
        context: "Hauptgruppe der Regalsysteme für die Palettenlagerung"
      },
      {
        targetSlug: "regaly-polkowe-i-antresole",
        relationType: "parent_child",
        priority: 2,
        context: "Lösungen für Kleinteilelagerung und mehrstöckige Lagerung"
      },
      {
        targetSlug: "wozki-i-transport-wewnetrzny",
        relationType: "application_context",
        priority: 3,
        context: "Geräte zur Bedienung von Regalsystemen"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Sicherheitsschutzvorrichtungen, die nach Arbeitsschutzstandards für Regale erforderlich sind"
      }
    ]
  },
  "wozki-i-transport-wewnetrzny": {
    slug: "wozki-i-transport-wewnetrzny",
    locale: "de",
    definition: "Flurförderzeuge und Geräte für den innerbetrieblichen Transport sind Maschinen zur Bewegung, zum Heben und Stapeln von Ladeeinheiten in Logistik- und Produktionsanlagen. Sie reichen von einfachen manuellen Handhubwagen bis hin zu fortschrittlichen mechanischen Gabelstaplern und fahrerlosen Transportsystemen (AGV).",
    applications: [
      "Entladen und Beladen von Transporteinheiten an Verladedocks",
      "Horizontaler Transport von Waren über lange Strecken in Hallen",
      "Bedienung von Hochregalsystemen (Schubmaststapler, VNA)",
      "Kommissionierung in niedrigen und hohen Lagerzonen",
      "Versorgung von Produktionslinien mit Komponenten"
    ],
    decisionFactors: [
      "Maximales Ladegewicht (Nenntragfähigkeit und Resttragfähigkeit bei maximaler Hubhöhe) und Ladeabmessungen",
      "Antriebsart (Blei-Säure-Elektro, Lithium-Ionen, LPG/Diesel-Verbrennung, manuell-hydraulisch)",
      "Umgebungsbedingungen (Inneneinsatz, Außeneinsatz, Kühllager/Tiefkühllager, explosionsgeschützte EX-Zonen)",
      "Erforderlicher Arbeitsgang basierend auf dem Wenderadius des Gabelstaplers und der Länge der transportierten Palette",
      "Arbeitsintensität (Anzahl der Schichten, Bedarf an schnellem Batteriewechsel oder Gelegenheitsladung)",
      "Oberflächenbeschaffenheit und Räder (Polyurethanräder für glatte Böden, elastische Vollgummi- oder Luftreifen für unebenes Gelände)",
      "Arbeitsschutzanforderungen und Zusatzausrüstung (Gabelkameras, Abstandsradare, Blue Spot, Geschwindigkeitsbegrenzer)",
      "Kompatibilität mit bestehender Infrastruktur (Durchfahrtshöhe von Toren, Parameter von Verladedocks und Rampen)",
      "Verfügbarkeit des Garantieservices, Service-Reaktionszeiten (SLA) und Zugang zu Originalersatzteilen",
      "Gesamtbetriebskosten (TCO), einschließlich Energieverbrauch, Ladezyklen und vorgeschriebenen UDT-Wartungsprüfungen"
    ],
    technicalParameters: [
      { label: "Tragfähigkeit", value: "von 1000 kg bis 8000+ kg (je nach Staplerklasse)" },
      { label: "Batteriestandard", value: "Blei-Säure (PzS) / Lithium-Ionen (Li-Ion, Schnellladung unterstützt)" },
      { label: "Hubhöhe", value: "Bis zu 13+ Meter (für Schubmaststapler und VNA-Schmalganggeräte)" },
      { label: "Sicherheitsnorm", value: "Konform mit DIN EN ISO 3691-1" }
    ],
    faq: [
      {
        question: "Wann lohnt sich der Umstieg von Blei-Säure-Batterien auf Lithium-Ionen-Technologie (Li-Ion)?",
        answer: "Die Li-Ion-Technologie eignet sich ideal for den intensiven Mehrschichtbetrieb. Sie ermöglicht schnelles Zwischenladen (z. B. in Pausen), benötigt keine speziellen Batterieladeräume (keine Gasung) und ist wartungsfrei. Blei-Säure-Batterien erfordern dagegen 8 Stunden Ladezeit und 8 Stunden Abkühlung."
      },
      {
        question: "Was ist der Unterschied zwischen einem Schubmaststapler und einem Frontstapler?",
        answer: "Ein Schubmaststapler besitzt ein vorschubfähiges Hubgerüst, wodurch er in sehr engen Gängen (oft unter 2,9 m) arbeiten kann. Klassische Frontstapler benötigen breitere Gänge (3,5 - 4,0 m), sind aber universeller im Außenbereich, bei der Lkw-Verladung und auf unebenem Gelände einsetzbar."
      },
      {
        question: "Welche Sicherheitsvorrichtungen sind für Stapler im Mischbetrieb mit Fußgängern ratsam?",
        answer: "Empfehlenswert sind optische Warnsysteme (wie Blue Spot oder rote Sicherheitszonen-Lichtlinien auf dem Boden), akustische Rückfahrwarner, Geschwindigkeitsbegrenzer und aktive Personenerkennungskameras, die den Stapler automatisch abbremsen."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "wozki-widlowe-czolowe",
        relationType: "parent_child",
        priority: 1,
        context: "Klassische Frontgabelstapler mit Verbrennungs- oder Elektroantrieb"
      },
      {
        targetSlug: "wozki-unoszace-i-kompaktowe",
        relationType: "parent_child",
        priority: 2,
        context: "Elektrische und manuelle Hubwagen für den horizontalen Transport"
      },
      {
        targetSlug: "regaly-i-systemy-skladowania",
        relationType: "compatibility",
        priority: 3,
        context: "Für den Staplerbetrieb ausgelegte Regalsysteme"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Sicherheitsspiegel, Schutzgeländer und Verkehrszonenmarkierung für Stapler"
      }
    ]
  },
  "pojemniki-plastikowe-euro": {
    slug: "pojemniki-plastikowe-euro",
    locale: "de",
    definition: "Euro-Kunststoffbehälter sind standardisierte Transport- und Lagerverpackungen, deren Abmessungen für das Logistikmodul auf Basis der EUR-Palettenabmessungen (1200x800 mm) optimiert sind. Hergestellt aus hochdichtem Polyethylen (HDPE) oder Polypropylen (PP) bieten sie Maßhaltigkeit, chemische Beständigkeit und mechanische Haltbarkeit unter rauen Industriebedingungen.",
    applications: [
      "Lagerung und Transport von Teilen an Produktionslinien",
      "Automatische Kleinteilelager (AKL, Mini-Load)",
      "Auftragskommissionierung im E-Commerce-Bereich",
      "Transport von Lebensmitteln und pharmazeutischen Produkten (lebensmittelechte zertifizierte Versionen)"
    ],
    decisionFactors: [
      "Außenmaße (Standardmodule: 400x300, 600x400, 800x600 mm) und Höhe",
      "Wand- und Bodengestaltung (geschlossen zur Rückhaltung, perforiert zur Belüftung, verstärkt für schwere Lasten)",
      "Materialart (kratzfestes PP, temperaturbeständiges HDPE)",
      "Erforderliches Zubehör (Auflagedeckel, Scharnierdeckel, Trennwände)",
      "Anpassung für den Einsatz auf Förderbändern und Rollenbahnen (leiser Boden)"
    ],
    technicalParameters: [
      { label: "Standardspezifikation", value: "Euro (konform mit DIN EN 13626)" },
      { label: "Verfügbare Bodenmaße", value: "300x200, 400x300, 600x400, 800x600 mm" },
      { label: "Material", value: "Polypropylen (PP) / Polyethylen hoher Dichte (HDPE)" },
      { label: "Temperaturbeständigkeit", value: "-20°C bis +60°C (PP), -40°C bis +70°C (HDPE)" },
      { label: "Maximale Tragfähigkeit", value: "von 15 kg bis 50 kg (je nach Bodenvariante)" },
      { label: "Behälterboden", value: "Glatt, gerippt, doppelt (verstärkt)" },
      { label: "Stapelfähigkeit", value: "Ja (Konstruktion ermöglicht stabiles Stapeln)" },
      { label: "Antistatische Ausführungen (ESD)", value: "Verfügbar (mit Oberflächenwiderstand 10^3 - 10^10 Ohm)" },
      { label: "Kennzeichnungsoptionen", value: "RFID / Barcode I2of5 / Laser-Logogravur" }
    ],
    faq: [
      {
        question: "Sind Euro-Behälter für den direkten Kontakt mit Lebensmitteln geeignet?",
        answer: "Ja, Varianten aus reinem HDPE- oder PP-Rohmaterial verfügen über Zertifikate für den Lebensmittelkontakt. Behälter aus recycelten Kunststoffen (Regranulate) sollten nicht für unverpackte Lebensmittel verwendet werden."
      },
      {
        question: "Was ist der Unterschied zwischen einem verstärkten Boden und einem Standardboden?",
        answer: "Ein verstärkter Boden (gerippt oder doppelt) verhindert das Durchbiegen des Behälters bei schweren Lasten. Dies ist in automatischen Förderlagern von entscheidender Bedeutung, da ein Durchbiegen des Bodens über Grenzwerte das Rollensystem blockieren könnte."
      },
      {
        question: "Sind Euro-Behälter beständig gegen Öle und Chemikalien?",
        answer: "Ja, Polypropylen und Polyethylen weisen eine sehr hohe Beständigkeit gegenüber den meisten Säuren, Laugen, Ölen und Industriefetten auf."
      },
      {
        question: "Sind Euro-Behälter recycelbar?",
        answer: "Ja, die Behälter bestehen aus sortenreinen Thermoplasten (HDPE oder PP), was ein 100%iges stoffliches Recycling ermöglicht. Beschädigte oder ausgemusterte Behälter können geschreddert und zu neuem Industrieregranulat verarbeitet werden."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-i-kuwety",
        relationType: "parent_child",
        priority: 1,
        context: "Elterngruppe der Lagerbehälter"
      },
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 2,
        context: "Für Eurobehälter optimierte Fachbodenregale"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 3,
        context: "Behälter für den Einsatz an Kommissionier- und Packstationen"
      }
    ]
  },
  "stoly-pakowe-i-kompletacyjne": {
    slug: "stoly-pakowe-i-kompletacyjne",
    locale: "de",
    definition: "Packtische und Kommissionierarbeitsplätze sind ergonomische Industriemöbel zur Optimierung des Prozesses der Paketverpackung, Inhaltsprüfung und Versandvorbereitung. Ihr modularer Aufbau ermöglicht die Integration von Stretchfolienhaltern, Kartonablagen, Waagen und IT-Systemen.",
    applications: [
      "Pack- und Versandbereiche in E-Commerce-Lagern",
      "Qualitätskontrollstationen an Produktionslinien",
      "Kommissionierstationen in Distributionszentren",
      "Paketabgabestellen von Kurierdiensten"
    ],
    decisionFactors: [
      "Arbeitsplattenabmessungen, angepasst an die Größe der verpackten Waren",
      "Höhenverstellbereich (fest, manuell stufenweise, stufenlos elektrisch nach ergonomischen Standards)",
      "Mechanische Haltbarkeit der Arbeitsplatte und Tragfähigkeit des Rahmens",
      "Zusatzausstattung: obere Ablagen für Kartons, Luftpolsterfolien-/Stretchfolienhalter, LED-Arbeitsplatzbeleuchtung, Steckdosenleisten, Monitor- und Scannerhalterung",
      "Integration mit Schwerkraft- oder angetriebenen Rollenbahnen"
    ],
    technicalParameters: [
      { label: "Arbeitsplattenbreite", value: "1200, 1600, 1800, 2000 mm" },
      { label: "Arbeitsplattentiefe", value: "700, 800, 900 mm" },
      { label: "Rahmentragfähigkeit", value: "bis zu 300 kg (Standard), bis zu 600 kg (Schwerlast)" },
      { label: "Arbeitsplattentyp", value: "MDF laminiert, Arbeitsplatte mit ölbeständigem Gummi, Hartholz-Multiplexplatte" },
      { label: "Höhenverstellung", value: "Manuell (750-1050 mm) oder stufenlos elektrisch" },
      { label: "Rahmenfinish", value: "Pulverbeschichtet (Stahlkonstruktion)" },
      { label: "ESD-Schutz", value: "Optional (geerdete Arbeitsplatten und Gestell nach DIN EN 61340-5-1)" },
      { label: "Ergonomie-Zertifizierung", value: "Konstruktion konform mit DIN EN ISO 6385 Standards" }
    ],
    inquiryChecklist: {
      description: "Die folgende Checkliste gilt nur für kundenspezifische, individuelle Designs von Packtischen und Kommissionierstationen. Sie hilft, ergonomische Parameter und Ausstattung auf Ihre spezifischen Lagerprozesse abzustimmen:",
      groups: [
        {
          groupLabel: "Arbeitsplatz und Ergonomie",
          fields: [
            "Erforderliche Breite und Tiefe der Arbeitsplatte (angepasst an Kartongrößen)",
            "Höhenverstellsystem (manuell mit Feststellbolzen oder elektrisch mit Tastersteuerung)",
            "Arbeitsart am Arbeitsplatz (kontinuierliches Stehen, Steh-Sitz mit Industriestuhl, Sitzen)",
            "Erforderliche Arbeitsplattenabdeckung (Standard-Melaminlaminat, dicke Multiplexplatte, antistatisches ESD-Gummi, ölbeständige Matte)"
          ]
        },
        {
          groupLabel: "Verpackungs- und Kommissionierprozess",
          fields: [
            "Erwartetes Volumen und Art der verpackten Sendungen (Anzahl der Pakete pro Stunde)",
            "Maximales Gewicht der am Tisch zusammengestellten und gewogenen Pakete",
            "Art der Warenzuführung zur Station (aus Eurobehältern, direkt von Wagen, von Förderbändern)",
            "Art des Abtransports fertiger Pakete (Stapeln auf Paletten, Schieben auf Abgabetisch, Förderband)"
          ]
        },
        {
          groupLabel: "Tischstruktur und Zubehör",
          fields: [
            "Gewünschte Konfiguration oberer Ablagen (Ablagen mit Kartontrennern, Ablagen für Dokumente)",
            "Spendersysteme für Verpackungsmaterialien (unterer/oberer Halter für Luftpolsterfolie, Wellpappe, Stretchfolie)",
            "Eingebaute Ausstattung (integrierte Waage in der Arbeitsplatte, Schubladen für Kleinzubehör, Schiebeschneider für Folie)",
            "LED-Arbeitsplatzbeleuchtung (montiert am vertikalen Rahmen mit Winkelverstellung)"
          ]
        },
        {
          groupLabel: "Versorgungsanschlüsse und IT-Integration",
          fields: [
            "Erforderliche Systemhalterungen für IT-Geräte (VESA-Monitorhalterung, Tastaturhalterung, Ablage für Etikettendrucker)",
            "Anforderungen an Strom- und Netzwerkinstallation (Anzahl der 230V-Steckdosen, RJ45-LAN-Steckdosen, USB-Ports)",
            "Integrierte pneumatische Anschlüsse (Schnellkupplungen für Druckluftwerkzeuge)",
            "Kompatibilität mit Rollenbahnen (Notwendigkeit des Einbaus eines Kugelgewindetisches oder von Richtungsrollen)"
          ]
        },
        {
          groupLabel: "Implementierung und Modularität",
          fields: [
            "Gesamtzahl geplanter Packstationen in der jeweiligen Lagerzone",
            "Möglichkeit zukünftiger Rekonfiguration (Anforderung an modulare Struktur auf Basis gelochter Profile)",
            "Montageumfang (Lieferung vormontierter Tische oder Montage vor Ort durch das Serviceteam)",
            "Geplanter Implementierungszeitplan und erwartetes Inbetriebnahme-Datum der Arbeitsplätze"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Kann der Packtisch in Zukunft mit neuem Zubehör nachgerüstet werden?",
        answer: "Ja, dank des modularen Designs der vertikalen gelochten Profile kann das meiste Zubehör (Ablagen, Halterungen, Beleuchtung) jederzeit installiert oder in der Höhe angepasst werden."
      },
      {
        question: "Wann lohnt sich die Wahl eines Tisches mit elektrischer Höhenverstellung?",
        answer: "Die elektrische Verstellung ist der Schlüssel in Schichtarbeitsumgebungen, in denen Personen unterschiedlicher Größe an einer Station arbeiten, oder wenn der Prozess häufige Wechsel von sitzender zu stehender Position erfordert, um die Ergonomie zu wahren."
      },
      {
        question: "Wann sind Packtische in ESD-Ausführung (antistatisch) erforderlich?",
        answer: "Eine ESD-Ausführung ist beim Verpacken und Kommissionieren von elektronischen Bauteilen, Mikroprozessoren und empfindlichen Messgeräten zwingend erforderlich. Die geerdete ESD-Arbeitsplatte und die ableitfähige Pulverbeschichtung schützen die Elektronik vor Schäden durch elektrostatische Entladungen."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-plastikowe-euro",
        relationType: "compatibility",
        priority: 1,
        context: "Eurobehälter als Standardausstattung von Packtischablagen"
      },
      {
        targetSlug: "antresole-i-podesty-magazynowe",
        relationType: "application_context",
        priority: 2,
        context: "Packbereiche werden häufig auf Lagerbühnen platziert"
      }
    ]
  },
  "antresole-i-podesty-magazynowe": {
    slug: "antresole-i-podesty-magazynowe",
    locale: "de",
    definition: "Lagerbühnen (Arbeitsbühnen) sind selbsttragende Stahlkonstruktionen, die durch die Schaffung zusätzlicher Lagerebenen oder Arbeitszonen eine vollständige Nutzung der lichten Höhe einer Halle ermöglichen. Diese Lösung vervielfacht die Lagerfläche, ohne dass eine teure Gebäudeerweiterung erforderlich ist.",
    applications: [
      "Mehrstöckige Kleinteile-Kommissionierzonen (E-Commerce-Lager)",
      "Vergrößerung der Lagerfläche für sperrige Güter",
      "Montage-, Produktions- oder Verpackungszonen oberhalb der Hauptlagerebene",
      "Büro- oder Sozialräume auf einer Bühne angehoben, um Platz im Erdgeschoss zu sparen"
    ],
    decisionFactors: [
      "Gleichmäßige Tragfähigkeit der Plattform (typischerweise von 250 bis 1000 kg/m²)",
      "Lichte Höhe der Halle (optimal über 5 Meter für eine einzelne Bühnenebene)",
      "Stützenraster (Spannweite der Stahlkonstruktion, die die Bewegungsfreiheit unter der Bühne beeinflusst)",
      "Bodenplattenparameter in der Halle (Punkttragfähigkeit der Stützenfußplatten der Lagerbühne)",
      "Bühnenbodenbelagstyp (hochdichte P5-Spanplatte, geschweißte Gitterroste)",
      "Arbeitsschutz- und Brandschutzvorschriften (Gitter-/Schwenkschleusen, Treppen mit Handläufen, Sprinkleranlage)"
    ],
    technicalParameters: [
      { label: "Bühnentragfähigkeit", value: "250 - 1000+ kg/m²" },
      { label: "Strukturmaterial", value: "Warmgewalzter Stahl oder kaltgeformte Stahlprofile" },
      { label: "Designstandards", value: "Konform mit Eurocode (EN 1993)" },
      { label: "Bodenbelagstyp", value: "P5-Spanplatte, Trapezblech mit Platte, Stahlgitterrost" },
      { label: "Lichte Höhe", value: "Individuell angepasst (typischerweise mind. 2200 mm unter der Bühne)" },
      { label: "Kantenschutz", value: "Systemgeländer (Handlauf, Knieleiste, Fußleiste)" },
      { label: "Ladeschleusen", value: "Schiebe-, Kippschleusen (Sicherheitsschleusen zum Schutz des Bedieners)" },
      { label: "Ausführungsklasse (EXC)", value: "EXC2 (nach DIN EN 1090-2)" },
      { label: "Montageschrauben", value: "Güte 8.8 / 10.9 (hochfeste planmäßig vorspannbare Schraubenverbindungen)" }
    ],
    inquiryChecklist: {
      description: "Für die Erstellung eines vollständigen Engineering-Konzepts, statischer Berechnungen und einer Budgetkalkulation der Lagerbühne sammeln und übermitteln Sie bitte die folgenden technischen Projektdaten:",
      groups: [
        {
          groupLabel: "Abmessungen und räumliche Aufteilung der Halle",
          fields: [
            "Geplante Außenmaße der Lagerbühne (Breite x Länge in Metern)",
            "Genaue lichte Höhe der Halle (vom fertigen Fußboden bis zum niedrigsten Element der Dachkonstruktion oder der Installationen)",
            "Erforderliche lichte Höhe unter der Bühnenkonstruktion (freier Raum für Fußgänger- oder Staplerverkehr)",
            "Bühnenstandort in der Halle (freistehend, in einer Ecke, an einer oder mehreren Wänden anliegend)",
            "Jegliche Bau- oder Installationshindernisse im Montagebereich (Hallensäulen, Lüftungsgeräte, Löschwasserrohre, Tore)"
          ]
        },
        {
          groupLabel: "Bodenplattentragfähigkeit und Lastanforderungen",
          fields: [
            "Gewünschte gleichmäßige Tragfähigkeit des Bühnenbodens (z. B. 300, 500, 800 oder über 1000 kg/m²)",
            "Art der geplanten Lagerung auf der Plattform (Fachbodenregale, palettierte Waren, manueller Hubwagenverkehr)",
            "Zulässige Tragfähigkeit der Hallenbodenplatte (Dicke der Betonplatte, zulässige Punktlast der Stützenfußplatte in kN)",
            "Verankerungsmethode der Struktur im Boden (verfügt der Boden über Fußbodenheizung, unterirdische Installationen)",
            "Auftreten spezifischer Punktlasten (z. B. schwere Maschinen, Schaltschränke, Gabelstapler)"
          ]
        },
        {
          groupLabel: "Struktur, Ausstattung und Zugang",
          fields: [
            "Bevorzugter Abstand der Stützpfeiler (ist eine große Spannweite für Bewegungsfreiheit unten erforderlich oder ist ein dichteres Raster akzeptabel)",
            "Anzahl der Treppenhäuser und deren bevorzugte Lage aus Evakuierungsgründen",
            "Bühnenbodenbelag (standardmäßige rutschhemmende P5-Spanplatte, geschweißter Stahlgitterrost, Riffelblech)",
            "Anzahl der Palettenübergabebereiche (Lieferstellen für Lasten von einem Gabelstapler)",
            "Art des Sicherheitstors am Palettenübergabebereich (Kippschleuse/Knickschleuse zum Schutz des Bedieners, Schiebetor, Sicherheitskette)"
          ]
        },
        {
          groupLabel: "Sicherheit, Brandschutz und Formalitäten",
          fields: [
            "Erforderliche Sicherheitsbarrieren und Geländer (Standardhöhe 1100 mm, Fußleiste, Knieleiste)",
            "Brandschutzanforderungen (Feuerwiderstandsklasse der Konstruktion R30, R60 oder keine Anforderung)",
            "Integration mit Sicherheitsinstallationen (Notwendigkeit einer Sprinkleranlage unter der Plattform, Notbeleuchtung)",
            "Überprüfung der Fluchtwege und Entfernungen zu Notausgängen von den Bühnenebenen",
            "Erfordert das Design vor der Installation die Freigabe durch einen Arbeitsschutz- und Brandschutzexperten"
          ]
        },
        {
          groupLabel: "Betriebs- und Montagebedingungen",
          fields: [
            "Geplantes Schichtarbeitsmuster auf der Bühne (Einschicht-, Mehrschichtbetrieb mit hoher Intensität)",
            "Möglichkeit der Durchführung von Installationsarbeiten während des normalen Lagerbetriebs (phasenweise Montage)",
            "Verfügbarkeit von Platz zum Entladen und Lagern von Bauelementen vor und während der Installation",
            "Anforderung zur Verwendung von Spezialausrüstung für die Installation (z. B. Gabelstapler, Scherenbühnen mit bestimmtem Antrieb)",
            "Erwartetes Startdatum der Installationsarbeiten und geplantes Datum der Inbetriebnahme der Bühne"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Erfordert der Bau einer Lagerbühne eine Baugenehmigung?",
        answer: "Selbsttragende, nur auf der Bodenplatte verankerte Lagerbühnen werden als Inneneinrichtungen/Konstruktionen behandelt. Sie erfordern in der Regel keine Baugenehmigung im Sinne des Baurechts (sie verändern die Gebäudehülle nicht), solange sie nicht in die tragende Struktur der Halle eingreifen. Eine Anzeige und Projektfreigabe durch Arbeitsschutz- und Brandschutzexperten ist jedoch erforderlich."
      },
      {
        question: "Welcher Bühnenbodenbelag ist am besten?",
        answer: "Die beliebteste und wirtschaftlichste Lösung ist eine hochdichte P5-Spanplatte (oft mit weißer Unterseite zur Lichtreflexion). Für strenge Brandschutzanforderungen werden Gitterroste (die das Durchdringen von Wasser aus Dachsprinklern ermöglichen) oder Trapezbleche mit einer feuerfesten Platte verwendet."
      },
      {
        question: "Können manuelle Hubwagen auf der Bühne betrieben werden?",
        answer: "Ja, vorausgesetzt, die Bühne ist für entsprechende dynamische und Punktlasten ausgelegt (in der Regel mind. 500 kg/m² und ein entsprechender Belag, der gegen Raddruck beständig ist, z. B. P5-Platte mit Blech- oder Sperrholzabdeckung)."
      },
      {
        question: "Welche Sicherheitsübergabestationen (Schleusen) werden auf Lagerbühnen empfohlen?",
        answer: "Empfohlen werden kippbare Palettenschleusen (Cargoschleusen). Sie funktionieren nach dem Gegengewichtsprinzip: Ist die Schleuse zum Stapler hin geöffnet, sperrt eine Barriere den Zugang für den Mitarbeiter. Nach dem Umschwenken kann die Palette sicher entnommen werden, während die Bühnenkante zum Hallenboden hin geschlossen ist."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 1,
        context: "Auf Lagerbühnen installierte Fachbodenregale"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 2,
        context: "Auf der Bühne platzierte Kommissionier- und Packstationen"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 3,
        context: "Schutzgeländer, Maschenschutzzäune und Geländersysteme"
      }
    ]
  },
  "osprzet-do-wozkow-widlowych":   {
    "slug": "osprzet-do-wozkow-widlowych",
    "locale": "de",
    "definition": "Anbaugeräte für Gabelstapler sind wechselbare Geräte an der Gabelträgerplatte oder direkt auf den Gabelzinken. Sie erweitern den Stapler über das reine Palettenhandling hinaus. Die Beschaffung muss FEM-Klasse, Resttragfähigkeit, Hydraulik und Lastart berücksichtigen.",
    "applications": [
      "Handling nicht palettierter Lasten",
      "Präzises Positionieren in Regalen und an Rampen",
      "Entleeren von Behältern und Prozesscontainern",
      "Service- und Instandhaltungsarbeiten im Lager"
    ],
    "decisionFactors": [
      "ISO/FEM-Klasse und Resttragfähigkeit",
      "Montageart: Gabelträger, Gabelzinken oder Adapter",
      "Hydraulikanforderungen und verfügbare Zusatzkreise",
      "Lastart: palettiert, zylindrisch, empfindlich, instabil oder Schüttgut",
      "Eigengewicht und Auswirkung auf die Standsicherheit"
    ],
    "inquiryChecklist": {
      "description": "Eine Anfrage für Stapleranbaugeräte sollte sowohl den Stapler als auch die Last beschreiben.",
      "groups": [
        {
          "groupLabel": "Basisstapler",
          "fields": [
            "Hersteller, Modell und Nenntragfähigkeit",
            "ISO/FEM-Klasse und Hubhöhe",
            "Verfügbare Hydraulikkreise und Schlauchführung"
          ]
        },
        {
          "groupLabel": "Last und Prozess",
          "fields": [
            "Gewicht, Abmessungen und Schwerpunkt der Last",
            "Palettiert, zylindrisch, empfindlich, Schüttgut oder instabil",
            "Operation: Verschieben, Drehen, Klammern, Heben, Entleeren oder Arbeiten in der Höhe"
          ]
        }
      ]
    },
    "faq": [
      {
        "question": "Passt jedes Anbaugerät an jeden Stapler?",
        "answer": "Nein. Es muss zu FEM-Klasse, Resttragfähigkeit, Hydraulik und Einsatzumgebung des Staplers passen."
      },
      {
        "question": "Warum ist die Resttragfähigkeit entscheidend?",
        "answer": "Anbaugeräte bringen Eigengewicht mit und verschieben den Lastschwerpunkt. Dadurch sinkt die sichere Tragfähigkeit des Gesamtsystems."
      }
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "wozki-i-transport-wewnetrzny",
        "relationType": "application_context",
        "priority": 1,
        "context": "Übergeordneter Bereich innerbetrieblicher Transport"
      },
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 2,
        "context": "Häufige Basisstapler für Anbaugeräte"
      },
      {
        "targetSlug": "widly-i-przedluzki",
        "relationType": "parent_child",
        "priority": 3,
        "context": "Bestehende Kategorie Gabelzinken und Verlängerungen"
      },
      {
        "targetSlug": "kosze-robocze-na-widly",
        "relationType": "safety_dependency",
        "priority": 4,
        "context": "Bestehende Kategorie gabelmontierter Arbeitskörbe"
      }
    ]
  },
  "pozycjonery-i-przesuwy-boczne":   {
    "slug": "pozycjonery-i-przesuwy-boczne",
    "locale": "de",
    "definition": "Zinkenversteller und Seitenschieber ermöglichen das Verstellen der Zinken oder des Gabelträgers ohne wiederholtes Rangieren des Staplers.",
    "decisionFactors": [
      "Seitenschub- und Zinkenverstellbereich",
      "Kompatibilität zur ISO/FEM-Klasse",
      "Resttragfähigkeit und Sicht des Bedieners",
      "Hydraulikanforderungen"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 1,
        "context": "Basisstapler für Anbaugeräte am Gabelträger"
      },
      {
        "targetSlug": "regaly-i-systemy-skladowania",
        "relationType": "application_context",
        "priority": 2,
        "context": "Präzise Lastplatzierung in Lagersystemen"
      }
    ]
  },
  "chwytaki-do-wozkow-widlowych":   {
    "slug": "chwytaki-do-wozkow-widlowych",
    "locale": "de",
    "definition": "Klammergeräte dienen dem Handling nicht palettierter Lasten oder Produkten mit kontrolliertem Anpressdruck.",
    "decisionFactors": [
      "Öffnungsbereich der Arme",
      "Form und Material der Kontaktflächen",
      "Klammerkraft und Druckregelung",
      "Stabilität der Last ohne Palette"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 1,
        "context": "Basisstapler für Spezialklammern"
      },
      {
        "targetSlug": "opakowania-i-materialy-eksploatacyjne",
        "relationType": "application_context",
        "priority": 2,
        "context": "Palettenloses Handling und Ladungssicherung"
      }
    ]
  },
  "obrotnice-do-wozkow-widlowych":   {
    "slug": "obrotnice-do-wozkow-widlowych",
    "locale": "de",
    "definition": "Drehgeräte drehen Lasten oder Behälter kontrolliert, meist zum Entleeren, Mischen oder Ändern der Lastorientierung.",
    "decisionFactors": [
      "Drehbereich und Geschwindigkeit",
      "Sicherung der Last während der Drehung",
      "Hydraulik und Eigengewicht",
      "Einfluss auf den Lastschwerpunkt"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "pojemniki-i-kuwety",
        "relationType": "application_context",
        "priority": 1,
        "context": "Behälter im Prozesshandling"
      },
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 2,
        "context": "Basisstapler für Drehgeräte"
      }
    ]
  },
  "widly-i-przedluzki":   {
    "slug": "widly-i-przedluzki",
    "locale": "de",
    "definition": "Gabelzinken und Verlängerungen sind die primären tragenden Elemente eines Gabelstaplers.",
    "decisionFactors": [
      "FEM-Klasse und Zinkenquerschnitt",
      "Länge, Stärke und Verschleiß der Zinken",
      "Offene oder geschlossene Verlängerungen",
      "Integration der Verwiegung in den Prozess"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "osprzet-do-wozkow-widlowych",
        "relationType": "parent_child",
        "priority": 1,
        "context": "Übergeordnete Kategorie Stapleranbaugeräte"
      },
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 2,
        "context": "Stapler mit wechselbaren Gabelzinken"
      }
    ]
  },
  "systemy-push-pull-i-stabilizatory-ladunku":   {
    "slug": "systemy-push-pull-i-stabilizatory-ladunku",
    "locale": "de",
    "definition": "Push-Pull-Systeme und Laststabilisatoren unterstützen Prozesse, in denen Paletten durch Slip-Sheets ersetzt werden oder eine Last zusätzlichen Oberdruck benötigt.",
    "decisionFactors": [
      "Akzeptanz von Slip-Sheet-Logistik",
      "Erforderlicher Oberdruck und Stabilisierung",
      "Anzahl Paletten pro Zyklus",
      "Einfluss auf Staplerlänge und Manövrierfähigkeit"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "opakowania-i-materialy-eksploatacyjne",
        "relationType": "application_context",
        "priority": 1,
        "context": "Slip-Sheets und Ladungssicherungsmaterialien"
      },
      {
        "targetSlug": "nosniki-ladunku",
        "relationType": "comparison",
        "priority": 2,
        "context": "Vergleich von Paletten und alternativen Ladungsträgern"
      }
    ]
  },
  "osprzet-wysiegnikowy-i-dzwigowy":   {
    "slug": "osprzet-wysiegnikowy-i-dzwigowy",
    "locale": "de",
    "definition": "Ausleger- und Hebeanbaugeräte ermöglichen das Heben hängender Lasten mit dem Stapler.",
    "decisionFactors": [
      "Auslegerlänge und Hakenposition",
      "Tragfähigkeit am jeweiligen Hakenpunkt",
      "Montage auf Gabeln oder Gabelträger",
      "Sicherung gegen Abrutschen von den Gabeln"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "wozki-widlowe-czolowe",
        "relationType": "compatibility",
        "priority": 1,
        "context": "Basisstapler für Hebeadapter"
      },
      {
        "targetSlug": "systemy-bezpieczenstwa-i-oznakowanie",
        "relationType": "safety_dependency",
        "priority": 2,
        "context": "Kennzeichnung und Sicherung von Hebezonen"
      }
    ]
  },
  "osprzet-budowlany-komunalny-i-rolniczy":   {
    "slug": "osprzet-budowlany-komunalny-i-rolniczy",
    "locale": "de",
    "definition": "Bau-, Kommunal- und Landwirtschaftsanbaugeräte erweitern Stapler über klassische Lagerarbeiten hinaus, etwa für Schüttgut, Schnee, Abfall und Reinigungsarbeiten.",
    "decisionFactors": [
      "Mechanischer oder hydraulischer Antrieb",
      "Konstruktion für Schüttgutbelastung",
      "Verriegelung auf den Gabeln",
      "Außeneinsatz und Oberflächenqualität"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "wozki-widlowe-spalinowe",
        "relationType": "application_context",
        "priority": 1,
        "context": "Häufige Basisstapler für Außeneinsätze"
      },
      {
        "targetSlug": "systemy-bezpieczenstwa-i-oznakowanie",
        "relationType": "safety_dependency",
        "priority": 2,
        "context": "Kennzeichnung von Hof- und Kommunalarbeitsbereichen"
      }
    ]
  },
  "bezpieczenstwo-i-praca-na-wysokosci":   {
    "slug": "bezpieczenstwo-i-praca-na-wysokosci",
    "locale": "de",
    "definition": "Sicherheits- und Höhenarbeitsanbaugeräte umfassen Arbeitskörbe, Plattformen und Sicherheitskörbe für kurze, kontrollierte Servicearbeiten mit dem Stapler.",
    "decisionFactors": [
      "Verriegelung des Korbs auf den Gabeln",
      "Geländer, Zugangstür und Anschlagpunkte",
      "Zulässige Personenzahl und Arbeitslast",
      "Sicherheitsverfahren und Grenzen der Personenaufnahme"
    ],
    "relatedCategoryEdges": [
      {
        "targetSlug": "kosze-robocze-na-widly",
        "relationType": "parent_child",
        "priority": 1,
        "context": "Bestehende Kategorie Arbeitskörbe für Gabelzinken"
      },
      {
        "targetSlug": "systemy-bezpieczenstwa-i-oznakowanie",
        "relationType": "safety_dependency",
        "priority": 2,
        "context": "Kontext Arbeitssicherheit und Kennzeichnung"
      }
    ]
  }
};
