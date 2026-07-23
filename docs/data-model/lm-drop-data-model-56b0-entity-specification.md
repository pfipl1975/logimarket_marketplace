# ENTITY SPECIFICATION AND INVENTORY (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.1
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Entity Specifications

Zgodnie z wymogami kompletności modelu, niniejszy inwentarz definiuje 56 unikalnych konceptów i encji w obrębie dropshippingu B2B (LogiMarket). 

| Field Type Classification | Description |
| :--- | :--- |
| `REFERENCE_FIELD` | Klucz obcy wskazujący na encję nadrzędną |
| `SNAPSHOT_FIELD` | Wartość zamrożona, skopiowana w momencie utworzenia, niemodyfikowalna |
| `DERIVED_FIELD` | Wyliczana, nie zapisywana wprost (bądź materiałowana dla optymalizacji) |
| `EXTERNAL_PROVIDER_FIELD` | Identyfikator od zewnętrznego partnera API (PSP, KSeF, Kurier) |
| `AUDIT_FIELD` | Oznaczenie twórcy, czasu utworzenia, modyfikacji |

---

## FULL ENTITY INVENTORY (56 CONCEPTS)

### A. Customer Order Domain
1. **`customer_order`** (Aggregate Root): Główne zapotrzebowanie klienta B2B zatwierdzone w koszyku. Existing Physical Candidate: `orders`.
2. **`customer_order_item`**: Pozycja zamówienia klienta B2B. Existing Physical Candidate: `order_items`.
3. **`customer_order_party_snapshot`**: Immutable snapshot danych osoby kupującej i kontekstu (IP, user agent).
4. **`billing_address_snapshot`**: Immutable snapshot adresu fakturowego (NIP, firma).
5. **`delivery_address_snapshot`**: Immutable snapshot adresu dostawy z momentu złożenia zamówienia.

### B. Supplier Order Domain
6. **`supplier_order`** (Aggregate Root): Wydzielone pod-zamówienie dla pojedynczego dostawcy dropshippingowego (split).
7. **`supplier_order_item`**: Snapshot parametrów rozliczeniowych dla dostawcy (buy price, sell price, margin).
8. **`supplier_confirmation`**: Rekord odpowiedzi dostawcy na zapotrzebowanie (akceptacja/odrzucenie/częściowe).
9. **`supplier_order_event`**: Append-only log zmian w cyklu życia zamówienia dostawcy.

### C. Payment Domain
10. **`payment`** (Aggregate Root): Reprezentacja przepływu finansowego dla `customer_order`.
11. **`payment_attempt`**: Próba obciążenia karty/konta.
12. **`payment_event`**: Append-only log zmian statusu płatności (webhooki od PSP).
13. **`payment_provider_reference`**: Link pomiędzy encją `payment` a identyfikatorem zewnętrznym z bramki PSP.

### D. Refund Domain
14. **`refund`** (Aggregate Root): Zarządzanie zwrotem środków do Kupującego B2B (orchestrator).
15. **`refund_item`**: Pozycja podlegająca zwrotowi finansowemu (towar, koszt wysyłki).
16. **`refund_event`**: Append-only log kroków procesu zwrotu (np. autoryzacja, wykonanie przez PSP).
17. **`refund_allocation`**: Mapa wiążąca `refund` ze źródłowym `payment` dla zapobieżenia over-refundingowi.

### E. Customer Invoicing and KSeF Domain
18. **`customer_invoice`** (Aggregate Root): Dokument sprzedaży LogiMarket -> Kupujący.
19. **`customer_invoice_line`**: Pozycja na dokumencie sprzedaży z wyliczonym VAT.
20. **`invoice_correction`**: Zależna korekta do istniejącej faktury w związku ze zwrotami lub błędami.
21. **`invoice_correction_line`**: Zmiana ilości/wartości na korekcie.
22. **`ksef_submission`**: Zapis cyklu wysyłki dokumentu do Krajowego Systemu e-Faktur.
23. **`invoice_document_snapshot`**: Niezmienna kopia wygenerowanego pliku/wizualizacji PDF z momentu wystawienia.

### F. Supplier Wholesale Payables Domain
24. **`supplier_invoice`** (Aggregate Root): Dokument zakupu hurtowego Dostawca -> LogiMarket.
25. **`supplier_invoice_line`**: Pozycja kosztowa na dokumencie dostawcy.
26. **`supplier_payable`** (Aggregate Root): Liability handlowe LogiMarket wobec dostawcy (Trade Payable, wymóg: nie używać 'marketplace payout').
27. **`supplier_payable_adjustment`**: Ręczna lub automatyczna korekta zobowiązania.
28. **`supplier_invoice_match`**: Rekord parujący `supplier_payable` z zaimportowaną `supplier_invoice`.
29. **`supplier_settlement_run`** (Aggregate Root): Zgrupowanie wypłat dla dostawców przetwarzane dwa razy w miesiącu (twice monthly).
30. **`supplier_settlement_item`**: Konkretne zobowiązanie opłacane w danym Run'ie.
31. **`supplier_settlement_event`**: Append-only log przebiegu płatności wychodzącej (wyeksportowanie do banku, potwierdzenie zapłaty).

