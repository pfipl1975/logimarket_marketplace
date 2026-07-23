# STATE AND TRANSITION MODEL (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping State and Transition Model

Zgodnie z wymaganiami MVP zdefiniowano 11 ortogonalnych (wzajemnie niezależnych) osi statusowych. Model zabrania łączenia tych stanów w jedną płaską kolumnę statusową dla całego zamówienia.

## 1. OSIE STATUSOWE

1. **Customer Order Status**: `DRAFT`, `PLACED`, `SUSPENDED_FOR_REVIEW`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED`
2. **Payment Status**: `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`
3. **Supplier Order Status**: `PENDING_CONFIRMATION`, `ACCEPTED`, `REJECTED`, `PROCESSING`, `SHIPPED`, `CANCELLED`
4. **Supplier Confirmation Status**: `AWAITING`, `FULLY_CONFIRMED`, `PARTIALLY_CONFIRMED`, `STOCK_FAILURE`
5. **Fulfillment Status**: `UNFULFILLED`, `PARTIALLY_FULFILLED`, `FULFILLED`
6. **Shipment Status**: `LABEL_CREATED`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`
7. **Cancellation Status**: `NOT_REQUESTED`, `REQUESTED_BY_BUYER`, `APPROVED`, `REJECTED`
8. **Refund Status**: `NONE`, `REQUESTED`, `EXECUTED`, `FAILED`
9. **Return Status**: `NONE`, `REQUESTED`, `AUTHORIZED`, `RETURNED_TO_SUPPLIER`, `REJECTED`
10. **Complaint Status**: `NONE`, `OPENED`, `ESCALATED`, `RESOLVED_WARRANTY`, `RESOLVED_REJECTED`
11. **Settlement Status**: `UNSETTLED`, `INVOICE_MATCHED`, `PLANNED_FOR_RUN`, `PAID`

## 2. SCENARIUSZE TRANZYCJI (TRANSITION PATHS)

### SCENARIUSZ: ONLINE CAPTURE SUCCESS
- **Current State**: Payment `PENDING`
- **Target State**: Payment `CAPTURED` -> Customer Order `PLACED` -> Supplier Order `PENDING_CONFIRMATION`
- **Trigger**: Webhook z PSP o pomyślnym obciążeniu karty.
- **Idempotency Key**: `psp_transaction_id`
- **Emitted Event**: `PaymentCaptured`
- **Relevant Decision**: `DEC-DROP-21`, `LEG-GATE-10`
- **Side Effects**: Asynchroniczne wygenerowanie powiadomień dla dostawców o konieczności akceptacji zamówienia.

### SCENARIUSZ: ONLINE CAPTURE FAILURE
- **Current State**: Payment `PENDING`
- **Target State**: Payment `FAILED`
- **Side Effects**: Użytkownik proszony o zmianę metody lub ponowną próbę.
- **Prohibited Behavior**: Retries cannot create duplicate captures.

### SCENARIUSZ: DUPLICATE PSP CALLBACK
- **Current State**: Payment `CAPTURED`
- **Action**: Odrzucenie webhooka na bazie walidacji (Idempotency Scope). Zapis do `webhook_processing_attempt` jako `duplicate_ignored`.

### SCENARIUSZ: SUPPLIER ACCEPTANCE
- **Current State**: Supplier Order `PENDING_CONFIRMATION`
- **Target State**: Supplier Order `ACCEPTED`
- **Preconditions**: Zmieszczenie się w `acceptance deadline/SLA`.
- **Actor**: Supplier (przez e-mail/panel dostawcy).
- **Emitted Event**: `SupplierOrderConfirmed`

### SCENARIUSZ: SUPPLIER REJECTION AFTER CAPTURE (Overselling / Stock Failure)
- **Current State**: Supplier Order `PENDING_CONFIRMATION`, Payment `CAPTURED`
- **Target State**: Supplier Order `REJECTED` (Stock Failure)
- **Trigger**: Brak towaru po stronie Partnera.
- **Side Effects**: Oznaczenie zapotrzebowania na zwrot (`AUTO_REFUND_REQUIRED`). Utworzenie intencji `RefundRequested` w systemie.
- **Relevant Decision**: `DEC-DROP-10`

