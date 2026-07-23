# LOGICAL ERD (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Logical Data Model

## 1. SCOPE AND SOURCE HIERARCHY

Niniejszy dokument przedstawia logiczny model danych w postaci relacyjnych diagramów (Entity-Relationship Diagrams) dla architektury dropshippingu MVP (Model A).

**Source Precedence Hierarchy:**
1. R2B approval and validation record
2. Normative Decision Register
3. Dropshipping Domain Contract
4. R2A supporting documents
5. CURRENT_REPOSITORY_FACT

Wszystkie wdrożenia produkcyjne oraz implementacje schematu (`56B1-56B6`) pozostają zablokowane ze statusem `BLOCKED_FOR_SCHEMA` do momentu uzyskania `FORMAL_EVIDENCE` (formalnych opinii prawnych, podatkowych, księgowych oraz od dostawców płatności).

## 2. CURRENT SCHEMA TO LOGICAL MODEL MAPPING

Odwzorowanie istniejących encji fizycznych na encje logiczne nowego modelu:

| Logical Entity | Current Physical Candidate | Classification |
| :--- | :--- | :--- |
| `customer_order` | `orders` | `EXISTING_EXTENSION` |
| `customer_order_item` | `order_items` | `EXISTING_EXTENSION` |
| `supplier_identity` | `partners` | `EXISTING_EXTENSION` (supplier_profile) |
| `offer_identity` | `offers` | `EXISTING_REUSE` |
| `cart_line` | `cart_items` | `EXISTING_REUSE` |
| `outbound_click` | `clicks` | `OUTSIDE_DROPSHIPPING_SCOPE` (`/go/[id]` wyłącznie click tracking) |

## 3. CORE MVP MERMAID ERD

```mermaid
erDiagram
    customer_order ||--|{ customer_order_item : contains
    customer_order ||--|{ supplier_order : splits_into
    customer_order ||--|| billing_address_snapshot : captures
    customer_order ||--|| delivery_address_snapshot : captures
    customer_order ||--|| customer_order_party_snapshot : captures

    supplier_order ||--|{ supplier_order_item : contains
    supplier_order ||--|{ supplier_confirmation : receives
    supplier_order ||--|{ supplier_order_event : logs

    customer_order_item }|--|| supplier_order_item : maps_to
    supplier_identity ||--o{ supplier_order : fulfills
```

## 4. FINANCE AND KSeF MERMAID ERD

```mermaid
erDiagram
    customer_order ||--|{ payment : requires
    payment ||--|{ payment_attempt : executes
    payment ||--|{ payment_event : logs

    payment ||--o{ refund : triggers
    refund ||--|{ refund_allocation : targets
    refund ||--|{ refund_event : logs

    customer_order ||--|| customer_invoice : billed_with
    customer_invoice ||--|{ customer_invoice_line : details
    customer_invoice ||--o{ invoice_correction : has
    customer_invoice ||--o| ksef_submission : reports

    supplier_order ||--|| supplier_invoice : settled_with
    supplier_invoice ||--|{ supplier_invoice_line : details

    supplier_invoice ||--o{ supplier_payable : creates
    supplier_payable ||--o{ supplier_payable_adjustment : modifies
    supplier_payable ||--|{ supplier_invoice_match : validated_by

    supplier_settlement_run ||--|{ supplier_settlement_item : groups
    supplier_settlement_item }|--|| supplier_payable : clears
```

## 5. FULFILLMENT AND RETURNS MERMAID ERD

```mermaid
erDiagram
    supplier_order ||--|{ shipment : dispatched_via
    shipment ||--|{ shipment_item : carries
    shipment ||--|{ shipment_event : tracks
    shipment ||--|{ tracking_event : logs

    supplier_order ||--o{ cancellation_request : receives
    cancellation_request ||--|{ cancellation_event : logs

    supplier_order ||--o{ return_request : receives
    return_request ||--|{ return_item : returns
    return_request ||--|{ return_event : logs
    return_request ||--o| supplier_recourse_case : escalates

    supplier_order ||--o{ complaint : raises
    complaint ||--|{ complaint_event : logs
```

## 6. AUDIT AND IDEMPOTENCY MERMAID ERD

