# PM Verification and Action Plan — LogiMarket Marketplace B2B

**Projekt:** `logimarket.eu` / `pfipl1975/logimarket_marketplace`  
**Baseline referencyjny:** `cd1de62625f6a95bb0ed8e651ab40b3544e41a5d`  
**Data przeglądu:** 2026-08-09  
**Revision:** `v2.0 — post Legal Counsel closure`  
**Rola:** Owner/PM legal-integration & engineering impact review  
**Status:** `READY_FOR_OWNER_REVIEW`

> Dokument nie jest opinią prawną. Jest warstwą Owner/PM, która integruje zatwierdzone fakty biznesowe, finalny `LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0`, wcześniejsze materiały analityczne i istniejącą roadmapę 56B1–56B6. W razie konfliktu z wcześniejszym workerem/briefem/roboczą analizą pierwszeństwo ma najnowsza formalna odpowiedź kancelarii, następnie Consolidated Legal Counsel Record, a dla scope technicznego — normatywne dokumenty 56B0/56C0.

## 0. Executive verdict

```text
SOURCE_COUNSEL_ANALYSIS_STATUS=FORMAL_COUNSEL_REVIEW_COMPLETED_WITH_ERRATA
LEGAL_COUNSEL_WORKSTREAM_CLOSED=YES
LEGAL_CONSOLIDATION_RECORD=LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0
PM_INTEGRATION_VERDICT=ACCEPTED_WITH_OPEN_DPO_TAX_PSP_AND_READINESS_WORKSTREAMS

OWNER_BUSINESS_MODEL_INTERMEDIARY_FIRST=RETAIN
OWNER_BUSINESS_FACT_RECORD_Q1_Q8=RETAIN_WITH_IMPLEMENTATION_QUALIFIERS

LEGAL_COUNSEL_BASE_MODEL_GATES=CLOSED_WITH_CONDITIONS
DPO_SIGNOFF_REQUIRED=YES
DAC7_TAX_SIGNOFF_REQUIRED=YES
PSP_PROVIDER_EVIDENCE_REQUIRED=YES_BEFORE_56B3

LM_MARKETPLACE_SCHEMA_56B1_READY=NO
EXPLICIT_READINESS_REVIEW_REQUIRED_BEFORE_56B1=YES
AUTOMATIC_56B1_UNBLOCK_AFTER_LEGAL_CLOSURE=NO
```

Zmiana względem poprzedniej wersji PM planu jest fundamentalna: **nie oczekujemy już kolejnej rundy kwalifikacji bazowego modelu przez kancelarię**. Legal Counsel Workstream został zamknięty po kolejnych korektach i erratach. Otwarte pozostają odrębne ścieżki DPO/privacy, Tax/DAC7, evidence konkretnego PSP oraz formalny Owner/Engineering Readiness Review.

Finalna normalizacja:

1. Relacja LogiMarket–Partner może być konstruowana jako **umowa agencyjna w wariancie pośredniczącym z art. 758 §1 KC**, bez umocowania LogiMarket do zawierania umów sprzedaży w imieniu Partnera.
2. Partner pozostaje sprzedawcą towaru; LogiMarket nie jest stroną umowy sprzedaży, nie wystawia faktury towarowej i nie prowadzi self-custody/escrow.
3. `E2 = oferta Kupującego`; `E7 = jawna akceptacja Partnera / docelowy moment zawarcia`; capture dopiero po E7.
4. P2B pozostaje `NOT_APPLICABLE` tak długo, jak rzeczywisty model pozostaje pure B2B i nie jest oferowany konsumentom.
5. DSA: dla treści Partnerów kierunek hosting/online platform; art. 14 + bazowe obowiązki Section 2; SME exemptions nie wyłączają automatycznie art. 16–18.
6. B2B gating: business identity może być wymagana; **professional-purpose declaration jest fakultatywne i nie może być obowiązkowym warunkiem checkoutu**; PKD/CEIDG ma charakter pomocniczy/dowodowy, nie automatycznie rozstrzygający.
7. RODO/privacy pozostaje do finalnego DPO sign-off per processing operation; nie hardcodować globalnego joint controllership.
8. KSeF: FA(3), przy wariancie >10 000 zł counsel przyjmuje issuing od 1.04.2026; własna integracja API nie jest konieczna dla MVP.
9. DAC7 pozostaje otwarte do Tax Advisor sign-off; nie wolno globalnie ustawiać wszystkich Partnerów jako reportable.
10. Scope pozostaje rozdzielony: seller foundation = 56B1; Buyer Legal Context + E2/E6/E7 = 56B2; PSP = 56B3; KSeF/invoices = 56B4; privacy/retention/audit = 56B6.

## 1. Source set and traceability

### Aktualne źródła decyzyjne

1. `01_LogiMarket_Marketplace_Model_Biznesowy.docx` — zatwierdzone fakty biznesowe Ownera Q1–Q8.
2. `02_LogiMarket_Marketplace_Legal_Decision_Pack.docx` — historyczna lista pytań/gate'ów skierowanych do kancelarii.
3. `03_LogiMarket_Marketplace_GDPR_Data_Flow_Pack.docx` — evidence stanu technicznego ACT-01…ACT-06 i input dla DPO.
4. Finalna sekwencja odpowiedzi kancelarii z 9.08.2026, w tym korekty i erraty.
5. `LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0` — **główny aktualny Legal Consolidation Record**.
6. Niniejszy `PM_Verification_and_Action_Plan.md` — warstwa mapowania zatwierdzonych decyzji na roadmapę techniczną i readiness.

### Materiały historyczne / issue spotting

- `LogiMarket_Weryfikacja_Prawna_Marketplace_B2B.docx`
- `brief.md`
- `worker_01_regulatory_research.md`
- `worker_02_gdpr_analysis.md`
- `worker_03_tax_analysis.md`

