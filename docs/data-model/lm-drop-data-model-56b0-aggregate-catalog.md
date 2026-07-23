# AGGREGATE CATALOG (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Aggregate Catalog

Wszystkie operacje bazodanowe oparte będą na podejściu Domain-Driven Design (DDD), gdzie modyfikacje stanu odbywają się poprzez korzenie agregatów (Aggregate Roots). Rozległe transakcje obejmujące wiele agregatów (giant transactional aggregate) są wzbronione, należy korzystać ze spójności ostatecznej (eventual consistency).

## 1. CUSTOMER ORDER

- **Aggregate Name**: Customer Order
- **Purpose**: Reprezentuje całkowite zapotrzebowanie klienta B2B zatwierdzone w koszyku.
- **Root Entity**: `customer_order`
- **Child Entities**: `customer_order_item`, `customer_order_party_snapshot`, `billing_address_snapshot`, `delivery_address_snapshot`
- **Commands**: `PlaceOrder`, `CancelOrder`
- **Emitted Events**: `OrderPlaced`, `OrderCancelled`
- **Invariants**: Wartość zamówienia musi być równa sumie pozycji. Każdy element musi mieć przypisanego poprawnego dostawcę.
- **Transaction Boundary**: Zamówienie klienta i pozycje zamówienia klienta tworzone w jednej transakcji bazy danych. Sub-zamówienia do dostawców (`supplier_order`) generowane w tej samej transakcji, aby zachować spójność.
- **Consistency Model**: Silna spójność wewnątrz agregatu. Spójność ostateczna dla modułu Płatności.
- **PII/Financial Classification**: `PERSONAL_OPERATIONAL_DATA`, `CUSTOMER_ORDER_DATA`
- **Retention Category**: Zależne od realizacji. Jeśli zrealizowane: `ACCOUNTING_RECORDS` (10 lat).
- **Mapped Decisions**: `DEC-DROP-17`, `DEC-DROP-23`
- **Mapped Legal Gates**: `LEG-GATE-04`, `LEG-GATE-08`

## 2. SUPPLIER ORDER

- **Aggregate Name**: Supplier Order
- **Purpose**: Reprezentuje wydzielony kontrakt wykonawczy skierowany do jednego, konkretnego dostawcy dropshippingowego.
- **Root Entity**: `supplier_order`
- **Child Entities**: `supplier_order_item`, `supplier_confirmation`, `supplier_order_event`
- **Commands**: `ConfirmAvailability`, `RejectOrder`, `MarkAsShipped`
- **Emitted Events**: `SupplierOrderConfirmed`, `SupplierOrderRejected`, `SupplierOrderShipped`
- **Invariants**: Pozycje sub-zamówienia nie mogą pochodzić od różnych dostawców. Kwoty margin i ceny hurtowe zapisywane w formacie immutable snapshot.
- **Transaction Boundary**: Zdarzenia potwierdzające statusy przez partnera.
- **Consistency Model**: Silna spójność z `customer_order` na etapie tworzenia.
- **PII/Financial Classification**: `PARTNER_OPERATIONAL_DATA`
- **Retention Category**: `ACCOUNTING_RECORDS`
- **Mapped Decisions**: `DEC-DROP-10`, `DEC-DROP-15`
- **Mapped Legal Gates**: `LEG-GATE-03`, `LEG-GATE-07`

## 3. PAYMENT

- **Aggregate Name**: Payment
- **Purpose**: Orkiestracja przepływów płatności, przechwytywania środków i callbacków z bramki PSP.
- **Root Entity**: `payment`
- **Child Entities**: `payment_attempt`, `payment_event`, `payment_provider_reference`
- **Commands**: `InitiatePayment`, `RecordCapture`, `RecordFailure`
- **Emitted Events**: `PaymentCaptured`, `PaymentFailed`
- **Invariants**: Wyeliminowanie podwójnego przechwytywania (duplicate capture). Kwota przechwycona należy do LogiMarket.
- **Transaction Boundary**: Próba płatności i log zdarzenia.
- **Idempotency Scope**: Idempotency na podstawie klucza z callbacku PSP.
- **Consistency Model**: Spójność ostateczna z propagacją zdarzenia do `customer_order`.
- **PII/Financial Classification**: `FINANCIAL_ACCOUNTING_DATA`, `PAYMENT_PROVIDER_EVENTS`
- **Mapped Decisions**: `DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-05`, `DEC-DROP-21`
- **Mapped Legal Gates**: `LEG-GATE-01`, `LEG-GATE-10`

## 4. REFUND

- **Aggregate Name**: Refund
- **Purpose**: Zarządzanie zwrotami płatności dla Kupującego z powodu odrzucenia przez dostawcę, rezygnacji lub reklamacji.
- **Root Entity**: `refund`
- **Child Entities**: `refund_item`, `refund_event`
- **Commands**: `RequestRefund`, `ExecuteRefund`
- **Emitted Events**: `RefundRequested`, `RefundExecuted`
- **Invariants**: Wyeliminowanie podwójnych zwrotów (duplicate execution). Suma częściowych zwrotów nie może przekroczyć kwoty całkowitej `payment`. Operacja kontrolowana centralnie przez LogiMarket.
- **Transaction Boundary**: Utworzenie intencji zwrotu oraz powiązanie z pozycjami.
- **Idempotency Scope**: Wymagany ścisły klucz idempotencji (idempotency key) na API zwrotu.
- **Mapped Decisions**: `DEC-DROP-12`
- **Mapped Legal Gates**: `LEG-GATE-11`

