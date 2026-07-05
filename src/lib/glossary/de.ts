import type { GlossaryContentMap } from "./types";

export const deGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "EURO-Behälter",
    shortDefinition: "Ein standardisierter Transport- und Lagerbehälter aus Kunststoff, dessen Maße optimal auf die Abmessungen von Europaletten abgestimmt sind.",
    definition: [
      "EURO-Behälter (auch bekannt als Euro-Stapelbehälter) sind grundlegende Ladeeinheiten in der Lagerlogistik, im Einzelhandel und in der industriellen Fertigung. Ihre Außenmaße sind streng standardisiert und basieren auf dem Logistikmodul 1200x800 mm (Grundfläche einer Europalette), was eine optimale Auslastung von Transport- und Lagerflächen ermöglicht.",
      "Sie werden meist aus hochdichtem Polyethylen (HDPE) oder Polypropylen (PP) hergestellt, was ihnen hervorragende mechanische Festigkeit, Rissbeständigkeit sowie Beständigkeit gegen Säuren, Öle und Laugen verleiht. Die robuste Konstruktion erlaubt das sichere Stapeln beladener Behälter ohne Beschädigung des Inhalts."
    ],
    applications: [
      "Lagerung und Transport von Teilen an Montagebändern in der Fertigung",
      "Kommissionierung und Verpackung von Aufträgen in Distributions- und E-Commerce-Zentren",
      "Automatische Kleinteilelager (AKL / Mini-Load-Systeme)",
      "Lebensmittelechter Transport und Handhabung (unter Verwendung zertifizierter Ausführungen)"
    ],
    synonyms: ["Eurostapelbox", "Eurokiste", "Kunststoff-Eurobehälter"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "Was jest der Unterschied zwischen einem verstärkten und einem Standardboden bei Eurobehältern?",
        answer: "Ein verstärkter Boden (z. B. gerippt oder doppelt) verhindert das Durchbiegen des Behälters bei hohen Punktlasten. Dies ist in automatischen Lagern und auf Rollenbahnen wichtig, da eine Bodendurchbiegung das Transportsystem blockieren könnte."
      },
      {
        question: "Sind Eurobehälter für die automatische industrielle Reinigung geeignet?",
        answer: "Ja, PP- und HDPE-Kunststoffe sind beständig gegen die in industriellen Waschanlagen üblichen Wassertemperaturen (bis +80°C) und chemischen Reinigungsmittel."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Palettenregal",
    shortDefinition: "Ein schwerlastfähiges Regalsystem zur sicheren, mehrgeschossigen Lagerung von palettierten Waren.",
    definition: [
      "Palettenregale (vor allem Einfachregale) bilden das Rückgrat der meisten modernen Lagerhallen. Sie bieten direkten Zugriff auf jede einzelne Palette (Prinzip des 100%igen Zugriffs) und ermöglichen eine vollständige Nutzung der lichten Höhe des Gebäudes. Das System besteht aus vertikalen Stahlrahmen und horizontalen Längsträgern (Traversen), auf denen die Ladeeinheiten ruhen.",
      "Planung und Montage von Palettenregalen erfordern die strikte Einhaltung von Sicherheitsnormen (wie der DIN EN 15635), regelmäßige technische Inspektionen sowie den Einsatz von Anfahrschutzvorrichtungen und Leitplanken zum Schutz der Regalstützen vor Staplerkollisionen."
    ],
    applications: [
      "Mehrgeschossige Hochregallager und Logistikzentren",
      "Baustoffhändler und Industriegroßhandlungen",
      "Pufferzonen und Bereitstellungsräume an Verladerampen",
      "Kühllager, die eine optimale Auslastung des Raumvolumens erfordern"
    ],
    synonyms: ["Hochregal", "Einfachregal", "Industrieregal"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Was sind die häufigsten Schäden an Palettenregalen?",
        answer: "Die häufigsten Schäden treten an den unteren Teilen der vertikalen Regalstützen und an den Aussteifungen auf, meist verursacht durch Gabelstapler beim Rangieren. Der Einsatz von robustem Anfahrschutz ist unerlässlich, um dieses Risiko zu minimieren."
      },
      {
        question: "Ist es zulässig, die Trägertrachen an einem Palettenregal eigenständig zu ändern?",
        answer: "Nein, eine Änderung der Fachhöhen beeinflusst die Lastverteilung und Statik des Regals. Jede Änderung erfordert die Freigabe des Herstellers oder eine statische Neuberechnung durch einen Prüfingenieur."
      }
    ]
  },
  "antresola-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Lagerbühne",
    shortDefinition: "Eine freistehende Stahlkonstruktion, die zusätzliche nutzbare Geschossflächen über dem Hallenboden schafft, ohne das Gebäude zu erweitern.",
    definition: [
      "Eine Lagerbühne (auch als Stahlbühne oder Systembühne bezeichnet) ist ein hochentwickeltes System zur optimalen Nutzung des vertikalen Raums in hohen Industriehallen. Sie schafft zusätzliche Ebenen, auf denen Kommissionierbereiche, Packplätze, Montagezonen oder Büros eingerichtet werden können.",
      "Die Konstruktion ruht auf Stahlstützen, Haupt- und Nebenträgern (Pfletten). Die Abdeckung besteht meist aus hochbelastbaren Spanplatten (z. B. P5-Nut-und-Feder-Platten, oft schwer entflammbar) oder Gitterrosten, die für eine bessere Belüftung sorgen und die Funktion von Sprinkleranlagen begünstigen."
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
        answer: "Freistehende, demontierbare Stahlbühnen, die nur am Hallenboden verdübelt sind, werden meist als Lagereinrichtung eingestuft und sind oft genehmigungsfrei. Eine baurechtliche Prüfung (Brandschutz, Tragfähigkeit der Bodenplatte) ist jedoch erforderlich."
      },
      {
        question: "Welche Tragfähigkeit hat eine typische Lagerbühne?",
        answer: "Die Nutzlasten von Lagerbühnen liegen üblicherweise zwischen 250 kg/m² und 1000 kg/m² und werden individuell nach Einsatzzweck (z. B. Hubwagenverkehr, Fachbodenregale) ausgelegt."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Packtisch",
    shortDefinition: "Ein ergonomischer Arbeitsplatz mit integrierten Halterungen für Verpackungsmaterialien zur effizienten Sendungsprüfung und -verpackung.",
    definition: [
      "Packtische und Packarbeitsplätze sind Kernbestandteile von Versandzonen in Distributionszentren, insbesondere im E-Commerce. Ziel ist es, die Durchlaufzeiten bei der Paketvorbereitung zu minimieren und die Ermüdung des Bedieners durch ergonomische Gestaltung (z. B. Höhenverstellung, leichter Zugriff auf Zubehör) zu reduzieren.",
      "Der modulare Aufbau dieser Tische ermöglicht eine Anpassung an spezifische Packabläufe. Zur Standardausstattung gehören Kartonmagazine, Abrollvorrichtungen für Luftpolsterfolie oder Packpapier, Halterungen für Monitore und Etikettendrucker sowie integrierte LED-Arbeitsplatzleuchten."
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
        answer: "Die gängigsten Größen sind 1600 bis 1800 mm in der Breite und 800 mm in der Tiefe. Dies bietet ausreichend Platz für große Versandkartons, während alle Hilfsmittel in ergonomischer Reichweite bleiben."
      },
      {
        question: "Warum sind höhenverstellbare Packtische zu empfehlen?",
        answer: "Eine Höhenverstellung (insbesondere elektrisch) erlaubt das Anpassen des Tisches an die Körpergröße des Mitarbeiters und unterstützt wechselnde Tätigkeiten im Stehen oder Sitzen, was die Wirbelsäule entlastet und die Effizienz steigert."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Gabelstapler",
    shortDefinition: "Ein motorisiertes Flurförderzeug mit Hubgerüst und Gabelzinken zum Heben, Transportieren und Stapeln von palettierten Lasten.",
    definition: [
      "Gabelstapler (Flurförderzeuge mit Hubeinrichtung) sind unverzichtbare Maschinen für den innerbetrieblichen Materialtransport in Lagern, Häfen, Fabriken und auf Baustellen. Ihr Hauptvorteil liegt im vertikalen Heben schwerer Lasten und im präzisen Manövrieren in engen Arbeitsgängen.",
      "Je nach Antrieb unterscheidet man Verbrennungsstapler (Treibgas, Diesel) für den Außenbereich und leise, emissionsfreie Elektrostapler (mit Blei-Säure- oder modernen Li-Ion-Batterien) für den Inneneinsatz. Spezialversionen wie Schubmaststapler oder Schmalgangstapler (VNA) bedienen Regalanlagen in Höhen von über 12 Metern."
    ],
    applications: [
      "Be- und Entladen von Lkw-Aufliegern, Seecontainern und Pritschenwagen",
      "Bedienung von Hochregalen (Ein- und Auslagern von Paletten)",
      "Horizontaler Transport von Gütern über weite Strecken in Werkshallen",
      "Auftragskommissionierung in größeren Höhen mittels Kommissionierplattformen"
    ],
    synonyms: ["Stapler", "Gabelhubwagen", "Hubstapler"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "Was zeichnet einen Schubmaststapler aus?",
        answer: "Ein Schubmaststapler (Reach Truck) besitzt ein vorschubfähiges Hubgerüst. Dies ermöglicht kompaktere Fahrzeugmaße und das Arbeiten in deutlich engeren Arbeitsgängen (oft unter 2,9 Meter Breite) als herkömmliche Frontstapler."
      },
      {
        question: "Warum ersetzen Lithium-Ionen-Batterien Blei-Säure-Batterien bei Staplern?",
        answer: "Li-Ion-Batterien sind wartungsfrei (kein Wassernachfüllen), gasen beim Laden nicht (keine speziellen Batterieladeräume erforderlich) und erlauben schnelles Zwischenladen während der Pausen."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Tragfähigkeit eines Regals",
    shortDefinition: "Die maximal zulässige Belastung einer Regalstruktur pro Traversenebene oder für ein gesamtes Regalfeld.",
    definition: [
      "Die Tragfähigkeit eines Regals ist ein grundlegender technischer Parameter zur Gewährleistung der Arbeitssicherheit im Lager. Sie wird unterteilt in die Fachlast (das maximale Gewicht pro Traversenpaar oder Fachboden) und die Feldlast (das maximal zulässige Gesamtgewicht aller Ebenen eines Regalfeldes zwischen zwei Ständerrahmen).",
      "Die Tragfähigkeitswerte müssen auf Belastungswarnhinweisen (Traglastschildern) an den Stirnseiten der Regalzeilen deutlich gekennzeichnet sein. Eine Überlastung stellt ein extremes Sicherheitsrisiko dar. Berechnungen basieren auf einer statischen, gleichmäßig verteilten Last (UDL)."
    ],
    applications: [
      "Auslegung und statische Berechnung von Regalanlagen für spezifische Lastgewichte",
      "Überprüfung der Sicherheitskennwerte bei den jährlichen Regalprüfungen nach DIN EN 15635",
      "Planung der optimalen Platzbelegung im Lager unter Berücksichtigung des Palettengewichts"
    ],
    synonyms: ["Zulässige Belastung", "Fachlast", "Feldlast"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "Was bedeutet UDL im Zusammenhang mit der Tragfähigkeit von Regalen?",
        answer: "UDL steht für Uniformly Distributed Load, also eine gleichmäßig verteilte Last über die gesamte Traversen- oder Fachbodenfläche. Regale sind für UDL ausgelegt; konzentrierte Punktlasten reduzieren die Tragfähigkeit drastisch."
      },
      {
        question: "Wo müssen die Traglastschilder angebracht sein?",
        answer: "Traglastschilder müssen gemäß der DIN EN 15635 dauerhaft und gut sichtbar an jedem Regal oder an den Stirnseiten jeder Regalzeile montiert sein."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Kommissionierung",
    shortDefinition: "Das Zusammenstellen von bestimmten Teilmengen aus einem Gesamtsortiment auf der Grundlage eines Auftrags.",
    definition: [
      "Die Kommissionierung (engl. order picking) ist einer der zeit- und kostenintensivsten Prozesse in der Lagerlogistik, der oft bis zu 50-60 % der gesamten Betriebskosten ausmacht. Sie umfasst das Entnehmen von Artikeln aus dem Lagerbestand in den vom Kunden vorgegebenen Mengen und das Zuführen zur Packzone.",
      "Es gibt verschiedene Kommissioniermethoden, z. B. 'Ware-zum-Mann' (wo Bediener durch die Gänge laufen) oder automatische 'Ware-zum-Mann'-Systeme (wo Förderbänder, Shuttles oder Roboter die Ware zum Arbeitsplatz bringen). Zur Optimierung werden Technologien wie Pick-by-Light, Voice-Picking oder WMS-gesteuerte Wegstreckenoptimierung eingesetzt."
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
        answer: "Bei der einstufigen Kommissionierung sammelt der Mitarbeiter die Artikel direkt für einen konkreten Auftrag. Bei der zweistufigen Kommissionierung (Batch Picking) wird erst die Gesamtmenge der Artikel für mehrere Aufträge gesammelt und in einer Sortierzone auf die einzelnen Kundenpakete aufgeteilt."
      },
      {
        question: "Wie optimiert ein Lagerverwaltungssystem (LVS/WMS) die Kommissionierzeiten?",
        answer: "Ein WMS berechnet automatisch den kürzesten Kommissionierweg, minimiert Leerfahrten, fasst Aufträge mit ähnlichen Profilen zusammen und führt den Mitarbeiter in der optimalen Reihenfolge durch die Lagerplätze."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Innerbetrieblicher Transport",
    shortDefinition: "Das Bewegen von Rohstoffen, Halbfabrikaten und Fertigwaren innerhalb eines Betriebsgeländes oder einer Lagerhalle.",
    definition: [
      "Der innerbetriebliche Transport (auch Flurförderwesen oder Intralogistik genannt) umfasst alle Bewegungsabläufe von Gütern innerhalb der Betriebsgrenzen. Er verknüpft Wareneingang, Lagerung, Produktion und Versand, wozu ein breites Spektrum an Flurförderzeugen und Hilfsmitteln zum Einsatz kommt.",
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
        answer: "AMRs navigieren eigenständig anhand von internen Laserkarten und Sensoren, wodurch sie Hindernisse dynamisch umfahren können. Klassische AGVs folgen einer fest vorgegebenen Spur (z. B. Magnetband) und bleiben vor Hindernissen stehen, bis diese entfernt werden."
      },
      {
        question: "Welche Vorteile bietet die Automatisierung des innerbetrieblichen Materialflusses?",
        answer: "Die Automatisierung ermöglicht einen kontinuierlichen Materialfluss (rund um die Uhr 24/7), eliminiert menschliche Fehler, reduziert Unfälle im Lager drastisch und senkt die Betriebskosten der Intralogistik."
      }
    ]
  }
};
