# LOGIMARKET — EXECUTIVE DECISION PACK (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Podsumowanie stanu decyzji biznesowych, operacyjnych i prawnych dla MVP Dropshippingu

## 1. EXECUTIVE SUMMARY

Poniższe zestawienie stanowi bazę do zatwierdzenia przez kadrę kierowniczą (CFO, Legal Counsel, Operations Lead, Product Manager) logiki biznesowej niezbędnej do zaprojektowania modelu danych i procesów checkoutu na platformie LogiMarket. 

* **TOTAL_DECISIONS**: 23
* **IMPLEMENTATION_BLOCKING_DECISIONS**: 8
* **LEGAL_GATES**: 14

Ze względu na zablokowane decyzje, implementacja bazy danych (schema.ts) i checkoutu jest obecnie **wstrzymana**. Poniższe punkty określają grupy tematyczne, w ramach których wymagane są ostateczne decyzje (status `DECIDED`) wraz ze śladem audytowym.

## 2. POGRUPOWANE DECYZJE BIZNESOWE (DECISION GROUPS)

### A. Transaction and financial model
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | Merchant of Record (MoR) | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | Business Owner / CFO | Właściciel, CFO, Legal | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | 1 | Legal Counsel, PSP | Formalna zgoda Zarządu |
| `DEC-DROP-02` | Seller of Record (SoR) | `LEGAL_REVIEW_REQUIRED` | YES | Legal Counsel / CFO | CFO, Legal | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | 2 | Legal Counsel, Doradca Podatkowy | Opinia Prawna |
| `DEC-DROP-03` | Podmiot Wystawiający Fakturę | `RECOMMENDED` | YES | Finance / Legal | CFO, Legal | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | 3 | Dział Księgowości | Podpisany dokument decyzji |
| `DEC-DROP-05` | Własność Środków przed Payoutem | `LEGAL_REVIEW_REQUIRED` | NO | CFO / Legal | CFO, Legal | `LM-DROP-SCHEMA-56B3` | 4 | Legal Counsel, Księgowość | Opinia Prawna |
| `DEC-DROP-06` | Model Wynagrodzenia (Prowizja/Marża)| `RECOMMENDED` | NO | Head of Sales / CFO | Head of Sales, CFO | `LM-DROP-SCHEMA-56B3` | 5 | Dział Sprzedaży | Podpisany dokument decyzji |
| `DEC-DROP-07` | Moment Naliczenia Prowizji | `RECOMMENDED` | NO | CFO | CFO | `LM-DROP-SCHEMA-56B3` | 6 | Dział Księgowości | Podpisany dokument decyzji |

### B. Payment and settlement
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-04` | Podmiot Pobierający Płatność | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | CFO | CFO | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | 1 | PSP, Dział Prawny | Formalna zgoda PSP i CFO |
| `DEC-DROP-08` | Częstotliwość Settlementów | `OPEN` | NO | Operations / Finance | CFO, Operations | `LM-DROP-SCHEMA-56B3` | 2 | Zespół Partnerski | Podpisany dokument decyzji |
| `DEC-DROP-21` | MVP Payment Methods & Timing | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | Finance | CFO, Product Manager | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | 3 | PSP, Zespół B2B | Formalna specyfikacja metod płatności |

### C. Order and supplier operations
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-10` | Brak Stanu (Overselling) | `RECOMMENDED` | NO | Operations Manager | Operations Manager | `LM-DROP-SUPPLIER-56D` | 1 | Dział Obsługi Dostawców | Podpisany regulamin dla dostawców |
| `DEC-DROP-15` | Częściowa Realizacja Zamówienia | `OPEN` | NO | Operations | Operations, Product | `LM-DROP-ORDER-56C, LM-DROP-SUPPLIER-56D` | 2 | Dział Obsługi Klienta | Podpisany proces operacyjny |
| `DEC-DROP-17` | Multi-Partner Order w Koszyku | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | Product Manager | Product, Operations | `LM-DROP-SCHEMA-56B1, LM-DROP-ORDER-56C` | 3 | Architekt Domenowy | Akceptacja zmian w koszyku |

### D. Shipment, freight and delivery
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-11` | Uszkodzenie w Transporcie | `LEGAL_REVIEW_REQUIRED` | NO | Operations / Legal | Operations, Legal | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | 1 | Przewoźnicy | Opinia Prawna |
| `DEC-DROP-16` | Split Shipment (Wielopaczkowość)| `RECOMMENDED` | NO | Domain Architect | Operations, Tech Lead | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | 2 | Dział Integracji Kurierskich | Specyfikacja techniczna integracji |
| `DEC-DROP-22` | MVP Shipping and Freight Scope | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | Operations | Operations, Product | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | 3 | Dostawcy logistyczni | Formalna definicja wariantów przewozu |

### E. Returns, refunds and complaints
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-09` | Odpowiedzialność za Błędną Cenę | `LEGAL_REVIEW_REQUIRED` | NO | Legal Counsel | Legal, CFO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | 1 | Doradca Prawny | Wpis w Regulaminie |
| `DEC-DROP-12` | Podmiot Obsługujący Refund | `RECOMMENDED` | YES | Finance / Support | CFO, Customer Service | `LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4` | 2 | PSP | Regulamin zwrotów środków |
| `DEC-DROP-13` | Zgłoszenia Reklamacyjne | `RECOMMENDED` | NO | Support Lead | Support Lead, Legal | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | 3 | Dział Reklamacji | SLA i regulamin reklamacji |
| `DEC-DROP-14` | Adres i Koszt Zwrotu Towaru | `RECOMMENDED` | NO | Operations Lead | Operations Lead | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | 4 | Zespół Magazynowy/Partnerski | Standard zwrotów LogiMarket |

### F. Geographic, currency and documentation scope
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-18` | VAT i Fakturowanie Transgraniczne| `RECOMMENDED` | NO | Finance / Tax Advisor | CFO, Doradca Podatkowy | `LM-DROP-SCHEMA-56B3` | 1 | Doradca Podatkowy | Opinia Prawno-Podatkowa |
| `DEC-DROP-19` | Kraje Dostawy w MVP | `RECOMMENDED` | NO | Operations | Operations, Legal | `LM-DROP-ORDER-56C` | 2 | Operations | Potwierdzona lista krajów |
| `DEC-DROP-20` | Waluta i Język Dokumentów | `RECOMMENDED` | NO | Product Manager | Product Manager | `LM-DROP-ORDER-56C` | 3 | Finance | Lista walut obsługiwanych przez PSP |

### G. Future B2B capabilities
| DECISION_ID | SUBJECT | CURRENT_STATUS | BLOCKS_IMPLEMENTATION | OWNER | REQUIRED_APPROVERS | BLOCKED_SPRINTS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-23` | Customer PO Number w MVP | `OPEN` | NO | Product Manager | Product Manager | `LM-DROP-ORDER-56C` | 1 | B2B Customers | Analiza wymagań produktowych |

## 3. PRIORYTETOWE DECISION CARDS DLA DECYZJI BLOKUJĄCYCH

Decyzje priorytetowe stanowią absolutne minimum wymagane do wznowienia prac nad schematem bazy danych i implementacją aplikacji. Brak zatwierdzeń w tym obszarze blokuje realizację sprintów począwszy od `LM-DROP-DATA-MODEL-56B0`. Zobacz szczegółowe karty decyzji dla poszczególnych domen w poniższych plikach analitycznych.