Materiały te pozostają przydatne jako traceability i backlog issue-spotting, ale **nie są źródłem canonical verdict**, jeżeli ich twierdzenie zostało później skorygowane przez kancelarię/Consolidated Record.

### Repo — normatywne źródła architektury

- `docs/domain/lm-marketplace-validation-56c0-dependency-and-unblock-plan.md`
- `docs/domain/lm-drop-domain-56a-implementation-roadmap.md`
- `docs/domain/lm-marketplace-validation-56c0-gate-register.md`
- `docs/domain/lm-marketplace-data-model-56b0-logical-model.md`

### Source hierarchy

```text
1. Obowiązujący akt prawny / oficjalne źródło
2. Najnowsza formalna odpowiedź / errata kancelarii
3. LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0
4. Normatywne dokumenty 56B0/56C0 dla mappingu technicznego
5. PM_Verification_and_Action_Plan.md
6. Counsel Pack jako business/evidence/question record
7. Workers / brief / pierwsza robocza analiza — traceability only
```

## 2. Krytyczna normalizacja prawna — status po zamknięciu Legal Counsel

| ID | Historyczne twierdzenie | Finalny PM verdict | Skutek projektowy |
|---|---|---|---|
| LEG-CORR-01 | `art. 540 KC` = podstawa pośrednictwa | **REJECTED_ANALYSIS_ASSERTION** | Nie wracać. Finalny model relacji LogiMarket–Partner: agencyjne pośrednictwo art. 758 §1, bez umocowania do zawierania sprzedaży. |
| LEG-CORR-02 | Agencja zawsze wymaga umocowania | **REJECTED_ANALYSIS_ASSERTION** | Brak umocowania wyklucza zawieranie umów w imieniu Partnera, nie wariant pośredniczący. |
| LEG-CORR-03 | LogiMarket domyślnie odpowiada za wykonanie zobowiązania Kupującego | **REJECTED_ANALYSIS_ASSERTION** | Del credere tylko warunkowo z art. 761⁷; w bazowym MVP brak zastrzeżenia. |
| LEG-CORR-04 | P2B automatycznie stosuje się do B2B-only | **REJECTED_ANALYSIS_ASSERTION** | `P2B=NOT_APPLICABLE_WHILE_PURE_B2B`; re-open przy consumer exposure/B2C. |
| LEG-CORR-05 | DSA art. 19 wyłącza art. 16–18 | **REJECTED_ANALYSIS_ASSERTION** | Section 2 hosting duties analizować osobno; SME exemptions dotyczą innych zakresów. |
| LEG-CORR-06 | DSA Terms & Conditions = art. 13 | **REJECTED_ANALYSIS_ASSERTION** | T&C / moderation transparency = art. 14 DSA. |
| LEG-CORR-07 | cookie = art. 175 PKE | **REJECTED_ANALYSIS_ASSERTION** | Aktualna baza w legal record: art. 399 PKE; finalna decyzja cookie do DPO. |
| LEG-CORR-08 | Future LogiMarket→Partner = zawsze art. 26 | **REJECTED_ANALYSIS_ASSERTION** | Role RODO ustalać per processing operation; nie hardcodować joint controller. |
| LEG-CORR-09 | Professional-purpose checkbox może obowiązkowo blokować checkout | **REJECTED_ANALYSIS_ASSERTION** | Oświadczenie fakultatywne; business identity gating projektować niezależnie. |
| LEG-CORR-10 | PKD match automatycznie rozstrzyga legal context | **REJECTED_ANALYSIS_ASSERTION** | PKD/CEIDG = evidence/risk signal, nie automatyczny legal classifier. |
| LEG-CORR-11 | Brak aktywnego VAT UE = brak statusu przedsiębiorcy | **REJECTED_ANALYSIS_ASSERTION** | VIES tylko where applicable; dopuszczać alternatywny registry identifier dla RFQ UE. |
| LEG-CORR-12 | KSeF FA(1)/(2) w 2026 | **REJECTED_ANALYSIS_ASSERTION** | KSeF schema = FA(3). |
| LEG-CORR-13 | Prowizja UE = po prostu VAT `0%` | **REJECTED_ANALYSIS_ASSERTION** | Modelować place-of-supply / `NP + reverse_charge` tam, gdzie właściwe. |
| LEG-CORR-14 | buyer gating + E2/E6/E7 + payment state = 56B1 | **REJECTED_ARCHITECTURE_MAPPING** | Buyer/order lifecycle = 56B2; payment orchestration = 56B3. |

## 3. Werdykt → zmiana projektowa

### LEG-MKT-01 — intermediary / agency qualification

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

**Canonical direction:**

- Partner = seller of record / strona sprzedaży.
- LogiMarket = agent pośredniczący / platforma, bez umocowania do zawierania umów sprzedaży w imieniu Partnera.
- LogiMarket nie nabywa towaru, nie przejmuje własności ani ryzyka towarowego.
- LogiMarket nie wystawia faktury za towar.
- LogiMarket nie prowadzi własnego escrow/self-custody.
- Success fee/prowizja = wynagrodzenie za usługę pośrednictwa agencyjnego.
- `DEL_CREDERE=NOT_RESERVED` w bazowym MVP; nie dodawać gwarancji wykonania zobowiązania przez Kupującego.

**56B1:** `SellerLegalIdentity`, `OfferSellerAssignment`, seller verification metadata, public/KYB classification, explicit project `contractModel` zgodnie z 56B0.

**Critical architecture rule:** kwalifikacja umowy LogiMarket–Partner jako agencyjnej **nie tworzy nowej wartości `contractModel=AGENCY`** i nie zmienia istniejącego canonical resolvera `offerModel + conversionType`.