```mermaid
erDiagram
    customer_order ||--o{ domain_event : emits
    supplier_order ||--o{ domain_event : emits
    payment ||--o{ domain_event : emits

    domain_event ||--|| domain_audit_log : persists

    idempotency_key ||--|| webhook_processing_attempt : secures
    webhook_delivery ||--|{ webhook_processing_attempt : executes

    domain_audit_log ||--o| legal_hold : locked_by
```

## 7. TEXTUAL CARDINALITY MATRIX

Wszystkie relacje mają charakter normatywny dla definicji modelu (LOGICAL_MODEL_PROPOSAL).

| Source Entity | Target Entity | Cardinality | Mandatory/Optional | Ownership | Delete Behavior | Decision/Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `customer_order` | `supplier_order` | 1 -> N | Mandatory target | Owner | RESTRICT / No-cascade | `DEC-DROP-17` |
| `customer_order` | `customer_order_item` | 1 -> N | Mandatory target | Owner | RESTRICT / No-cascade | `DEC-DROP-17` |
| `supplier_order` | `supplier_order_item` | 1 -> N | Mandatory target | Owner | RESTRICT / No-cascade | `DEC-DROP-17` |
| `supplier_order` | `supplier_confirmation` | 1 -> N | Optional target | Owner | RESTRICT | `DEC-DROP-10` |
| `supplier_order` | `supplier_order_event` | 1 -> N | Mandatory target | Owner | RESTRICT | Audit |
| `supplier_order` | `shipment` | 1 -> N | Optional target | Owner | RESTRICT | `DEC-DROP-16` |
| `shipment` | `shipment_item` | 1 -> N | Mandatory target | Owner | RESTRICT | `DEC-DROP-16` |
| `shipment` | `shipment_event` | 1 -> N | Mandatory target | Owner | RESTRICT | Fulfillment |
| `shipment` | `tracking_event` | 1 -> N | Optional target | Owner | RESTRICT | Fulfillment |

## 8. AGGREGATE-ROOT MARKERS

| Aggregate Root | Purpose |
| :--- | :--- |
| `customer_order` | Owner of checkout intent, overall buyer context, buyer level items |
| `supplier_order` | Owner of fulfillment contract with specific supplier |
| `payment` | Financial capture orchestration |
| `refund` | Financial refund orchestration |
| `customer_invoice` | Document mapping for buyer taxation |
| `supplier_invoice` | Document mapping for wholesale trade payable |
| `supplier_payable` | Supplier liability tracking |
| `supplier_settlement_run` | Batch processing of supplier trade payables |
| `shipment` | Tracking execution unit |
| `cancellation_request` | Post-order but pre-shipment intent to stop |
| `return_request` | Post-delivery return |
| `complaint` | Quality claims and warranty |

## 9. ENTITY LIFECYCLE CLASSIFICATION

- **Append-only log**: `domain_audit_log`, `domain_event`, `shipment_event`, `tracking_event`, `payment_event`, `webhook_delivery`
- **Immutable Snapshots**: `billing_address_snapshot`, `delivery_address_snapshot`, `customer_order_party_snapshot`
- **State Machine Nodes**: `customer_order`, `supplier_order`, `payment`, `refund`, `shipment`, `return_request`, `complaint`

## 10. MVP VS POST-MVP BOUNDARY

- **MVP**: Online Immediate Capture, Proforma Prepayment, Parcel, Pallet, Domestic (PL), Trading Margin model.
- **POST-MVP**: Internal Trade Credit (`LM-DROP-CREDIT-57C`), Manual Freight Ecommerce, Deferred Freight Ecommerce, External B2B Financing.

## 11. EXCLUDED ENTITIES AND CAPABILITIES

- `freight_quote` (POST_MVP_LOGICAL_EXTENSION)
- automated supplier registration flow
- internal trade credit
- external financing provider tables
- marketplace payout splits / escrow balances

## 12. UNRESOLVED EXTERNAL-VALIDATION DEPENDENCIES

Poniższe kwestie posiadają status `PENDING_EXTERNAL_VALIDATION` i blokują wdrożenie:
- Merchant of Record (`LEG-GATE-01`)
- Seller of Record (`LEG-GATE-01`)
- Prawna własność środków (`LEG-GATE-05`)
- Proces refundacji (`LEG-GATE-11`)
- Zgodność P2B dla scoringu dostawców (`LEG-GATE-14`)
- Odpowiedzialność za błędy cenowe (`LEG-GATE-09`, `DEC-DROP-09`)
- Przepływ płatności (`LEG-GATE-10`)