## 5. CUSTOMER INVOICE

- **Aggregate Name**: Customer Invoice
- **Purpose**: Dokumentacja sprzedaży na linii LogiMarket -> Kupujący.
- **Root Entity**: `customer_invoice`
- **Child Entities**: `customer_invoice_line`, `invoice_correction`, `invoice_correction_line`, `ksef_submission`, `invoice_document_snapshot`
- **Commands**: `IssueInvoice`, `IssueCorrection`, `SubmitToKsef`
- **Invariants**: Faktura przypisana do LogiMarket jako Sprzedawcy (`LOGIMARKET_ISSUES_CUSTOMER_INVOICE`).
- **PII/Financial Classification**: `KSEF_INVOICE_DATA`, `FINANCIAL_ACCOUNTING_DATA`
- **Retention Category**: `KSEF_STATUTORY_RETENTION_10_YEARS`
- **Mapped Decisions**: `DEC-DROP-02`, `DEC-DROP-03`, `DEC-DROP-18`
- **Mapped Legal Gates**: `LEG-GATE-02`

## 6. SUPPLIER INVOICE

- **Aggregate Name**: Supplier Invoice
- **Purpose**: Dokumentacja zakupu hurtowego na linii Dostawca -> LogiMarket.
- **Root Entity**: `supplier_invoice`
- **Child Entities**: `supplier_invoice_line`
- **Commands**: `RegisterSupplierInvoice`, `MatchSupplierInvoice`
- **Invariants**: Odbiorcą faktury jest LogiMarket. Służy do potwierdzenia powstania `supplier_payable`.
- **Mapped Decisions**: `DEC-DROP-02`, `DEC-DROP-03`
- **Mapped Legal Gates**: `LEG-GATE-02`

## 7. SUPPLIER PAYABLE

- **Aggregate Name**: Supplier Payable
- **Purpose**: Rejestracja zatwierdzonego zobowiązania handlowego LogiMarket wobec dostawcy. Płatność jest spłatą liability handlowego, nie marketplace payout (brak escrow w Model A).
- **Root Entity**: `supplier_payable`
- **Child Entities**: `supplier_payable_adjustment`, `supplier_invoice_match`
- **Commands**: `CreatePayable`, `AdjustPayable`
- **Invariants**: Zobowiązanie powiązane z zatwierdzoną fakturą hurtową dostawcy. Rejestrowane w oparciu o marżę (Trading Margin).
- **Mapped Decisions**: `DEC-DROP-05`, `DEC-DROP-06`, `DEC-DROP-07`
- **Mapped Legal Gates**: `LEG-GATE-01`, `LEG-GATE-10`

## 8. SUPPLIER SETTLEMENT

- **Aggregate Name**: Supplier Settlement Run
- **Purpose**: Realizacja wypłat dla dostawców na podstawie zgromadzonych zobowiązań (Trade Payables).
- **Root Entity**: `supplier_settlement_run`
- **Child Entities**: `supplier_settlement_item`, `supplier_settlement_event`
- **Commands**: `PlanSettlement`, `ExecuteSettlementRun`
- **Invariants**: Obejmuje zatwierdzone wpisy `supplier_payable`. Harmonogram dwutygodniowy (dni 1 i 15).
- **Mapped Decisions**: `DEC-DROP-08`

## 9. SHIPMENT

- **Aggregate Name**: Shipment
- **Purpose**: Reprezentacja jednostki wysyłkowej i jej przepływu transportowego (Parcels & Pallets MVP).
- **Root Entity**: `shipment`
- **Child Entities**: `shipment_item`, `shipment_event`, `tracking_event`, `carrier_reference`, `delivery_term_snapshot`
- **Commands**: `CreateShipment`, `UpdateTrackingState`
- **Invariants**: Wspiera wielopaczkowość (`DEC-DROP-16`). Jeden `shipment` odpowiada jednemu listowi przewozowemu (AWB). `/go/[id]` nie jest używane do trackingu. Warunki Incoterms: DAP.
- **Mapped Decisions**: `DEC-DROP-11`, `DEC-DROP-16`, `DEC-DROP-22`
- **Mapped Legal Gates**: `LEG-GATE-06`

## 10. CANCELLATION, 11. RETURN, 12. COMPLAINT

- **Aggregate Names**: Cancellation, Return, Complaint
- **Purpose**: Obsługa reklamacji, rezygnacji i zwrotów do magazynu partnera (B2B Returns, Warranty).
- **Root Entities**: `cancellation_request`, `return_request`, `complaint`
- **Invariants**: Odpowiedzialność dostawcy jako internal recourse. Zgłoszenia realizowane przez BOK LogiMarket w pierwszej linii.
- **Mapped Decisions**: `DEC-DROP-13`, `DEC-DROP-14`
- **Mapped Legal Gates**: `LEG-GATE-04`, `LEG-GATE-05`

## 13. AUDIT & IDEMPOTENCY INFRASTRUCTURE

- **Aggregate Name**: Audit and Idempotency
- **Purpose**: Systemowy szkielet dla ochrony procesów (webhooków) i wymuszania nieusuwalnego audytu dla mutacji finansowych i operacyjnych.
- **Root Entities**: `domain_audit_log`, `idempotency_key`, `webhook_delivery`
- **Invariants**: Zabezpieczenie przed podwójnym wykonaniem callbacku z systemu zewnętrznego (np. płatności). Ochrona dowodów przed wykasowaniem.
- **Mapped Decisions**: `DEC-DROP-09` (Audit Trail)
- **Mapped Legal Gates**: `LEG-GATE-08`