**Partner Agreement:** nadal `TO_DO`; przy finalnym draftingu wymaga article-by-article check przepisów agencyjnych, w szczególności prowizji, obowiązków stron, rozwiązania, świadczenia wyrównawczego i ewentualnego zakazu konkurencji po rozwiązaniu.

### LEG-MKT-02 / OMQ-MKT-01 — e-commerce contract formation

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

**Canonical flow:**

```text
E1 cart = technical
E2 submit checkout = buyer offer / order intent
E3 receipt acknowledgement = technical receipt, not acceptance
E4/E5 payment init / preauth = payment technical state, no contract formation
E6 routing to Partner = technical delivery, not acceptance
E7 explicit SellerAcceptanceDecision = target contract formation event
E8 fulfillment = only after E7
E9 confirmation = evidence/UI notification after E7
```

**Required conditions:**

- seller silence does not constitute acceptance;
- system/terms prevent treating fulfillment before E7 as intended acceptance path;
- lack of E7 before timeout → `EXPIRED` / no contract;
- capture after E7, subject to PSP capability;
- legal wording and UI must distinguish receipt acknowledgement from seller acceptance.

**Scope:** state machine, `SellerAcceptanceDecision`, E2/E6/E7 timestamps = **56B2**. Preauth/capture/void/release = **56B3**.

### OMQ-MKT-02 — RFQ

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

- RFQ = negotiations/rokowania.
- Quotation ma pozostać niewiążąca, jeśli zawiera jednoznaczne zastrzeżenie niewiążącego charakteru.
- Nie używać CTA sugerującego automatyczne zawarcie umowy typu `Akceptuję wycenę`, jeżeli quotation ma pozostać niewiążąca.
- RFQ nie korzysta z cart/payment w obecnym MVP.

### LEG-MKT-03 — seller identity / disclosure

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

**56B1 foundation:**

- seller legal name;
- country / registered office;
- tax identifier type/value;
- VAT ID where applicable;
- registry type/number where applicable;
- verification status/method/verified_at/evidence reference;
- offer→seller assignment;
- public / contractual / recommended / internal-KYB field classification.

**Final disclosure direction:**

- legal name, address, firm contact, seller role, invoice issuer, fulfillment/reklamacje = contractual disclosure;
- NIP/VAT ID = contractual identification/tax context, ale nie jedyny możliwy registry model UE;
- phone/KRS/REGON = best practice / verification context zależnie od pola;
- IBAN, registry evidence, extended KYB = internal only unless separate reason requires disclosure.

**56B2:** immutable seller disclosure snapshot at transactional context.

### LEG-MKT-04 — P2B

**Counsel final:** `NOT_APPLICABLE`  
**PM current:** `NOT_APPLICABLE_WHILE_PURE_B2B`

- Nie tworzyć dedykowanego P2B schema/workflow jako obowiązkowego elementu MVP.
- Utrzymać dobre praktyki kontraktowe: skargi Partnerów, uzasadnienia zawieszeń, transparentność rankingu, rozsądne zasady zmian i mediacji.
- **Re-open trigger:** B2C / consumer-facing intermediation / zmiana realnego audience modelu.

### DSA — service classification

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

- Treści ofert dostarczane przez Partnerów i przechowywane/prezentowane na ich żądanie → hosting / prawdopodobnie online platform.
- Treści stworzone przez LogiMarket → własna odpowiedzialność redakcyjna LogiMarket.
- Terms/moderation transparency: art. 14.
- Hosting base duties: art. 16–18 nie są automatycznie wyłączone przez SME exemption art. 19.
- Dodatkowe Section 3/4 zależą od statusu przedsiębiorstwa i consumer exposure.
- `OfferContentSource=PARTNER/LOGIMARKET/MIXED` pozostaje **candidate requirement**, nie autoryzowaną automatycznie zmianą 56B1.

### LEG-MKT-08 — B2B-only gating / JDG Category B

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS`

**Scope:** wpływ najwcześniej na **56B2**, nie 56B1.

**Canonical buyer rules:**

- business identity verification = wymagane jako element B2B platform access;
- PL ecommerce: NIP + dane rejestrowe / verification;
- RFQ UE: VAT ID/VIES where applicable **lub** alternatywny national registry identifier;
- professional-purpose declaration = **OPTIONAL**, brak deklaracji nie może sam w sobie blokować checkoutu;
- PKD/CEIDG = evidence/risk signal, nie deterministyczny classifier;
- brak aktywnego VAT UE ≠ automatycznie brak statusu przedsiębiorcy;
- Category B (JDG, transakcja związana z działalnością, ale niezawodowa) może wystąpić mimo B2B platform access i wymaga obsługi praw wynikających z obowiązujących przepisów.

**56B2 candidate inputs:** `BuyerLegalContextSnapshot`, business identifier verification, verification method/source/timestamp, optional professional-purpose evidence, risk/review state. Nie projektować prostego boolean `PKD_MATCH => PROFESSIONAL`.

### LEG-MKT-09 / OMQ-MKT-11 — privacy / retention

**Counsel final:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `PENDING_DPO_SIGNOFF`

Legal Counsel Workstream nie jest już blockerem kwalifikacyjnym, ale **DPO pozostaje wymaganym reviewerem**.

**DPO handoff must resolve:**

- role LogiMarket/Partner per processing operation;
- Supabase DPA / subprocessor list / transfer mechanism / vendor evidence;
- Art. 13 notice for RFQ/checkout;
- cookie decision: session-only vs persistent cart;
- production cookie `Secure + HttpOnly + SameSite=Lax` + HTTPS/HSTS QA;
- final retention schedule and enforcement;
- ROPA/LIA/DSAR/breach response;
- future disclosure arrangement LogiMarket→Partner without global preclassification.

**56B1:** minimal seller data + no hardcoded controller role.  
**56B6:** `PrivacyProcessingContext`, `RetentionPolicySnapshot`, audit, anonymisation/delete metadata.

### Workstream B / LEG-MKT-05 / LEG-MKT-07 — PSP

**Counsel direction:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_DIRECTION_PROVIDER_EVIDENCE_REQUIRED`

