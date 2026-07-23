# CONSTRAINTS, INDEXES AND INVARIANTS (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.1
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Integrity Rules

## 1. BUSINESS INVARIANTS & MONETARY CONSTRAINTS

- **Brak Floating-Point Money**: Wszystkie wartości finansowe (kwoty, ceny, podatki) muszą używać typów o stałej precyzji w docelowej bazie (np. w Drizzle jako `numeric` / logikalnie `DECIMAL`).
- **Przechowywanie Waluty**: Każda kwota musi być zapisywana z odpowiadającym jej kodem waluty `currency` (zgodnie z `DEC-DROP-20`: waluta `PLN`).
- **Korekty i Sumy**: Order totals muszą zgadzać się z item totals (ilość * cena) doliczając koszty dostawy, podatki oraz pomniejszając o zrealizowane zniżki i korekty faktur.
- **Rozdział Należności i Zobowiązań**: Należności klientów (Customer Receivables) oraz zobowiązania logistyczne i hurtowe wobec dostawców (Supplier Payables) są całkowicie rozdzielone księgowo. Zgodnie ze standardami księgowymi modelu odsprzedaży i ustaleniami z `DEC-DROP-05` oraz `DEC-DROP-08`, system nie używa pojęcia 'marketplace payout' ani mechanizmów podziału środków (escrow splits). Wszelkie rozliczenia z partnerem klasyfikowane są i wyliczane na bazie fakturowanych Trade Payables. `SUPPLIER_PAYABLE_BASIS=VALID_SUPPLIER_INVOICE_AND_ELIGIBLE_SUPPLIER_ORDER_BUY_VALUE`.

## 2. LOGICAL CANDIDATES FOR KEYS AND INDEXES

Poniższe reguły logiczne będą implementowane w przyszłych fizycznych schematach:

1. **Primary Keys**:
   - Typu `BIGSERIAL` (zgodnie z konwencją istniejącej bazy) lub w modelu biznesowym jako unikalny UUID tam, gdzie bezpieczeństwo predykcji identyfikatora jest krytyczne (np. płatności, faktury KSeF, logi audytowe).
2. **Foreign Keys**:
   - `supplier_order.customer_order_id` references `customer_order.id`.
   - `shipment.supplier_order_id` references `supplier_order.id`.
3. **No-Cascade Requirements**:
   - Skasowanie dostawcy (`partners`) lub `customer_order` nie powinno propagować na płatności lub wysyłki, operacje kasowania obiektów transakcyjnych powinny być powstrzymywane (RESTRICT na etapie bazy danych).
4. **Soft-Delete Applicability**:
   - Do zastosowania na encjach konfiguracyjnych, ale niezalecane dla encji transakcyjnych (tutaj zamykanie zamówień odbywa się przez zmianę statusu na `CANCELLED`).
5. **Append-Only Records**:
   - Wszelkie logi zmian (`domain_audit_log`, `supplier_order_event`, `payment_event`) będą miały strukturę insert-only. Zakaz operacji `UPDATE`.
6. **UTC Timestamp Policy**:
   - Wszystkie daty w bazie będą zapisywane w UTC (`withTimezone: true` w Drizzle).

## 3. SCOPED UNIQUENESS AND INTEGRITY CONSTRAINTS

Zabezpieczenia bazodanowe zapobiegające błędom biznesowym:

- **Idempotency Uniqueness**: `UNIQUE(psp_transaction_id, processing_status)` na transakcjach od PSP. Wymóg braku wielokrotnych obciążeń/zwrotów na podstawie tego samego eventu. Future schema sprint owner: `LM-DROP-SCHEMA-56B3`.
- **KSeF Identifier Uniqueness**: Unikalność na poziomie numeru nadanego z KSeF dla faktury (`ksef_invoice_id`). Przyszły sprint: `LM-DROP-SCHEMA-56B3`.
- **Invoice Correction Relationships**: Każda faktura korekta musi mieć klucz obcy `corrected_invoice_id` wskazujący na oryginalną fakturę sprzedażową z restrykcją (nie można skasować oryginału, dopóki istnieje korekta).
- **Tracking Identifier Scoping**: Unikalność numeru listu przewozowego przewoźnika `carrier_reference` w kontekście operatora logistycznego `carrier_code`.
- **Refund Allocation Integrity**: CONSTRAINT sprawdzający, czy suma częściowych `refund_allocation` do danego węzła nie przekracza globalnej autoryzowanej wartości w `payment`.
- **Settlement/Payable Allocation Integrity**: Relacja zapobiegająca zatwierdzeniu settlementu przekraczającego potwierdzoną wartość do wypłaty z `supplier_invoice`.
- **Status-Transition Guards**: Część sprawdzeń zostanie nałożona logiką aplikacji, jednak wybrane, krytyczne biznesowo statusy mogą podlegać Check constraint w tabelach np. rozliczenie wymaga wcześniejszej zgody.

## 4. RETENTION MATRIX BY DATA CATEGORY (LEG-GATE-08)

Zgodnie z wymaganiami minimalizacji PII i polityki retencji, schemat wymaga jawnego mapowania encji do klas retencji (Soft/Hard delete / Anonymization policy).

- **`PERSONAL_OPERATIONAL_DATA`**: Dane wymagane tylko do procesu dostawy (Imię, Nazwisko, Telefon na liście przewozowym, `customer_order_party_snapshot`). Czas retencji jest ograniczony celem przetwarzania logistyki (`TIME_LIMITED`). Następuje nadpisanie (anonymization) po zakończeniu cyklu operacyjnego i upływie ewentualnej rękojmi, jeśli dane nie występują na fakturze.
- **`KSEF_INVOICE_DATA`**: Wymóg zachowania przez 10 lat (`KSEF_STATUTORY_RETENTION_10_YEARS`). Obowiązuje dla `ksef_submission`, `customer_invoice`, `invoice_document_snapshot`.
- **`ACCOUNTING_RECORDS`**: Podlegają ustawowej retencji wynikającej z obowiązków przechowywania dokumentacji skarbowej i rozliczeń dostawców (`STATUTORY_RETENTION_SUBJECT_TO_TAX_CONFIRMATION`). Dotyczy `supplier_invoice`, `payment`, `refund`, `supplier_payable`, snapshoty adresów VAT.
- **`SECURITY_AUDIT_DATA`**: Logi bezpieczeństwa, `idempotency_key`, logi logowań. Podlegają czasowemu przechowywaniu i bezpiecznemu wygasaniu (`TIME_LIMITED_WITH_PERIODIC_REVIEW`).
- **`LEGAL_HOLD`**: Flaga systemowa wymuszająca zamrożenie retencji dla wybranych Aggregate Roots w przypadku trwającego sporu z dostawcą lub kupującym, nadpisująca wszelkie auto-anonimizacje dla podpiętych zasobów (`SUPPORTED`).
