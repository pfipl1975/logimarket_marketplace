# LOGIMARKET — FINANCIAL AND TRANSACTION MODELS (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-23
**Cel:** Neutralne zestawienie wariantów przepływu środków i modeli prawnych na potrzeby analizy przez ekspertów.

Poniższe modele stanowią wyłączne opcje podlegające procesowi decyzyjnemu. Dokument ten ma na celu neutralne przedstawienie faktów dla doradców prawnych i podatkowych.

## MODEL A: Odsprzedaż (Buy/Sell Model)
LogiMarket występuje jako bezpośredni Sprzedawca dla Kupującego B2B, kupując wcześniej towar od Dostawcy.

1. **Merchant of Record**: LogiMarket [MODEL_ASSUMPTION]
2. **Seller of Record**: LogiMarket [MODEL_ASSUMPTION]
3. **invoice issuer**: LogiMarket [TAX_VALIDATION_REQUIRED]
4. **payment collector**: LogiMarket [PSP_CONFIRMATION_REQUIRED]
5. **ownership of funds**: LogiMarket (środki własne firmy po pobraniu) [LEGAL_VALIDATION_REQUIRED]
6. **supplier invoice flow**: Dostawca wystawia fakturę na LogiMarket za towar [TAX_VALIDATION_REQUIRED]
7. **customer invoice flow**: LogiMarket wystawia fakturę na Kupującego B2B za całe zamówienie [TAX_VALIDATION_REQUIRED]
8. **margin or commission**: Marża handlowa (Sell Price - Buy Price) [MODEL_ASSUMPTION]
9. **settlement timing**: Zgodnie z terminem płatności na fakturze dostawcy (np. 14 dni) [MODEL_ASSUMPTION]
10. **refund responsibility**: LogiMarket (wymaga pełnego wsparcia na koncie PSP np. NON-BINDING MARKET EXAMPLE — NOT SELECTED: PayU) [LEGAL_VALIDATION_REQUIRED]
11. **chargeback responsibility**: LogiMarket odpowiada finansowo przed PSP [PSP_CONFIRMATION_REQUIRED]
12. **VAT/KSeF implications**: LogiMarket rejestruje sprzedaż i zakup w KSeF [TAX_VALIDATION_REQUIRED]
13. **working-capital requirement**: Wysokie (LogiMarket może musieć zapłacić dostawcy przed otrzymaniem środków, jeśli klient ma kredyt kupiecki) [MODEL_ASSUMPTION]
14. **PSP/KYC/AML implications**: Niskie (standardowe konto Merchant) [PSP_CONFIRMATION_REQUIRED]
15. **contractual requirements**: Standardowa umowa handlowa zakupu B2B z Dostawcą [LEGAL_VALIDATION_REQUIRED]
16. **operational complexity**: Średnie (wymaga księgowania faktur zakupowych) [MODEL_ASSUMPTION]
17. **technical complexity**: Średnie (jedna faktura do klienta z systemu LogiMarket) [MODEL_ASSUMPTION]
18. **main risks**: Odpowiedzialność za rękojmię, wady towaru, konieczność obsługi zwrotów konsumenckich [LEGAL_VALIDATION_REQUIRED]

## MODEL B: Model Agencyjny / Marketplace (Agency Model)
LogiMarket występuje wyłącznie jako pośrednik dostarczający platformę. Kupujący nabywa towar bezpośrednio od Dostawcy.