```text
NO_LOGIMARKET_SELF_CUSTODY=YES
NO_LOGIMARKET_OPERATED_ESCROW=YES
TARGET_PAYMENT_FLOW=PREAUTH -> E7 -> CAPTURE
```

Do 56B3 wymagany jest konkretny licensed PSP evidence dla:

- preauth/capture/void/refund;
- seller onboarding/KYB;
- connected accounts / direct payout / split allocation;
- settlement/payout responsibility;
- error/timeout/retry semantics.

Nie wybierać jeszcze finalnego PSP ani settlement modelu w 56B1.

### Workstream D / LEG-MKT-06 — VAT / KSeF / accounting

**Counsel final KSeF/VAT:** `APPROVED_WITH_CONDITIONS`  
**PM current:** `APPROVED_WITH_CONDITIONS_ACCOUNTING_IMPLEMENTATION_OPEN`

- Owner przyjął wariant ostrożnościowy: miesięczna sprzedaż fakturowana prawdopodobnie > 10 000 zł brutto.
- Counsel przyjmuje issuing KSeF od 1.04.2026 i receiving od 1.02.2026 dla tego wariantu.
- `KSEF_SCHEMA=FA3`.
- Własna integracja API nie jest wymogiem MVP; możliwa obsługa przez biuro rachunkowe/program/oficjalne narzędzie.
- Partner PL: prowizja platformy co do zasady standardowo opodatkowana PL VAT zgodnie z realnym statusem.
- Partner UE B2B: nie modelować jako techniczne `VAT_RATE=0`; modelować `NP/reverse_charge` tam, gdzie warunki są spełnione.

**Scope:** KSeF/invoice refs najwcześniej **56B4**, nie 56B1.

### DAC7 / seller tax reporting

**Counsel final:** `MORE_FACTS_REQUIRED`  
**PM current:** `MORE_FACTS_REQUIRED_TAX_ADVISOR`

Do potwierdzenia przez Tax Advisor:

- reporting platform/operator scope;
- ecommerce marketplace;
- RFQ, gdy consideration/final sale może być poza platformą;
- outbound `/go/[id]` referral-only;
- excluded/reportable sellers;
- minimum dataset i reporting process.

Potential 56B1 impact: neutral seller legal/tax/registry identity może być użyteczna, ale **nie wolno dodawać globalnego `dac7Required=true` ani rozszerzonego datasetu tylko na podstawie roboczej analizy**.

Open DAC7 nie jest automatycznie uznany przez PM za blocker neutralnego 56B1 foundation; rozstrzyga to Owner/Engineering Readiness Review.

# 4. Poprawione mapowanie na sprinty

## 56B1 — Seller Identity and Offer Contract Classification

**DO:**

- seller legal identity foundation;
- seller tax/VAT/registry identifiers w zakresie zaakceptowanym po DPO/minimisation review;
- seller verification metadata;
- offer-to-seller relationship;
- istniejący project `contractModel` zgodnie z 56B0;
- seller/public-KYB classification;
- curated seller publication eligibility.

**DO NOT PUT IN 56B1:**

- `AGENCY` jako nowa wartość `contractModel`;
- buyer NIP/VAT eligibility;
- required professional-purpose declaration;
- PKD automatic legal classifier;
- `MarketplaceOrder` / `SellerOrder`;
- E2/E6/E7 lifecycle;
- `SellerAcceptanceDecision`;
- preauthorization/capture;
- payment allocation / settlement;
- retention cron jobs;
- KSeF API integration;
- global DAC7 reportable flag without Tax sign-off.

## 56B2 — Marketplace Order + SellerOrder + Buyer Legal Context

- buyer business identity and country-aware verification;
- `BuyerLegalContextSnapshot`;
- optional professional-purpose evidence;
- Category B handling;
- `MarketplaceOrder`;
- `SellerOrder`;
- `SellerOrderItem`;
- `SellerAcceptanceDecision`;
- E2/E6/E7 timestamps;
- accepted/rejected/expired lifecycle;
- immutable disclosure snapshots;
- receipt acknowledgement vs contract acceptance;
- multi-seller grouping if/when approved by logical model.

## 56B3 — PSP-neutral Payment / Fees / Settlement

- `PaymentOrchestration`;
- preauth/capture/void/refund references;
- PSP transaction refs;
- allocation refs;
- payout/settlement refs;
- success fee / platform fee records;
- provider capability evidence prerequisite;
- no self-custody / no LogiMarket escrow.

## 56B4 — Invoicing / KSeF / Refund / Chargeback

- Partner goods-invoice responsibility;
- LogiMarket platform-service invoice refs;
- KSeF FA(3) references/status if needed;
- corrections/refunds;
- chargebacks/disputes;
- accounting evidence.

## 56B6 — Audit / Privacy / Retention

- `PrivacyProcessingContext`;
- `RetentionPolicySnapshot`;
- audit events;
- retention execution metadata;
- anonymisation/delete audit;
- no predetermined global joint-controller flag.

# 5. Q1–Q8 — re-opening assessment

