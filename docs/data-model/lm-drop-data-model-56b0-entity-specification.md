# ENTITY SPECIFICATION (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Entity Specifications

Dokument zawiera wybrane specyfikacje wiodące. Całość struktury tabel należy do docelowych zadań implementacyjnych po uwolnieniu blokad prawnych.

| Field Type Classification | Description |
| :--- | :--- |
| `REFERENCE_FIELD` | Klucz obcy wskazujący na encję nadrzędną |
| `SNAPSHOT_FIELD` | Wartość zamrożona, skopiowana w momencie utworzenia, niemodyfikowalna |
| `DERIVED_FIELD` | Wyliczana, nie zapisywana wprost (bądź materiałowana dla optymalizacji) |
| `EXTERNAL_PROVIDER_FIELD` | Identyfikator od zewnętrznego partnera API (PSP, KSeF, Kurier) |
| `AUDIT_FIELD` | Oznaczenie twórcy, czasu utworzenia, modyfikacji |

---

## 1. customer_order
- **Existing Physical Candidate**: `orders`
- **Classification**: `EXISTING_EXTENSION`
- **Aggregate Owner**: Customer Order
- **Purpose**: Reprezentuje zamówienie klienta od strony B2B.
- **Primary Identifier**: `id` (bigint)
- **Logical Types**: `total_amount_net` (DECIMAL), `currency` (VARCHAR)
- **Immutable Rule**: Stan jest mutable poprzez dozwolone przejścia stanu (status_transitions).
- **Source of truth**: Core Database (LogiMarket)
- **PII / Financial Classification**: `PERSONAL_OPERATIONAL_DATA`
- **Retention Category**: `ACCOUNTING_RECORDS`
- **Proposed Future Schema Sprint**: `LM-DROP-SCHEMA-56B1` i `LM-DROP-ORDER-56C`

## 2. customer_order_item
- **Existing Physical Candidate**: `order_items`
- **Classification**: `EXISTING_EXTENSION`
- **Aggregate Owner**: Customer Order
- **Purpose**: Pozycja zamówienia klienta B2B.
- **Candidate FK**: `order_id` (REFERENCE_FIELD), `offer_id` (REFERENCE_FIELD), `supplier_order_id` (REFERENCE_FIELD)
- **Logical Fields**: `quantity` (INTEGER), `unit_price_net` (DECIMAL SNAPSHOT_FIELD), `vat_rate` (DECIMAL SNAPSHOT_FIELD)

## 3. supplier_order
- **Existing Physical Candidate**: N/A (Nowa tabela)
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Supplier Order
- **Purpose**: Wydzielone zamówienie dla pojedynczego dostawcy dropshippingowego (split).
- **Candidate FK**: `customer_order_id` (REFERENCE_FIELD), `supplier_id` (REFERENCE_FIELD to `partners`)
- **Logical Fields**:
  - `supplier_order_number` (VARCHAR)
  - `status` (VARCHAR)
  - `expected_fulfillment_date` (TIMESTAMP)
  - `supplier_acceptance_deadline` (TIMESTAMP)

## 4. supplier_order_item
- **Existing Physical Candidate**: N/A (Nowa tabela)
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Supplier Order
- **Purpose**: Snapshot parametrów rozliczeniowych dla dostawcy (buy price).
- **Candidate FK**: `supplier_order_id` (REFERENCE_FIELD), `customer_order_item_id` (REFERENCE_FIELD)
- **Logical Fields**:
  - `supplier_sku` (VARCHAR SNAPSHOT_FIELD)
  - `offer_title` (VARCHAR SNAPSHOT_FIELD)
  - `quantity` (INTEGER)
  - `unit_sell_price_net` (DECIMAL SNAPSHOT_FIELD)
  - `unit_buy_price_net` (DECIMAL SNAPSHOT_FIELD)
  - `vat_rate` (DECIMAL SNAPSHOT_FIELD)
  - `currency` (VARCHAR SNAPSHOT_FIELD)
  - `sell_total_net` (DECIMAL DERIVED_FIELD)
  - `buy_total_net` (DECIMAL DERIVED_FIELD)
  - `margin_snapshot` (DECIMAL SNAPSHOT_FIELD)
  - `fulfillment_model_snapshot` (VARCHAR SNAPSHOT_FIELD)
  - `offer_model_snapshot` (VARCHAR SNAPSHOT_FIELD)
- **Immutable Rule**: Pełna niemodyfikowalność kwot (immutable snapshots).
- **Source of truth**: Core Database (LogiMarket)

## 5. billing_address_snapshot & delivery_address_snapshot
- **Classification**: `LOGICAL_ONLY` (w implementacji fizycznej mogą to być tabele zależne lub kolumny jsonb)
- **Purpose**: Zamrożenie danych prawnych kontrahenta z momentu transakcji (`LEG-GATE-04` conditional logic).
- **Logical Fields**: `company_legal_name`, `tax_identifier` (NIP), `contact_person`, `contact_email`, `contact_phone`, `document_language` (SNAPSHOT_FIELDS)

## 6. payment
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Payment
- **Logical Fields**: `customer_order_id` (REFERENCE_FIELD), `amount` (DECIMAL), `currency` (VARCHAR), `status` (VARCHAR)
- **Proposed Future Schema Sprint**: `LM-DROP-SCHEMA-56B3`

## 7. refund
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Refund
- **Logical Fields**: `payment_id` (REFERENCE_FIELD), `amount` (DECIMAL), `reason_code` (VARCHAR), `status` (VARCHAR)
- **Proposed Future Schema Sprint**: `LM-DROP-SCHEMA-56B3`

## 8. supplier_payable
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Supplier Payable
- **Purpose**: Zarządzanie zobowiązaniem handlowym LogiMarket wobec dostawcy za zrealizowane `supplier_order`.
- **Logical Fields**: `supplier_id` (REFERENCE_FIELD), `supplier_order_id` (REFERENCE_FIELD), `amount_due` (DECIMAL), `currency` (VARCHAR), `status` (VARCHAR)

## 9. shipment
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Shipment
- **Purpose**: Tracking dostawy DAP per paczka/paleta.
- **Logical Fields**: `supplier_order_id` (REFERENCE_FIELD), `carrier_code` (VARCHAR), `carrier_reference` (VARCHAR EXTERNAL_PROVIDER_FIELD), `delivery_term_snapshot` (VARCHAR SNAPSHOT_FIELD)
- **Proposed Future Schema Sprint**: `LM-DROP-SCHEMA-56B2`

## 10. ksef_submission
- **Classification**: `NEW_MVP`
- **Aggregate Owner**: Customer Invoice
- **Purpose**: Tracking wymagań podatkowych i integracji API KSeF.
- **Logical Fields**: `ksef_invoice_id` (EXTERNAL_PROVIDER_FIELD), `ksef_reference_number` (EXTERNAL_PROVIDER_FIELD), `ksef_status` (VARCHAR)
- **Proposed Future Schema Sprint**: `LM-DROP-SCHEMA-56B3`