1. **Merchant of Record**: LogiMarket (pobiera środki w imieniu własnym) lub hybrydowo [MODEL_ASSUMPTION]
2. **Seller of Record**: Partner Dropshippingowy (Dostawca) [MODEL_ASSUMPTION]
3. **invoice issuer**: Partner Dropshippingowy (Dostawca) [TAX_VALIDATION_REQUIRED]
4. **payment collector**: LogiMarket (na rachunek powierniczy / techniczny) [PSP_CONFIRMATION_REQUIRED]
5. **ownership of funds**: Środki powierzone (nie są majątkiem LogiMarket) [LEGAL_VALIDATION_REQUIRED]
6. **supplier invoice flow**: LogiMarket wystawia fakturę na Dostawcę za usługi pośrednictwa [TAX_VALIDATION_REQUIRED]
7. **customer invoice flow**: Dostawca wystawia fakturę bezpośrednio Kupującemu (LogiMarket tylko przekazuje PDF) [TAX_VALIDATION_REQUIRED]
8. **margin or commission**: Prowizja od zrealizowanej sprzedaży [MODEL_ASSUMPTION]
9. **settlement timing**: Po zrealizowaniu dostawy pomniejszone o prowizję (np. payout co tydzień) [MODEL_ASSUMPTION]
10. **refund responsibility**: Dostawca autoryzuje, LogiMarket wykonuje z zebranych środków [LEGAL_VALIDATION_REQUIRED]
11. **chargeback responsibility**: LogiMarket obciąża Dostawcę (potrącenie z przyszłych rozliczeń) [PSP_CONFIRMATION_REQUIRED]
12. **VAT/KSeF implications**: KSeF po stronie Dostawcy dla sprzedaży towaru [TAX_VALIDATION_REQUIRED]
13. **working-capital requirement**: Niskie [MODEL_ASSUMPTION]
14. **PSP/KYC/AML implications**: Bardzo wysokie. Przetrzymywanie środków osób trzecich rodzi wymogi licencji KIP/MIP (KNF) [LEGAL_VALIDATION_REQUIRED]
15. **contractual requirements**: Umowa powierzenia środków, umowa agencyjna [LEGAL_VALIDATION_REQUIRED]
16. **operational complexity**: Wysokie (weryfikacja czy dostawca wystawił FV) [MODEL_ASSUMPTION]
17. **technical complexity**: Wysokie (wiele faktur dla klienta w jednym zamówieniu) [MODEL_ASSUMPTION]
18. **main risks**: Kary od KNF za świadczenie usług płatniczych bez licencji, zablokowanie kont przez bank [LEGAL_VALIDATION_REQUIRED]

## MODEL C: Split Payment / Marketplace Payment Gateway
LogiMarket pełni rolę pośrednika (jak w Modelu B), ale przepływ środków jest od razu dzielony przez licencjonowanego dostawcę płatności (PSP).

1. **Merchant of Record**: MOR_ASSIGNMENT=OPEN — DEPENDS_ON_PSP_PRODUCT_AND_LEGAL_MODEL [PSP_CONFIRMATION_REQUIRED]
2. **Seller of Record**: Partner Dropshippingowy (Dostawca) [MODEL_ASSUMPTION]
3. **invoice issuer**: Partner Dropshippingowy (Dostawca) [TAX_VALIDATION_REQUIRED]
4. **payment collector**: Dostawca Płatności (PSP) bezpośrednio rozdziela środki w locie [PSP_CONFIRMATION_REQUIRED]
5. **ownership of funds**: Kupujący -> PSP -> Konto Dostawcy i Konto LogiMarket [LEGAL_VALIDATION_REQUIRED]
6. **supplier invoice flow**: LogiMarket wystawia fakturę prowizyjną [TAX_VALIDATION_REQUIRED]
7. **customer invoice flow**: Dostawca wystawia fakturę towarową [TAX_VALIDATION_REQUIRED]
8. **margin or commission**: Prowizja [MODEL_ASSUMPTION]
9. **settlement timing**: Automatycznie przez PSP z pominięciem kont LogiMarket [PSP_CONFIRMATION_REQUIRED]
10. **refund responsibility**: Wywoływane przez API z subkonta Dostawcy u PSP [LEGAL_VALIDATION_REQUIRED]
11. **chargeback responsibility**: Bezpośrednio na koncie Dostawcy u PSP [PSP_CONFIRMATION_REQUIRED]
12. **VAT/KSeF implications**: KSeF po stronie Dostawcy [TAX_VALIDATION_REQUIRED]
13. **working-capital requirement**: Zerowe [MODEL_ASSUMPTION]
14. **PSP/KYC/AML implications**: Niskie dla LogiMarket, wysokie dla PSP (każdy Dostawca przechodzi KYC w systemie np. NON-BINDING MARKET EXAMPLE — NOT SELECTED: Stripe Connect) [PSP_CONFIRMATION_REQUIRED]
15. **contractual requirements**: Umowa trójstronna PSP-Dostawca-LogiMarket [LEGAL_VALIDATION_REQUIRED]
16. **operational complexity**: Zewnętrzny proces KYC odrzucający dostawców [MODEL_ASSUMPTION]
17. **technical complexity**: Bardzo wysokie (Integracja platform API) [MODEL_ASSUMPTION]
18. **main risks**: Brak możliwości dołączenia małych dostawców przez wymogi KYC PSP [LEGAL_VALIDATION_REQUIRED]


---

## DECISION CARDS