### G. Shipment and Logistics Domain
32. **`shipment`** (Aggregate Root): Fizyczna wysyłka w modelu DAP (Parcel/Pallet).
33. **`shipment_item`**: Ilość towaru przypisana do danej paczki/palety (wsparcie wielopaczkowości).
34. **`shipment_event`**: Wewnętrzny log stanu przesyłki LogiMarket.
35. **`tracking_event`**: Raw zdarzenie zintegrowane od przewoźnika.
36. **`carrier_reference`**: Numer listu przewozowego (AWB) wydany przez przewoźnika.
37. **`delivery_term_snapshot`**: Zamrożone warunki Incoterms (DAP) z momentu zlecenia.

### H. Exception Management Domain
38. **`cancellation_request`** (Aggregate Root): Żądanie anulowania zamówienia przed jego fizycznym wysłaniem.
39. **`cancellation_event`**: Log procesowania anulacji z dostawcą.
40. **`return_request`** (Aggregate Root): Zgłoszenie zwrotu B2B po odebraniu paczki, kierowane na magazyn dostawcy.
41. **`return_item`**: Odnoszone produkty z ich stanem (nieodpakowane/uszkodzone).
42. **`return_event`**: Log zmian statusu RMA.
43. **`supplier_recourse_case`**: Mechanizm obciążenia zwrotnego dla dostawcy w przypadku zgłoszonej szkody transportowej po jego stronie.
44. **`complaint`** (Aggregate Root): Zgłoszenie rękojmi / reklamacji jakościowej z pierwszą linią wsparcia w LogiMarket.
45. **`complaint_event`**: Log dialogu z BOK i eskalacji do dostawcy.

### I. Audit, Security, and Idempotency Domain
46. **`domain_audit_log`** (Aggregate Root): Wzorzec centralnego logowania wszystkich zmian statusów o znaczeniu biznesowym.
47. **`idempotency_key`**: Gwarancja jednorazowego wykonania mutacji w systemie.
48. **`webhook_delivery`**: Zapis przychodzącego żądania HTTP z zewnątrz.
49. **`domain_event`**: Message broker payload w ramach spójności ostatecznej.
50. **`webhook_processing_attempt`**: Wynik parsowania webhooka.
51. **`legal_hold`**: Blokada uniemożliwiająca anonimizację dla celów retencji/postępowań.

### J. Baseline Catalog Interoperability (Existing)
52. **`supplier_identity`**: (Oparta na `partners`). Wymagane dodanie profili hurtowych dropshipping.
53. **`offer_identity`**: (Oparta na `offers`). Gwarancja braku auto-mutacji offerModel w wyniku zmian dostawy.
54. **`cart_line`**: Koszyk zachowujący intencje rozbicia na partnerów w dropshippingu.
55. **`outbound_click`**: Tabela weryfikacyjna dla end-pointu `/go/[id]`, który NIE MOŻE być używany do śledzenia logistyki dropshippingu.
56. **`freight_quote`**: Post-MVP encja reprezentująca zapytania o fracht opóźniony (Deferred Freight).

---

## SZCZEGÓŁOWA SPECYFIKACJA WYBRANYCH ENCJI (PRZYKŁADY)

### customer_order
- **Logical Types**: `total_amount_net` (DECIMAL), `currency` (VARCHAR)
- **Immutable Rule**: Stan jest mutable poprzez dozwolone przejścia stanu.
- **Retention Category**: `ACCOUNTING_RECORDS`

### supplier_order_item
- **Logical Fields**:
  - `supplier_sku` (VARCHAR SNAPSHOT_FIELD)
  - `offer_title` (VARCHAR SNAPSHOT_FIELD)
  - `quantity` (INTEGER)
  - `unit_sell_price_net` (DECIMAL SNAPSHOT_FIELD)
  - `unit_buy_price_net` (DECIMAL SNAPSHOT_FIELD)
  - `vat_rate` (DECIMAL SNAPSHOT_FIELD)
  - `currency` (VARCHAR SNAPSHOT_FIELD)
  - `margin_snapshot` (DECIMAL SNAPSHOT_FIELD)
- **Immutable Rule**: Pełna niemodyfikowalność kwot.

### ksef_submission
- **Logical Fields**: `ksef_invoice_id` (EXTERNAL_PROVIDER_FIELD), `ksef_reference_number` (EXTERNAL_PROVIDER_FIELD), `ksef_status` (VARCHAR)