| Owner decision | Status | Re-open? | PM reasoning po Legal Counsel closure |
|---|---|---:|---|
| Q1 B2B_ONLY | RETAIN | NO | Kierunek potwierdzony; buyer gating implementować w 56B2 bez mandatory professional-purpose checkbox. |
| Q2 ecommerce PL / RFQ PL+EU | RETAIN | NO | Pozostaje bez zmian; identyfikatory/verifications są country-aware. |
| Q3 Partner może odrzucić po checkout | RETAIN | NO | Spójne z E2→E7 i seller acceptance. |
| Q4 jawna seller acceptance | RETAIN | NO | Legal potwierdził E7 jako target contract-formation event. |
| Q5 preauth→accept→capture | RETAIN_AS_TARGET | implementation only | Legal zaakceptował kierunek; konkretny PSP musi dostarczyć evidence przed 56B3. |
| Q6 RFQ quote non-binding | RETAIN_AS_TARGET | NO | Legal zaakceptował przy jednoznacznym disclaimerze i spójnym UI. |
| Q7 manual/editorial ranking | RETAIN | NO | P2B nie ma zastosowania przy pure B2B; DSA obligations nadal implementowane wg klasyfikacji. |
| Q8 manual suspension/publication | RETAIN | NO | Pozostaje właściwym centralnie moderowanym MVP. |

### Pozostałe otwarte workstreamy — nie re-open Q1–Q8

- `DPO_PRIVACY_ROLE_AND_VENDOR_SIGNOFF`
- `COOKIE_PERSISTENCE_AND_CONSENT_DECISION`
- `RETENTION_ENFORCEMENT`
- `DAC7_OPERATOR_SCOPE`
- `PSP_PROVIDER_CAPABILITY_EVIDENCE`
- `KSEF_ACCOUNTING_OPERATING_MODEL`
- `PARTNER_AGREEMENT_DRAFTING`
- `MARKETPLACE_TERMS_DRAFTING`
- `OWNER_ENGINEERING_56B1_READINESS`

# 6. Priorytety — zaktualizowany backlog

## P0-A — rzeczywiste blokery readiness przed 56B1

| ID | Zadanie | Status | Owner | Output | Blocks |
|---|---|---|---|---|---|
| P0-A1 | Legal Counsel qualification + corrections/errata | **DONE** | Legal + Owner | Consolidated Legal Counsel Record v1.0 | — |
| P0-A2 | Final legal seller disclosure / P2B / DSA / B2B legal constraints | **DONE** | Legal + Owner | legal consolidation sections 6–8 | — |
| P0-A3 | DPO constraints dla seller identity i future data flows | **OPEN** | DPO + Owner | minimal dataset, role constraints, vendor/privacy requirements | 56B1 readiness |
| P0-A4 | Update canonical gate register z finalnym legal evidence | **OPEN** | PM + Owner | updated canonical gate register | readiness |
| P0-A5 | Explicit `LM-MARKETPLACE-SCHEMA-56B1 READINESS REVIEW` | **OPEN** | Owner + Dev | `LM_MARKETPLACE_SCHEMA_56B1_READY=YES/NO` | authorization |

**Zasada:** Legal Counsel closure **nie** oznacza automatycznego kodowania 56B1. Żadnych zmian schema/DB przed P0-A5.

## P0-B — pre-production privacy/security/compliance blockers

- final Art. 13 notice w RFQ/Checkout;
- przebudowa `rfqLabels.consent` zgodnie z DPO decision;
- cookie session-only vs persistent decision;
- production `Secure + HttpOnly + SameSite=Lax` + HTTPS/HSTS browser QA;
- Supabase DPA/subprocessor/transfer review;
- ROPA/LIA/DSAR/breach-response process;
- final retention schedule + real enforcement before go-live;
- data-sharing arrangement LogiMarket→Partner per processing operation;
- DSA art. 14 + notice/action + statement-of-reasons implementation where applicable;
- KSeF operating process;
- DAC7 process if Tax confirms applicability;
- Marketplace Terms + Partner Agreement finalized before real commercial launch.

## P1 — next schema/application blockers

### Before 56B2

- buyer business identifiers + verification state;
- optional professional-purpose evidence (never mandatory checkout blocker);
- Category B handling;
- SellerAcceptanceDecision lifecycle;
- E2/E6/E7 timestamps;
- buyer/seller legal-context snapshots;
- final checkout/RFQ legal UX wording.

**Legal methodology itself is no longer pending counsel.**

### Before 56B3

- PSP shortlist + capability evidence;
- seller PSP/KYB ownership split;
- auth/capture/void/refund flow;
- settlement/commission model;
- no-self-custody/escrow proof;
- timeout/retry/error behavior.

### Before 56B4

- accounting operating model for KSeF FA(3);
- invoice responsibility implementation;
- refund/chargeback liability + technical executor;
- tax/accounting confirmation of production process.

## P2 — non-blocking hardening / later scale

- HMAC key lifecycle and analytics retention;
- sensitive-data warning in free-text `message`;
- anonymisation policy;
- seller-content IP licence / notice workflow;
- B2B warranty/returns policy;
- cross-border jurisdiction/law clauses;
- eIDAS/eID wallet monitoring;
- AI/recommendation review before automated ranking;
- future reseller remains disabled;
- future B2C triggers full P2B/consumer/DSA/tax re-review.

# 7. Architecture gaps — normalized current state

