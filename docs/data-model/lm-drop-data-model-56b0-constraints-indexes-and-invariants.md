# CONSTRAINTS, INDEXES AND INVARIANTS (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Integrity Rules

## 1. BUSINESS INVARIANTS & MONETARY CONSTRAINTS

- **Brak Floating-Point Money**: Wszystkie wartości finansowe (kwoty, ceny, podatki) muszą używać typów o stałej precyzji w docelowej bazie (np. w Drizzle jako `numeric` / logikalnie `DECIMAL`).
- **Przechowywanie Waluty**: Każda kwota musi być zapisywana z odpowiadającym jej kodem waluty `currency` (zgodnie z `DEC-DROP-20`: waluta `PLN`).
- **Korekty i Sumy**: Order totals muszą zgadzać się z item totals (ilość * cena) doliczając koszty dostawy, podatki oraz pomniejszając o zrealizowane zniżki i korekty faktur.
- **Rozdział Należności i Zobowiązań**: Należności klientów (Customer Receivables) oraz zobowiązania logistyczne i hurtowe wobec dostawców (Supplier Payables) są całkowicie rozdzielone księgowo. System nie używa pojęcia 'marketplace payout', lecz rozlicza zobowiązania z tytułu zakupu hurtowego (`DEC-DROP-05`, `DEC-DROP-08`).

## 2. LOGICAL CANDIDATES FOR KEYS AND INDEXES

Poniższe reguły logiczne będą implementowane w przyszłych fizycznych schematach:

1. **Primary Keys**:
   - Typu `BIGSERIAL` (zgodnie z konwencją istniejącej bazy) lub w modelu biznesowym jako unikalny UUID tam, gdzie bezpieczeństwo predykcji identyfikatora jest krytyczne (np. płatności, faktury KSeF).
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

## 4. RETENTION AND LEGAL HOLD

- **Legal Hold**: Wszelkie encje biznesowe mogą zostać zamrożone (legal hold) na czas trwania sporu. Zależność od `LEG-GATE-08`. Relacja logiczna na poziomie logów audytowych o braku możliwości ich anonimizacji/soft-delete do czasu zniesienia blokady prawnej.
- **Anonymization**: Retencja według Matrix by Data Category (Personal, Financial, Operational, Security), gdzie dane wrażliwe (PII) podlegają procesowi usuwania z bazy, pozostawiając same kwoty dla raportów księgowych po 10 latach lub 5 (zależnie od audytu podatkowego i legal).