### DEC-DROP-01
1. **Decision question**: Merchant of Record (MoR)
2. **Why the decision is required**: Określa podmiot prawny obciążający rachunek kupującego B2B, niezbędny do wyboru modelu bramki płatniczej.
3. **Options**: Model A, Model B, Model C
4. **Current architectural recommendation**: ARCHITECTURAL_RECOMMENDATION — NOT APPROVED
5. **Business consequences**: Rzutuje na to, z kim kupujący ma relację transakcyjną.
6. **Legal and tax consequences**: Wymaga zabezpieczenia zapisów o przepływie środków.
7. **Financial consequences**: Koszty procesowania kart.
8. **Operational consequences**: Obsługa fraudów.
9. **Technical consequences**: Architektura integracji z PSP.
10. **Risks**: Zablokowanie środków w modelu B bez licencji KNF.
11. **Reversibility**: Trudna po integracji.
12. **Required approvers**: CFO, Legal Counsel.
13. **Required evidence**: Opinia Prawna, Decyzja Podpisana.
14. **Blocked sprints**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E
15. **Questions that remain unanswered**: Który dostawca płatności zaoferuje najlepsze warunki B2B?

### DEC-DROP-02
1. **Decision question**: Seller of Record (SoR)
2. **Why the decision is required**: Decyduje o prawach własności towaru i tym, kto wystawia główną fakturę sprzedaży.
3. **Options**: LogiMarket jako Sprzedawca (Odsprzedaż) vs Partner jako Sprzedawca (Pośrednictwo)
4. **Current architectural recommendation**: ARCHITECTURAL_RECOMMENDATION — NOT APPROVED
5. **Business consequences**: Wpływ na zaufanie klientów i doświadczenie faktury (jeden dokument vs wiele).
6. **Legal and tax consequences**: Decyduje o podmiocie raportującym VAT i KSeF za sprzedaż towaru.
7. **Financial consequences**: Kwestia księgowania przychodów (kwota brutto vs prowizja).
8. **Operational consequences**: Proces wystawiania dokumentów w przypadku zwrotu.
9. **Technical consequences**: Struktura tabeli Invoices.
10. **Risks**: Brak akceptacji klientów korporacyjnych na wiele faktur od nieznanych dostawców.
11. **Reversibility**: Bardzo trudna.
12. **Required approvers**: Legal Counsel, CFO.
13. **Required evidence**: Opinia Podatkowa, Podpisana Decyzja.
14. **Blocked sprints**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
15. **Questions that remain unanswered**: Jak KSeF obsłuży transakcje trójstronne w czasie rzeczywistym?

### DEC-DROP-03
1. **Decision question**: Podmiot Wystawiający Fakturę
2. **Why the decision is required**: Ściśle powiązane z SoR, definiuje kto fizycznie generuje PDF i wysyła dane do KSeF.
3. **Options**: LogiMarket vs Partner Dropshippingowy
4. **Current architectural recommendation**: ARCHITECTURAL_RECOMMENDATION — NOT APPROVED
5. **Business consequences**: Jeden standard faktury dla klienta vs różnorodne formaty.
6. **Legal and tax consequences**: KSeF compliance.
7. **Financial consequences**: Sposób rozliczania VAT.
8. **Operational consequences**: Konieczność posiadania automatycznego generatora FV.
9. **Technical consequences**: Integracja KSeF na platformie vs jej brak.
10. **Risks**: Odpowiedzialność za błędy na fakturach.
11. **Reversibility**: Niska.
12. **Required approvers**: Finance.
13. **Required evidence**: Procedura księgowa.
14. **Blocked sprints**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
15. **Questions that remain unanswered**: Kiedy wchodzi obowiązkowy KSeF?

### DEC-DROP-04
1. **Decision question**: Podmiot Pobierający Płatność
2. **Why the decision is required**: Ściśle powiązane z MoR, definiuje przepływ gotówki (Cashflow).
3. **Options**: LogiMarket konto operacyjne, LogiMarket konto escrow, Bezpośrednio PSP sub-konta.
4. **Current architectural recommendation**: ARCHITECTURAL_RECOMMENDATION — NOT APPROVED
5. **Business consequences**: Opóźnienia w wypłatach dla dostawców.
6. **Legal and tax consequences**: Wymogi dyrektywy PSD2 (KIP/MIP).
7. **Financial consequences**: Płynność finansowa (Cash flow).
8. **Operational consequences**: Zespół ds. settlementów.
9. **Technical consequences**: Mechanizmy Payout w bazie danych.
10. **Risks**: Problemy z płynnością u dostawców przy długich payoutach.
11. **Reversibility**: Niska.
12. **Required approvers**: CFO.
13. **Required evidence**: Zestawienie PSP.
14. **Blocked sprints**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E
15. **Questions that remain unanswered**: Jak obsługiwane będą zagraniczne płatności?