| Gap | Real state | Correct target | Sprint / workstream |
|---|---|---|---|
| Buyer companyName only | no real B2B eligibility | country-aware business identity + legal-context snapshot | 56B2 |
| Buyer NIP/VAT absent | gap | NIP PL; VAT ID/VIES where applicable; alternative registry ID for UE | 56B2 |
| Professional-purpose declaration | not implemented | optional evidence only; never mandatory checkout blocker | 56B2 |
| PKD legal classification | not implemented | evidence/risk signal only | 56B2 |
| Seller legal/tax identity insufficient | marketplace gap | `SellerLegalIdentity` + verification metadata | 56B1 |
| Seller acceptance missing | future core gap | `SellerAcceptanceDecision` + lifecycle | 56B2 |
| E2/E6/E7 audit timestamps | missing target state | explicit lifecycle timestamps | 56B2 |
| Preauth/capture orchestration | PSP not selected | PSP-neutral payment state backed by provider evidence | 56B3 |
| Abandoned cart expiry | absent | DPO-approved retention + cleanup | privacy / 56B6 |
| Session cookie Secure | explicit flag absent in audited source | secure production cookie + HTTPS/HSTS QA | security hardening |
| RFQ `consent` wording | DPO sufficiency unresolved | privacy notice; consent only where separately justified | privacy/UI |
| KSeF | no target integration | FA(3) accounting operating model first; API only if justified | 56B4 |
| DAC7 | no final reporting model | Tax scope + minimum dataset + reporting process | Tax + 56B1/later |
| P2B workflow | old worker assumed mandatory | not required while pure B2B; retain best practices | legal/app if trigger changes |
| DSA moderation | classification now legally established | implement base obligations in dedicated app/admin/privacy scope | later app/admin |
| Partner Agreement | no final production draft | short agency-based agreement with article-by-article check | Legal drafting |
| Marketplace Terms | no final production draft | E2/E7, RFQ, seller disclosure, B2B gating, DSA, payment roles | Legal/product drafting |

# 8. Updated Gate Register — PM current state

> `COUNSEL_VERDICT` records formal counsel outcome. `PM_CURRENT_STATUS` determines what remains operationally open. `APPROVED_WITH_CONDITIONS` means legal direction is settled but implementation conditions still exist.

| Gate | Counsel verdict | PM current status | Required next evidence/output | Earliest schema |
|---|---|---|---|---|
| LEG-MKT-01 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | Partner Agreement drafting; no del credere; preserve seller/intermediary roles | 56B1 |
| LEG-MKT-02 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | implement E2/E7 semantics in 56B2; PSP link in 56B3 | 56B2 |
| LEG-MKT-03 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | map seller identity/disclosure fields + DPO minimisation | 56B1 |
| LEG-MKT-04 / P2B | NOT_APPLICABLE | **NOT_APPLICABLE_WHILE_PURE_B2B** | re-open only on B2C/consumer exposure | none now |
| DSA | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | implement base obligations; verify SME status where relevant | application/legal |
| LEG-MKT-08 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | 56B2 business identity + optional evidence + Category B handling | 56B2 |
| LEG-MKT-09 | APPROVED_WITH_CONDITIONS | **PENDING_DPO_SIGNOFF** | DPA/vendor/transfers, roles, Art.13, cookie/privacy constraints | 56B1/56B6 |
| OMQ-MKT-01 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | ecommerce lifecycle implementation | 56B2 |
| OMQ-MKT-02 | APPROVED_WITH_CONDITIONS | **APPROVED_WITH_CONDITIONS** | RFQ disclaimer/UX implementation | application |
| OMQ-MKT-11 | APPROVED_WITH_CONDITIONS | **PENDING_DPO_SIGNOFF** | retention schedule + enforcement + privacy evidence | 56B6 |
| LEG-MKT-05 / PSP | APPROVED_WITH_CONDITIONS | **PROVIDER_EVIDENCE_REQUIRED** | licensed PSP capability/legal-operational evidence | 56B3 |
| LEG-MKT-06 / VAT-KSeF | APPROVED_WITH_CONDITIONS | **ACCOUNTING_IMPLEMENTATION_OPEN** | FA(3) operating process, accounting workflow | 56B4 |
| LEG-MKT-07 / payment liability | APPROVED directionally | **PROVIDER_EVIDENCE_REQUIRED** | PSP flow + refund/chargeback/settlement liability | 56B3/56B4 |
| DAC7 supplemental | MORE_FACTS_REQUIRED | **MORE_FACTS_REQUIRED_TAX_ADVISOR** | operator scope, RFQ/outbound, dataset, reporting process | potential 56B1/later |
| LEG-MKT-10 future reseller | deferred | **DEFERRED_FUTURE_RESELLER** | separate future activation/legal/tax/payment review | future |

### Canonical superseded assertions — do not reintroduce

```text
REJECTED_ANALYSIS_ASSERTION=ART_540_KC_AS_INTERMEDIARY_BASIS
REJECTED_ANALYSIS_ASSERTION=AGENCY_ALWAYS_REQUIRES_POWER_TO_CONTRACT
REJECTED_ANALYSIS_ASSERTION=LOGIMARKET_DEFAULT_DEL_CREDERE_LIABILITY
REJECTED_ANALYSIS_ASSERTION=P2B_AUTOMATICALLY_APPLIES_TO_PURE_B2B
REJECTED_ANALYSIS_ASSERTION=DSA_ART19_EXEMPTS_HOSTING_SECTION_2
REJECTED_ANALYSIS_ASSERTION=DSA_TERMS_ART13
REJECTED_ANALYSIS_ASSERTION=PKE_ART175_AS_COOKIE_RULE
REJECTED_ANALYSIS_ASSERTION=JOINT_CONTROLLERSHIP_AUTOMATIC
REJECTED_ANALYSIS_ASSERTION=MANDATORY_PROFESSIONAL_PURPOSE_CHECKBOX
REJECTED_ANALYSIS_ASSERTION=PKD_MATCH_AUTOMATIC_LEGAL_CLASSIFIER
REJECTED_ANALYSIS_ASSERTION=VIES_INVALID_MEANS_NOT_BUSINESS
REJECTED_ANALYSIS_ASSERTION=KSEF_FA1_FA2_2026
REJECTED_ANALYSIS_ASSERTION=EU_COMMISSION_VAT_RATE_ZERO
REJECTED_ARCHITECTURE_ASSERTION=BUYER_GATING_AND_PAYMENT_STATE_BELONG_TO_56B1
```

# 9. 56B1 readiness decision

```text
LEGAL_COUNSEL_WORKSTREAM_CLOSED=YES
LM_MARKETPLACE_SCHEMA_56B1_READY=NO
```

