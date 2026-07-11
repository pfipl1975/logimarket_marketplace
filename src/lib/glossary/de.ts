import type { GlossaryContentMap } from "./types";

export const deGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "EURO-Behälter",
    shortDefinition: "Ein standardisierter Transport- und Lagerbehälter aus Kunststoff, dessen Maße optimal auf standardisierte Palettenmodule abgestimmt sind.",
    definition: [
      "EURO-Behälter (auch bekannt als Euro-Stapelbehälter) sind standardmäßige Ladeeinheiten in der Lagerlogistik, im Einzelhandel und in der industriellen Fertigung. Ihre Außenmaße sind standardisiert und basieren auf dem Logistikmodul 1200x800 mm (Grundfläche einer Europalette), was eine optimale Auslastung von Transport- und Lagerflächen ermöglicht.",
      "Sie werden meist aus hochdichtem Polyethylen (HDPE) oder Polypropylen (PP) hergestellt, was ihnen eine entsprechende mechanische Festigkeit, Rissbeständigkeit sowie Beständigkeit gegen ausgewählte chemische Substanzen verleiht. Die robuste Konstruktion erlaubt das sichere Stapeln beladener Behälter gemäß den vom Hersteller empfohlenen Belastungsgrenzen."
    ],
    applications: [
      "Lagerung und Transport von Teilen an Montagebändern in der Fertigung",
      "Kommissionierung und Verpackung von Aufträgen in Distributions- und E-Commerce-Zentren",
      "Automatische Kleinteilelager (behälterbasierte Mini-Load-Systeme)",
      "Lebensmittelechter Transport und Handhabung (unter Verwendung zertifizierter, für Lebensmittel zugelassener Ausführungen)"
    ],
    synonyms: ["Eurostapelbox", "Eurokiste", "Kunststoff-Eurobehälter"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "Was ist der Unterschied zwischen einem verstärkten und einem Standardboden bei Eurobehältern?",
        answer: "Ein verstärkter Boden (z. B. ein Rippen- oder Doppelboden) verringert das Durchbiegen des Behälters bei hohen Punktlasten. Diese Ausführung wird häufig in automatischen Lagern und auf Rollenbahnen eingesetzt, da eine übermäßige Bodendurchbiegung den reibungslosen Betrieb des Transportsystems beeinträchtigen könnte."
      },
      {
        question: "Sind Eurobehälter für die automatische industrielle Reinigung geeignet?",
        answer: "Ja, Behälter aus PP und HDPE können in industriellen Waschanlagen gereinigt werden. Die Wassertemperaturen und die verwendeten Reinigungsmittel sollten den technischen Spezifikationen des Materials und den Herstellerrichtlinien entsprechen."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Palettenregal",
    shortDefinition: "Ein Regalsystem zur mehrgeschossigen Lagerung von palettierten Waren.",
    definition: [
      "Palettenregale (vor allem Einfachregale) bilden einen wesentlichen Bestandteil vieler moderner Lagerhallen. Sie bieten direkten Zugriff auf die Ladeeinheiten und ermöglichen die Nutzung der lichten Höhe des Gebäudes. Das System besteht aus vertikalen Rahmen und horizontalen Trägern (Traversen), auf denen die Ladeeinheiten ruhen.",
      "Planung, Montage und Betrieb von Palettenregalen erfordern die Einhaltung einschlägiger Sicherheitsnormen (wie der DIN EN 15635), regelmäßige technische Inspektionen sowie den Einsatz geeigneter Schutzvorrichtungen zum Schutz der Regalstützen vor Staplerkollisionen in Arbeitsbereichen."
    ],
    applications: [
      "Mehrgeschossige Palettenlager und Logistikzentren",
      "Baustoffhändler und Industrielager",
      "Pufferzonen und Bereitstellungsräume an Verladerampen",
      "Kühllager, die eine optimale Auslastung des Raumvolumens erfordern"
    ],
    synonyms: ["Hochregal", "Einfachregal", "Industrieregal"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Was sind die häufigsten Schäden an Palettenregalen?",
        answer: "Die häufigsten Schäden treten an den unteren Teilen der vertikalen Regalstützen und an den Aussteifungen auf, meist verursacht durch Gabelstapler beim Rangieren. Der Einsatz von robustem Anfahrschutz ist üblich, um dieses Risiko zu minimieren."
      },
      {
        question: "Ist es zulässig, die Traversenhöhen an einem Palettenregal eigenständig zu ändern?",
        answer: "Eine Änderung der Fachhöhen beeinflusst die Tragfähigkeit und die statische Stabilität des Regalsystems. Jede Änderung erfordert die vorherige Prüfung und Freigabe durch den Hersteller oder einen qualifizierten Statiker."
      }
    ]
  },
  "antresola-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Lagerbühne",
    shortDefinition: "Eine Stahlkonstruktion, die zusätzliche nutzbare Geschossflächen über dem Hallenboden schafft, um die betriebliche Nutzfläche zu vergrößern.",
    definition: [
      "Eine Lagerbühne (auch als Stahlbühne oder Systembühne bezeichnet) ist ein System zur optimalen Nutzung des vertikalen Raums in hohen Industriehallen. Sie schafft zusätzliche Ebenen, auf denen Kommissionierbereiche, Packplätze, Montagezonen oder zusätzliche Lagerflächen eingerichtet werden können.",
      "Die Konstruktion ruht auf Stahlstützen, Haupt- und Nebenträgern (Pfetten). Die Abdeckung besteht meist aus hochbelastbaren Spanplatten (z. B. P5-Nut-und-Feder-Platten, oft schwer entflammbar) oder Gitterrosten, die für eine Belüftung sorgen und die Funktion von Sprinkleranlagen begünstigen."
    ],
    applications: [
      "Erweiterung von Kommissionierzonen in E-Commerce-Fulfillment-Centern (mehrstöckige Bühnen)",
      "Bereitstellungs- und Lagerflächen für leichte oder sperrige Güter",
      "Einrichtung von Montage- oder Produktionsarbeitsplätzen in der Höhe",
      "Bau von Meisterkabinen oder Aufenthaltsräumen auf der Bühne in Fertigungshallen"
    ],
    synonyms: ["Stahlbühne", "Zwischenbühne", "Arbeitspodest"],
    relatedTerms: ["kompletacja-zamowien", "stol-pakowy"],
    relatedCategories: ["antresole-i-podesty-magazynowe"],
    faq: [
      {
        question: "Erfordert die Errichtung einer Lagerbühne eine Baugenehmigung?",
        answer: "Die rechtliche Einstufung einer Lagerbühne (als Betriebseinrichtung oder als Gebäudeweiterung) hängt von der Konstruktion, der Verbindung mit dem Gebäude, dem Einsatzzweck und den lokalen Bauvorschriften ab. Vor der Realisierung sind eine formelle Prüfung, eine statische Überprüfung der Bodenplatte und eine Abstimmung mit dem Brandschutzbeauftragten erforderlich, um die notwendigen behördlichen Schritte festzulegen."
      },
      {
        question: "Welche Tragfähigkeit hat eine typische Lagerbühne?",
        answer: "Die Nutzlasten typischer Lagerbühnen liegen üblicherweise zwischen 250 kg/m² und 1000 kg/m² und werden individuell nach dem geplanten Einsatzzweck (z. B. Hubwagenverkehr, Fachbodenregale, Punktlasten) ausgelegt."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Packtisch",
    shortDefinition: "Ein Arbeitsplatz mit integrierten Halterungen für Verpackungsmaterialien zur effizienten Sendungsprüfung und -verpackung.",
    definition: [
      "Packtische und Packarbeitsplätze sind wichtige Bestandteile von Versandzonen in Distributionszentren, insbesondere im E-Commerce. Ziel ist es, den Verpackungsprozess zu rationalisieren und die Ergonomie für den Mitarbeiter durch eine organisierte Gestaltung und den bequemen Zugriff auf Werkzeuge zu unterstützen.",
      "Der modulare Aufbau dieser Tische ermöglicht eine Anpassung an spezifische Packabläufe. Optionales Zubehör umfasst Kartonmagazine, Abrollvorrichtungen für Folie oder Papier, Halterungen für Monitore und Etikettendrucker sowie Arbeitsplatzbeleuchtungen."
    ],
    applications: [
      "Versand- und Packstationen für Paketdienste im E-Commerce-Fulfillment",
      "Qualitätskontrollpunkte vor dem Kundenversand",
      "Montage- und Verpackungsarbeitsplätze in Fertigungsbetrieben",
      "Konsolidierungs- und Sortierstationen in Paketdepots"
    ],
    synonyms: ["Packarbeitsplatz", "Kommissioniertisch", "Verpackungstisch"],
    relatedTerms: ["pojemnik-euro", "kompletacja-zamowien"],
    relatedCategories: ["stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "Welche Maße der Arbeitsplatte eines Packtisches sind optimal?",
        answer: "In typischen Konfigurationen liegt die Breite der Arbeitsplatte zwischen 1600 und 1800 mm, mit einer Tiefe von ca. 800 mm. Dies bietet ausreichend Platz für Standardversandkartons, während alle Hilfsmittel in ergonomischer Reichweite bleiben."
      },
      {
        question: "Warum sind höhenverstellbare Packtische zu empfehlen?",
        answer: "Eine Höhenverstellung (z. B. elektrisch) erlaubt das Anpassen des Tisches an die Körpergröße des Mitarbeiters und unterstützt wechselnde Tätigkeiten im Stehen oder Sitzen, was die Wirbelsäule entlastet und die Betriebseffizienz fördert."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Gabelstapler",
    shortDefinition: "Ein motorisiertes Flurförderzeug mit Hubgerüst und Gabelzinken zum Heben, Transportieren und Stapeln von palettierten Lasten.",
    definition: [
      "Gabelstapler (Flurförderzeuge mit Hubeinrichtung) sind wichtige Maschinen für den innerbetrieblichen Materialtransport in Lagern, Fabriken und auf Baustellen. Sie dienen zum vertikalen Heben von Lasten und zum Manövrieren in ausgewiesenen Fahrwegen und Arbeitsgängen.",
      "Je nach Antrieb unterscheidet man Verbrennungsstapler (Treibgas, Diesel) für den Außenbereich und leise, emissionsfreie Elektrostapler (mit Blei-Säure- oder Lithium-Ionen-Batterien) für den Inneneinsatz. Spezialversionen wie Schubmaststapler oder Schmalgangstapler (VNA) bedienen Regalanlagen in großen Höhen."
    ],
    applications: [
      "Be- und Entladen von Lkw-Aufliegern, Seecontainern und Pritschenwagen",
      "Bedienung von Palettenregalen (Ein- und Auslagern von Paletten)",
      "Horizontaler Transport von Gütern über weite Strecken in Werkshallen",
      "Auftragskommissionierung in größeren Höhen mittels Kommissionierplattformen"
    ],
    synonyms: ["Stapler", "Gabelhubwagen", "Hubstapler"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Was zeichnet einen Schubmaststapler aus?",
        answer: "Ein Schubmaststapler (Reach Truck) besitzt ein vorschubfähiges Hubgerüst. Dies ermöglicht kompaktere Fahrzeugmaße und das Arbeiten in engeren Arbeitsgängen (oft unter 2,9 bis 3,1 Metern Breite, je nach Modell und Last) im Vergleich zu herkömmlichen Frontstaplern."
      },
      {
        question: "Warum ersetzen Lithium-Ionen-Batterien Blei-Säure-Batterien bei Staplern?",
        answer: "Lithium-Ionen-Batterien (Li-Ion) zeichnen sich durch einen vereinfachten Betrieb aus (kein Wassernachfüllen), erfordern keine speziellen Batterieladeräume mit Zwangsbelüftung (keine Gasentwicklung) und erlauben schnelles Zwischenladen während der Pausen."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Tragfähigkeit eines Regals",
    shortDefinition: "Die maximal zulässige Belastung einer Regalstruktur pro Traversenebene oder für ein gesamtes Regalfeld.",
    definition: [
      "Die Tragfähigkeit eines Regals ist ein grundlegender technischer Parameter zur Gewährleistung der Arbeitssicherheit im Lager. Sie wird unterteilt in die Fachlast (das maximale Gewicht pro Traversenpaar) und die Feldlast (das maximal zulässige Gesamtgewicht aller Ebenen eines Regalfeldes zwischen zwei Ständerrahmen, unter Berücksichtigung der Fachabstände).",
      "Die Tragfähigkeitswerte müssen auf Belastungswarnhinweisen (Traglastschildern) an den Regalzeilen deutlich gekennzeichnet sein. Eine Überschreitung der Projektparameter stellt ein erhebliches Sicherheitsrisiko dar. Die angegebenen Werte beziehen sich auf eine statische, gleichmäßig verteilte Last (UDL)."
    ],
    applications: [
      "Auslegung und statische Berechnung von Regalanlagen für spezifische Lastgewichte",
      "Überprüfung der Sicherheitskennwerte bei den regelmäßigen Regalprüfungen (z. B. nach DIN EN 15635)",
      "Planung der optimalen Platzbelegung im Lager unter Berücksichtigung des Palettengewichts"
    ],
    synonyms: ["Zulässige Belastung", "Fachlast", "Feldlast"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Was bedeutet UDL im Zusammenhang mit der Tragfähigkeit von Regalen?",
        answer: "UDL steht für Uniformly Distributed Load, also eine gleichmäßig verteilte Last über die gesamte Traversen- oder Fachbodenfläche. Regale sind für UDL ausgelegt; konzentrierte Punktlasten können die Tragfähigkeit drastisch reduzieren."
      },
      {
        question: "Wo müssen die Traglastschilder angebracht sein?",
        answer: "Traglastschilder müssen dauerhaft und gut sichtbar an der Regalstruktur (z. B. an den Stirnseiten jeder Regalzeile) angebracht sein, gemäß den Sicherheitsrichtlinien (wie der DIN EN 15635)."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Kommissionierung",
    shortDefinition: "Das Zusammenstellen von bestimmten Teilmengen aus einem Gesamtsortiment auf der Grundlage eines Auftrags.",
    definition: [
      "Die Kommissionierung (engl. order picking) ist einer der arbeitsintensivsten Prozesse in der Lagerlogistik, der einen erheblichen Teil der gesamten Betriebskosten ausmachen kann. Sie umfasst das Entnehmen von Artikeln aus dem Lagerbestand in den vom Kunden vorgegebenen Mengen und das Zuführen zur Pack- und Versandzone.",
      "Es gibt verschiedene Kommissioniermethoden, z. B. die klassische 'Mann-zur-Ware'-Methode (wo Bediener zu den Lagerplätzen laufen) oder automatische 'Ware-zum-Mann'-Systeme (wo Förderbänder, Shuttles oder Roboter die Ware zum Arbeitsplatz bringen). Zur Optimierung werden Technologien wie Pick-by-Light, Voice-Picking oder WMS-gesteuerte Kommissionierwege eingesetzt."
    ],
    applications: [
      "Zusammenstellung von Kundenbestellungen im E-Commerce",
      "Bereitstellung von Montagesätzen (Kitting) in der Automobil- und Elektronikindustrie",
      "B2B-Distribution von Lebensmitteln und Pharmazeutika an Handelsketten"
    ],
    synonyms: ["Auftragsabwicklung", "Pickvorgang", "Order picking"],
    relatedTerms: ["pojemnik-euro", "stol-pakowy"],
    relatedCategories: ["pojemniki-plastikowe-euro", "stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "Was ist der Unterschied zwischen einstufiger und zweistufiger Kommissionierung?",
        answer: "Bei der einstufigen Kommissionierung sammelt der Mitarbeiter die Artikel direkt für einen konkreten Auftrag. Bei der zweistufigen Kommissionierung (Batch Picking) wird erst die Gesamtmenge der Artikel für eine Gruppe von Aufträgen gesammelt und in einer Sortierzone auf die einzelnen Kundenpakete aufgeteilt."
      },
      {
        question: "Wie optimiert ein Lagerverwaltungssystem (LVS/WMS) die Kommissionierzeiten?",
        answer: "Ein WMS berechnet automatisch den vorgeschlagenen Kommissionierweg, um Leerwege zu minimieren, fasst Aufträge mit ähnlichen Profilen zusammen und führt den Mitarbeiter in der optimalen Reihenfolge durch die Lagerplätze."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Innerbetrieblicher Transport",
    shortDefinition: "Das Bewegen von Rohstoffen, Halbfabrikaten und Fertigwaren innerhalb eines Betriebsgeländes oder einer Lagerhalle.",
    definition: [
      "Der innerbetriebliche Transport (auch Flurförderwesen oder Intralogistik genannt) umfasst alle Bewegungsabläufe von Gütern innerhalb der Betriebsgrenzen. Er verknüpft Wareneingang, Lagerung, Produktion und Versand, wozu ein breites Spektrum an Hilfsmitteln zum Einsatz kommt.",
      "Die intralogistische Infrastruktur reicht von einfachen manuellen Geräten (wie Handhubwagen) bis hin zu vollautomatischen Systemen wie Rollen- und Gurtförderern, Vertikalhebern sowie fahrerlosen Transportsystemen (FTS/AGV/AMR), die sich selbstständig im Raum bewegen."
    ],
    applications: [
      "Transport von Rohmaterialien vom Wareneingang zu den Fertigungslinien",
      "Zuführung kommissionierter Ware zu den Pack- und Konsolidierungszonen",
      "Automatischer Palettentransport über mehrere Ebenen mittels Vertikalförderern auf Lagerbühnen",
      "Staging und Bereitstellung von Paletten in Dockbereichen"
    ],
    synonyms: ["Intralogistik", "Materialfluss", "Flurförderwesen"],
    relatedTerms: ["wozek-widlowy", "pojemnik-euro"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Worin unterscheiden sich autonome mobile Roboter (AMRs) von klassischen FTS (AGVs)?",
        answer: "AGVs bewegen sich in der Regel auf fest vorgegebenen Bahnen (z. B. Magnetschleifen oder Leitlinien), während AMRs häufiger eine freie Navigation basierend auf Umgebungskarten nutzen. Die konkreten Fähigkeiten zur Hindernisumfahrung und zum Stoppen hängen vom jeweiligen Herstellersystem und der Sicherheitskonfiguration ab."
      },
      {
        question: "Welche Vorteile bietet die Automatisierung des innerbetrieblichen Materialflusses?",
        answer: "Die Automatisierung kann die Prozesswiederholbarkeit unterstützen, manuelle Handhabungsschritte reduzieren und die Kontrolle des Materialflusses verbessern. Die Implementierung erfordert jedoch eine detaillierte Prozessanalyse, eine Sicherheitsbewertung gemeinsam genutzter Arbeitsbereiche sowie eine Planung der Systemverfügbarkeit und -wartung."
      }
    ]
  }
};