### SCENARIUSZ: AUTOMATIC REFUND REQUIREMENT
- **Current State**: Refund `REQUESTED`
- **Target State**: Refund `EXECUTED`
- **Preconditions**: Payment musi znajdować się w stanie `CAPTURED`. Refund dotyczy części lub całości zamówienia pomniejszonego o już wykonane zwroty.
- **Actor**: Centralnie przez Operatora LogiMarket (zgodnie z `DEC-DROP-12`, `LEG-GATE-11`).
- **Prohibited Behavior**: Podwójny zwrot kwoty.

### SCENARIUSZ: PROFORMA PAYMENT CONFIRMATION
- **Flow**: Order Placed -> Awaiting Proforma Payment -> Payment Booking Pending -> Payment Confirmed -> Paid Awaiting Supplier Acceptance.
- **Relevant Decision**: `DEC-DROP-21`

### SCENARIUSZ: PRICE-ERROR SUSPENSION
- **Current State**: Customer Order `PLACED`
- **Target State**: Customer Order `SUSPENDED_FOR_REVIEW`
- **Trigger**: Znaczący błąd cenowy wyłapany przez system lub dostawcę.
- **Preconditions**: Wymagana manualna decyzja prawna (`MANUAL_LEGAL_DECISION_REQUIRED`). Złożenie oświadczenia o uchyleniu się od skutków błędu (`WRITTEN_AVOIDANCE_DECLARATION_WHERE_APPLICABLE`).
- **Relevant Decision**: `DEC-DROP-09` (Odpowiedzialność za błąd). `AUDIT_TRAIL_REQUIRED`.

### SCENARIUSZ: PARTIAL FULFILLMENT REQUIRES BUYER ACCEPTANCE
- **Current State**: Supplier Confirmation Status `PARTIALLY_CONFIRMED`
- **Action**: Zatrzymanie zlecenia zwrotu i wysyłki do czasu uzyskania zgody od Kupującego B2B. Zabrania się `silent partial fulfillment`.

### SCENARIUSZ: MULTI-SHIPMENT FULFILLMENT
- **Current State**: Supplier Order `PROCESSING`
- **Target State**: Shipment `LABEL_CREATED`
- **Invariants**: Wiele obiektów Shipment może odnosić się do jednego Supplier Order (`DEC-DROP-16`).

### SCENARIUSZ: PARTIAL REFUND
- **Current State**: Payment `CAPTURED`
- **Target State**: Utworzenie `Refund` dla wskazanych `refund_allocation`.
- **Side Effects**: Korekta faktury sprzedaży (KSeF).

### SCENARIUSZ: RETURN AND SUPPLIER RECOURSE
- **Flow**: Buyer wnosi o zwrot -> Walidacja B2B (czy dopuszczalne w świetle `LEG-GATE-04`) -> Zwrot zaakceptowany -> Odesłanie towaru do magazynu dostawcy (`DEC-DROP-14`) -> Kontrola zwrotu -> Przypisanie `supplier_recourse_case` do dostawcy w zależności od wady/przyczyny.

### SCENARIUSZ: COMPLAINT AND INVOICE CORRECTION
- **Flow**: Buyer zgłasza wadę (Complaint `OPENED`) -> LogiMarket Support (`FIRST_LINE_SUPPORT=LOGIMARKET` - `DEC-DROP-13`) -> Zgłoszenie eskalowane do dostawcy -> Zakończenie -> Wystawienie `invoice_correction` dla Buyer'a, korekta rozliczeń `supplier_payable_adjustment` (trade payable adjustment).

### SCENARIUSZ: FAILED SUPPLIER SETTLEMENT
- **Current State**: Settlement Status `PLANNED_FOR_RUN`
- **Target State**: Settlement `UNSETTLED` (wskutek awarii banku lub blokady)
- **Compensating Action**: Automatyczne ponowne zaplanowanie na kolejny interwał i notyfikacja wsparcia finansowego.