**Dlaczego nadal NO:**

1. Finalny DPO/privacy sign-off dla zakresu potrzebnego do seller identity/future data flows nie jest jeszcze zamknięty.
2. Canonical gate register wymaga aktualizacji do stanu po finalnym legal evidence.
3. Wymagany jest osobny Owner/Engineering Readiness Review.
4. Readiness review ma potwierdzić, że 56B1 pozostaje neutralnym seller foundation i nie importuje elementów 56B2/56B3/56B4/56B6.
5. Open DAC7 wymaga Tax sign-off, ale **nie jest automatycznie traktowany jako blocker całego neutralnego 56B1**; Owner/Engineering ma zdecydować, czy minimalny seller identity foundation może powstać bez tax-specific classification/dataset.

`LM_MARKETPLACE_SCHEMA_56B1_READY=YES` może zostać wydane dopiero po:

- DPO constraints/sign-off istotnych dla 56B1;
- aktualizacji canonical gate register;
- potwierdzeniu zgodności 56B1 z 56B0;
- potwierdzeniu scope boundary;
- formalnej decyzji Owner/Engineering.

**Legal Counsel closure ≠ automatic schema authorization.**

# 10. Plan działania — aktualny

| # | Działanie | Status | Role | Output |
|---:|---|---|---|---|
| 1 | Zamknąć i zachować finalny Legal Consolidation Record jako canonical legal input | **DONE** | Owner + PM | `LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0` |
| 2 | Zaktualizować PM plan do stanu po Legal closure | **DONE — this revision** | Owner + PM | `PM_Verification_and_Action_Plan.md v2.0` |
| 3 | DPO review/sign-off: roles per ACT, Art.13, Supabase DPA/subprocessors/transfers, cookie, retention | **NEXT** | DPO + Owner | DPO decision/evidence record |
| 4 | Tax review wyłącznie otwartych punktów: DAC7 ecommerce/RFQ/outbound + dataset/reporting | **OPEN PARALLEL** | Tax Advisor + Owner | DAC7 decision record |
| 5 | Zaktualizować canonical repo gate register z authorized Legal/DPO evidence | **OPEN** | PM + Owner | updated gate register |
| 6 | Przeprowadzić `LM-MARKETPLACE-SCHEMA-56B1 READINESS REVIEW` | **BLOCKED_BY_3/5** | Owner + Dev | `READY=YES/NO` |
| 7 | Jeśli READY=YES: uruchomić scope-locked 56B1 Seller Identity + Offer Contract Classification | **NOT_AUTHORIZED_YET** | Dev | 56B1 implementation + QA |
| 8 | Przygotować krótki Partner Agreement + Marketplace Terms z finalnego legal record | **TO_DO** | Legal drafting + Owner | production legal docs |
| 9 | Przed 56B3 zebrać evidence 2–3 licencjonowanych PSP dla auth/capture/settlement | **OPEN** | Owner + Dev + PSP | provider capability matrix |
| 10 | Przed go-live zamknąć privacy/security/retention/DSA/KSeF/DAC7-as-applicable | **OPEN** | Dev + DPO + Tax + Owner | production compliance evidence |

# 11. Otwarte pytania po zamknięciu kancelarii

## DPO / Privacy

1. Jakie role LogiMarket i Partner mają per processing operation dla przyszłego order/RFQ disclosure, bez globalnego założenia art. 26?
2. Czy obecny Supabase DPA/subprocessor/transfer setup spełnia wymagania i jakie evidence musi być zachowane?
3. Jaka finalna treść Art. 13 powinna być pokazana przy RFQ i checkout?
4. Czy cart cookie ma być session-only, czy persistent; jeśli persistent — jaki consent mechanism i retention?
5. Jakie finalne retention periods/triggers/enforcement obowiązują dla cart, RFQ, orders, clicks, auth i partner contacts?

## Tax / DAC7

6. Czy LogiMarket jest reporting platform operator dla ecommerce marketplace i jaki dokładnie dataset jest wymagany?
7. Jak klasyfikować RFQ, gdy final consideration/sale może być nieznane platformie?
8. Czy outbound `/go/[id]` referral-only jest poza zakresem, i na jakich faktach/opisie procesu opiera się ta kwalifikacja?

## PSP / Payments

9. Który licencjonowany PSP potwierdza preauth→E7→capture, void/refund, seller KYB, connected accounts/direct payout bez self-custody LogiMarket?

## Owner / Engineering

10. Po DPO handoff i gate-register update: czy minimalny neutralny 56B1 foundation może zostać autoryzowany przy nadal otwartym DAC7, z tax-specific classification pozostawioną do późniejszego rozszerzenia?

**Brak otwartych pytań do kancelarii w zakresie bazowej kwalifikacji modelu.** Kolejna korespondencja Legal jest potrzebna dopiero przy draftingu finalnych umów/regulaminów albo zmianie modelu (np. B2C, reseller, paid ranking, własne gwarancje/del credere).

# 12. Owner directives po PM review v2.0

```text
OWNER_BUSINESS_FACT_RECORD=RETAIN

INTERMEDIARY_FIRST_BUSINESS_INTENT=RETAIN
PARTNER_AS_SELLER_BUSINESS_INTENT=RETAIN
B2B_ONLY=RETAIN
ECOMMERCE_PL=RETAIN
RFQ_PL_EU=RETAIN
SELLER_EXPLICIT_ACCEPTANCE=RETAIN
PAYMENT_PREAUTH_ACCEPT_CAPTURE=RETAIN_AS_TARGET_NOT_IMPLEMENTATION_COMMITMENT
RFQ_NON_BINDING=RETAIN_AS_TARGET
MANUAL_RANKING=RETAIN
MANUAL_PARTNER_SUSPENSION=RETAIN

LEGAL_COUNSEL_WORKSTREAM_CLOSED=YES
LEGAL_INTERMEDIARY_BASIS=APPROVED_WITH_CONDITIONS_AGENCY_INTERMEDIARY
DEL_CREDERE=NOT_RESERVED
P2B_APPLICABILITY=NOT_APPLICABLE_WHILE_PURE_B2B
DSA_CLASSIFICATION=APPROVED_WITH_CONDITIONS
LEG_MKT_08_B2B_GATING=APPROVED_WITH_CONDITIONS
MANDATORY_PROFESSIONAL_PURPOSE_DECLARATION=NO
PKD_AUTOMATIC_LEGAL_CLASSIFIER=NO
VIES_AS_UNIVERSAL_BUSINESS_TEST=NO

GDPR_FUTURE_ROLE_ALLOCATION=PENDING_DPO_SIGNOFF
COOKIE_LEGAL_IMPLEMENTATION=PENDING_DPO_DECISION
RETENTION_ENFORCEMENT=PENDING_DPO_SIGNOFF

KSEF_CURRENT_APPLICABILITY=APPROVED_WITH_CONDITIONS_FA3
KSEF_API_REQUIRED_FOR_MVP=NO
DAC7_SCOPE=MORE_FACTS_REQUIRED_TAX_ADVISOR
PSP_ARCHITECTURE=APPROVED_DIRECTION_PROVIDER_EVIDENCE_REQUIRED

LM_MARKETPLACE_SCHEMA_56B1_READY=NO
CODE_CHANGES_REQUIRED=NO
PR_REQUIRED=NO
DB_WRITES_ALLOWED=NO

NEXT_ACTION=DPO_HANDOFF_AND_CANONICAL_GATE_REGISTER_UPDATE
PARALLEL_ACTION=TAX_DAC7_SIGNOFF
STOP_FOR_OWNER_REVIEW=YES
```

# 13. Verification notes

Niniejsza rewizja **nie ponawia samodzielnej opinii prawnej** i nie próbuje na nowo rozstrzygać przepisów. Aktualizuje PM state na podstawie źródeł dostarczonych w projekcie, w szczególności finalnego `LogiMarket_Konsolidacja_Ustalen_Kancelarii_Prawnej_v1_0`, który konsoliduje formalne odpowiedzi kancelarii, korekty/erraty i finalne wyjaśnienie B2B gatingu.

Finalny Legal Consolidation Record wskazuje m.in.:

- `LEGAL_COUNSEL_WORKSTREAM_CLOSED=YES`;
- `P2B=NOT_APPLICABLE_WHILE_PURE_B2B`;
- `MANDATORY_PROFESSIONAL_PURPOSE_DECLARATION=NO`;
- `PKD_AUTOMATIC_LEGAL_CLASSIFIER=NO`;
- `DPO_SIGNOFF_REQUIRED=YES`;
- `DAC7_TAX_SIGNOFF_REQUIRED=YES`;
- `PSP_PROVIDER_EVIDENCE_REQUIRED=YES_BEFORE_56B3`;
- `OWNER_ENGINEERING_READINESS_REQUIRED=YES`;
- `LM_MARKETPLACE_SCHEMA_56B1_READY=NO_CURRENTLY`.

Workers i pierwsza `LogiMarket_Weryfikacja_Prawna_Marketplace_B2B.docx` pozostają historycznym evidence/issue-spotting i **nie mogą być używane do ponownego wprowadzania twierdzeń oznaczonych w tym planie jako `REJECTED_ANALYSIS_ASSERTION`**.

## 14. Revision delta — v1 → v2

Najważniejsze zmiany względem poprzedniego PM planu:

- `LEGAL_COUNSEL_WORKSTREAM`: open → **CLOSED**;
- LEG-MKT-01: `MORE_FACTS_REQUIRED` → **APPROVED_WITH_CONDITIONS**;
- LEG-MKT-02 / OMQ-01 / OMQ-02: pending counsel → **APPROVED_WITH_CONDITIONS**;
- LEG-MKT-03: `MORE_FACTS_REQUIRED` → **APPROVED_WITH_CONDITIONS**;
- LEG-MKT-04/P2B: pending re-determination → **NOT_APPLICABLE_WHILE_PURE_B2B**;
- DSA: pending re-classification → **APPROVED_WITH_CONDITIONS**;
- LEG-MKT-08: `PENDING_EXTERNAL_COUNSEL` → **APPROVED_WITH_CONDITIONS**;
- professional-purpose declaration: candidate required → **OPTIONAL / NOT A CHECKOUT BLOCKER**;
- PKD: potential verifier → **EVIDENCE ONLY, NOT AUTOMATIC CLASSIFIER**;
- KSeF: `MORE_FACTS_REQUIRED` → **APPROVED_WITH_CONDITIONS / FA(3)**;
- LEG-MKT-09 / OMQ-11 pozostają otwarte operacyjnie, ale teraz wyłącznie jako **DPO SIGN-OFF**, nie counsel re-qualification;
- DAC7 pozostaje `MORE_FACTS_REQUIRED_TAX_ADVISOR`;
- PSP pozostaje `PROVIDER_EVIDENCE_REQUIRED` przed 56B3;
- `LM_MARKETPLACE_SCHEMA_56B1_READY` pozostaje **NO**, ale powód zmienił się z otwartych podstawowych gate'ów Legal na DPO + canonical gate update + Owner/Engineering Readiness Review.

---

**PM conclusion:** Legal model bazowy jest wystarczająco zamknięty, aby nie prowadzić dalszej kwalifikacyjnej korespondencji z kancelarią. Następny etap nie jest coding sprintem. Następny etap to DPO handoff, aktualizacja gate register i osobny Owner/Engineering 56B1 Readiness Review.
