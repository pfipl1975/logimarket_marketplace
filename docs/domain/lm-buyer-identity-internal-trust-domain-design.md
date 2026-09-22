# LM Buyer Identity and Internal Trust Domain Design

Status: proposed schema/domain contract for Owner review
Sprint: `LM-BUYER-INTERNAL-TRUST-SCHEMA-13B`
Scope: design only; no runtime, schema, migration, database, or external-registry implementation

## 1. Purpose and scope

This document defines the smallest production-grade Buyer trust domain that can later supply a server-authoritative `BuyerLegalContextInput` to `executeMarketplaceCheckout`. It separates the authenticated human, the represented legal organization, authority to act for that organization, durable identifiers, verification evidence, transaction policy, and the immutable order snapshot.

The design does not wire checkout, implement organization onboarding, implement Admin verification, change the physical schema, or choose an external registry. Anonymous browsing and cart use remain possible; a future canonical checkout entry point requires an authenticated user and trusted Buyer Organization context.

## 2. Authoritative Owner decisions

| Decision | Contract |
|---|---|
| Marketplace checkout authentication | Required |
| Buyer Organization | Required |
| Auth User to Buyer Organization membership | Required and resolved server-side |
| MVP verification producer | Internal manual LogiMarket Admin |
| External registry/provider | Deferred; no provider is selected here |
| Verification evidence | Historical, auditable, append-only events |
| Category-B decision | Transaction-scoped, not an organization attribute |
| Category-B automation | Out of scope |
| Existing Buyer legal-context snapshot | Preserved |

These decisions are not reopened by this design.

## 3. Current-state evidence

The design is based on the following current repository contracts:

- `src/app/actions.ts` and `src/components/CheckoutModal.tsx`: public checkout currently calls `submitCheckout` with browser-declared `companyName`, `contactName`, `email`, optional `phone`, and optional `message`.
- `src/lib/checkout/marketplace-checkout-core.ts`: `executeMarketplaceCheckout` validates Buyer readiness, Seller readiness, and cart stability, then atomically creates Buyer legal-context/contact snapshots, a `marketplace_orders` row, Seller disclosures/orders/snapshots/items, and clears the cart. It accepts an optional `buyerAuthUserId` but does not build trusted Buyer identity.
- `src/lib/marketplace/buyer-legal-context.ts`: `BuyerLegalContextInput` requires business name/country, at least one complete tax or registry identifier pair, verification state/method/source/time for verified businesses, and a separate Category-B/legal-review result. PL checkout fails closed unless business identity is verified; non-PL remains `POLICY_DECISION_REQUIRED`.
- `src/lib/buyer/buyer-identity-core.ts`: the provider abstraction is fail-closed. Its production implementation is `UnavailableBuyerBusinessIdentityProvider`; tests use fakes. There is no persistent Buyer Organization or membership domain.
- `src/lib/schema.ts`: `buyer_legal_context_snapshots` is already the transaction snapshot. `marketplace_orders.buyer_auth_user_id` records account ownership. These are not durable Buyer identity tables.
- `src/lib/schema.ts` and Seller Admin domain code: Seller identity uses normalized legal identity/tax/registry rows, soft retirement, current-event references, and immutable verification events. This is a useful pattern, but Buyer lifecycle and governance justify Buyer-specific tables.
- `src/lib/auth/partner-membership.ts`: existing access is server-authoritative and resolves an authenticated Auth UUID plus an active database membership. Client-supplied ownership is insufficient.
- `src/lib/auth/guards.ts`: manual verification must use the existing `requireAdmin()` server guard and record its returned Auth UUID as actor evidence.
- Runtime migration `0006` protects Seller verification history from update/delete. A future Buyer migration should apply an equivalent append-only database guard to Buyer verification events.

No database connection was necessary for this design.

## 4. Domain boundaries

### 4.1 Auth User

The Auth User is the authenticated human account sourced from Supabase Auth. Its UUID is a logical external identity reference. It is not a company and is not proof of authority over any Buyer Organization. As with `partner_user_memberships`, no physical cross-schema FK to `auth.users` is required; server-side session resolution and membership lookup establish authority.

### 4.2 Buyer Organization

`buyer_organizations` is the one durable representation of a Buyer legal business entity. It stores only the legal name and jurisdiction needed by the current canonical checkout plus the minimal current verification state. Browser input may create or propose `pending` data only through a future controlled Server Action. Browser input can never create a verified organization.

It is deliberately not a CRM profile: no contact person, phone, marketing, risk score, payment, shipping, or Category-B fields belong here.

### 4.3 Buyer Organization Membership

`buyer_organization_memberships` links Auth Users and Buyer Organizations many-to-many:

- one Auth User may legitimately represent multiple organizations;
- one organization may have multiple authorized users;
- only an `active` membership with a permitted role authorizes future checkout;
- a client-supplied organization ID is only a selector and is never authority.

The minimal roles are `organization_admin` and `authorized_buyer`. Both may represent the organization in future checkout while active. `organization_admin` reserves a narrow future organization-membership management distinction; it does not grant LogiMarket Admin verification authority.

Membership states are `active`, `inactive`, and `revoked`. Inactive is reversible suspension; revoked is an ended grant. No invitation or corporate IAM workflow is designed here.

### 4.4 Buyer identifiers

Durable identifiers are split into `buyer_tax_identifiers` and `buyer_registry_identifiers`, matching the existing canonical tax/registry pairs without forcing Seller and Buyer to share governance tables.

Supported identifier vocabularies reuse current repository terminology:

- tax: `tax_id`, `vat_id`;
- registry: `commercial_register`, `statistical_id`.

PL tax identifiers reuse canonical `PL:NIP` normalization. Non-PL rows can be stored using the existing country/type normalization convention, but their existence does not authorize checkout while non-PL policy remains unresolved.

Identifier values are immutable after insertion. Correction or replacement retires the old row and inserts a new pending declaration. A currently trusted identifier is identified by `trusted_by_verification_event_id`; this pointer is set only by the trusted verification transaction and cleared on invalidation or revocation. It is never client-writable.

### 4.5 Buyer verification evidence

`buyer_organization_verification_events` stores immutable, Buyer-specific evidence. An event captures the organization identity and identifier values seen at decision time, actor provenance, method/source/reference, prior state, outcome, and timestamp. It does not store provider payloads or uploaded documents.

MVP trusted producer: an authenticated LogiMarket Admin guarded by `requireAdmin()`. Future external adapters may emit the same event contract without replacing Buyer Organization or requiring provider-specific columns.

### 4.6 Current Buyer trust state

The model uses a small denormalized current state plus immutable event history:

- `buyer_organizations.verification_status` is the efficient current state;
- `current_verification_event_id` points to the state-defining event owned by the same organization;
- `verified_at` is populated only for `verified`;
- selected active identifier rows point back to that same verified event through `trusted_by_verification_event_id`.

The trusted read model accepts an organization only when all of these values agree. A mismatch, missing event, retired identifier, ambiguous trusted identifier, or unsupported jurisdiction fails closed. The event log is authoritative evidence; denormalized fields are a transactionally maintained read optimization.

### 4.7 Transaction legal context and Category B

Organization verification proves only the durable business identity reviewed by a trusted producer. It does not prove the legal character of a particular purchase.

`BUYER_ORGANIZATION_VERIFIED` does not imply `CATEGORY_B_NOT_APPLICABLE`.

`categoryBStatus`, `legalContextReviewState`, and optional `professionalPurposeEvidence` remain transaction-scoped inputs. They must not be added to `buyer_organizations` or verification events as permanent Buyer state.

### 4.8 Immutable transaction snapshot

The existing `buyer_legal_context_snapshots` and contact snapshot remain unchanged. Once canonical checkout succeeds, later organization edits, membership revocation, identifier retirement, or verification revocation do not rewrite old orders or snapshots.

Classification: `IMMUTABLE_TRANSACTION_SNAPSHOT_BY_DOMAIN_MODEL`.

## 5. Entity relationship model

```text
Supabase auth.users (logical reference only)
        1
        |
        +---< buyer_organization_memberships >---+
                                                  |
                                                  1
                                      buyer_organizations
                                         |       |       |
                                         |       |       +--- current_verification_event_id
                                         |       |
                                         |       +---< buyer_registry_identifiers
                                         |
                                         +---< buyer_tax_identifiers
                                         |
                                         +---< buyer_organization_verification_events

authenticated Auth UUID
  + active permitted membership resolved server-side
  + verified organization and matching current event
  + active identifiers trusted by that same event
  + separate transaction policy decision
        -> BuyerLegalContextInput
        -> existing buyer_legal_context_snapshots
        -> marketplace_orders.buyer_auth_user_id
```

## 6. Proposed physical schema

The following is migration-ready design, not SQL. Repository conventions are snake_case table/column names, `bigserial` primary keys, `timestamptz`, varchar checks for bounded state vocabularies, named FKs/checks/indexes, and restrictive deletion for evidence.

Column purpose labels:

- `CHECKOUT`: required to build canonical Buyer context;
- `MEMBERSHIP`: required for authority/security;
- `EVIDENCE`: required for verification evidence/current trust;
- `AUDIT`: required for traceability;
- no future-only columns are proposed.

### 6.1 `buyer_organizations`

Purpose: one durable Buyer legal entity and its current trust read state.
Primary key: `id bigserial`.

| Column | Type / nullability | Purpose | Class |
|---|---|---|---|
| `id` | bigint, PK, not null | Organization identity | CHECKOUT, MEMBERSHIP |
| `legal_name` | varchar(255), not null | Current declared legal name | CHECKOUT |
| `jurisdiction_country` | varchar(2), not null | ISO alpha-2 jurisdiction | CHECKOUT |
| `verification_status` | varchar(20), not null, default `pending` | Current state: `pending`, `verified`, `rejected`, `revoked` | EVIDENCE |
| `current_verification_event_id` | bigint, nullable | State-defining evidence; null only for initial pending state | EVIDENCE |
| `verified_at` | timestamptz, nullable | Current verification time; present only when verified | CHECKOUT, EVIDENCE |
| `created_at` | timestamptz, not null, default now | Creation audit | AUDIT |
| `updated_at` | timestamptz, nullable | Current-row mutation audit | AUDIT |

Constraints and indexes:

- `chk_buyer_organizations_country`: `jurisdiction_country ~ '^[A-Z]{2}$'`.
- `chk_buyer_organizations_verification_status`: status is one of the four values above.
- `chk_buyer_organizations_verification_consistency`: `verified` requires event and `verified_at`; `rejected`/`revoked` require event and null `verified_at`; `pending` requires null `verified_at` and may reference an invalidation event.
- index `(verification_status)` for Admin/readiness queries.
- after the events table exists, composite FK `(current_verification_event_id, id)` references event `(id, buyer_organization_id)` with `ON DELETE RESTRICT`. This prevents cross-organization current-event pointers.

Lifecycle: created `pending`; only trusted domain transitions change trust state. Legal-name/country changes while trusted must first invalidate trust atomically. Organization rows are not hard-deleted while referenced by memberships, identifiers, events, or transactions.

Security owner: Buyer Trust server domain; Admin controls verification, while declared-data changes may later be exposed only through controlled Server Actions.

### 6.2 `buyer_organization_memberships`

Purpose: server-authoritative authority for an Auth User to act for one Buyer Organization.
Primary key: `id bigserial`.

| Column | Type / nullability | Purpose | Class |
|---|---|---|---|
| `id` | bigint, PK, not null | Membership identity | MEMBERSHIP |
| `auth_user_id` | uuid, not null | Supabase Auth UUID, logical reference | MEMBERSHIP |
| `buyer_organization_id` | bigint, not null, FK | Represented organization | MEMBERSHIP |
| `membership_role` | varchar(30), not null | `organization_admin` or `authorized_buyer` | MEMBERSHIP |
| `membership_status` | varchar(20), not null, default `active` | `active`, `inactive`, or `revoked` | MEMBERSHIP |
| `ended_at` | timestamptz, nullable | Required for inactive/revoked; null for active | MEMBERSHIP, AUDIT |
| `created_at` | timestamptz, not null, default now | Creation audit | AUDIT |
| `updated_at` | timestamptz, nullable | State/role mutation audit | AUDIT |

Constraints and indexes:

- FK `buyer_organization_id -> buyer_organizations.id`, `ON DELETE RESTRICT`.
- unique `(auth_user_id, buyer_organization_id)`.
- check role and status vocabularies.
- consistency check: active requires `ended_at IS NULL`; inactive/revoked require `ended_at IS NOT NULL`.
- indexes `(auth_user_id, membership_status)` and `(buyer_organization_id, membership_status)`.

Lifecycle: active may become inactive or revoked. Inactive may return to active by a trusted membership-management flow; revoked is not silently reactivated. Re-grant policy is a later application concern, but never client-authored.

Security owner: Buyer Membership server domain. Platform Admin is separate from `organization_admin`.

### 6.3 `buyer_tax_identifiers`

Purpose: durable normalized tax identifiers owned by a Buyer Organization.
Primary key: `id bigserial`.

| Column | Type / nullability | Purpose | Class |
|---|---|---|---|
| `id` | bigint, PK, not null | Identifier identity | CHECKOUT, EVIDENCE |
| `buyer_organization_id` | bigint, not null, FK | Owning organization | CHECKOUT |
| `identifier_type` | varchar(50), not null | `tax_id` or `vat_id` | CHECKOUT |
| `identifier_value` | varchar(100), not null | Normalized display/domain value | CHECKOUT |
| `country_code` | varchar(2), not null | Identifier country | CHECKOUT |
| `canonical_identity_class` | varchar(50), not null | Canonical duplicate-detection class, e.g. `PL:NIP` | EVIDENCE |
| `canonical_identifier_value` | varchar(100), not null | Canonical duplicate-detection value | EVIDENCE |
| `trusted_by_verification_event_id` | bigint, nullable | Current trust event; server-owned | EVIDENCE |
| `created_at` | timestamptz, not null, default now | Creation audit | AUDIT |
| `retired_at` | timestamptz, nullable | Non-destructive replacement/retirement | AUDIT |

Constraints and indexes:

- FK `buyer_organization_id -> buyer_organizations.id`, `ON DELETE RESTRICT`.
- unique `(id, buyer_organization_id)` to support same-owner composite event FKs.
- unique raw history key `(buyer_organization_id, identifier_type, country_code, identifier_value)`.
- checks for supported type, ISO country shape, nonblank value, and `retired_at IS NULL` whenever `trusted_by_verification_event_id IS NOT NULL`.
- index `(buyer_organization_id)` filtered to active rows.
- index `(canonical_identity_class, canonical_identifier_value)` filtered to active rows.
- after events exist, FK `trusted_by_verification_event_id -> buyer_organization_verification_events.id`, `ON DELETE RESTRICT`.

Global canonical-identity collision is checked under a database lock in the future verification transaction. It cannot be expressed as a simple unique index without either allowing untrusted declaration squatting or duplicating verification state. Two different verified organizations may never own the same active canonical identity.

Lifecycle: insert declared and untrusted; never edit identifier identity; verify by trusted event; clear current trust and retire on correction/replacement.

Security owner: Buyer Trust server domain.

### 6.4 `buyer_registry_identifiers`

Purpose: durable registry identifiers owned by a Buyer Organization.
Primary key: `id bigserial`.

| Column | Type / nullability | Purpose | Class |
|---|---|---|---|
| `id` | bigint, PK, not null | Identifier identity | CHECKOUT, EVIDENCE |
| `buyer_organization_id` | bigint, not null, FK | Owning organization | CHECKOUT |
| `registry_type` | varchar(50), not null | `commercial_register` or `statistical_id` | CHECKOUT |
| `registry_value` | varchar(100), not null | Normalized registry value | CHECKOUT |
| `jurisdiction_country` | varchar(2), not null | Registry jurisdiction | CHECKOUT |
| `trusted_by_verification_event_id` | bigint, nullable | Current trust event; server-owned | EVIDENCE |
| `created_at` | timestamptz, not null, default now | Creation audit | AUDIT |
| `retired_at` | timestamptz, nullable | Non-destructive replacement/retirement | AUDIT |

Constraints and indexes mirror tax identifiers:

- restrictive organization FK;
- unique `(id, buyer_organization_id)`;
- unique history key `(buyer_organization_id, registry_type, jurisdiction_country, registry_value)`;
- supported-type, ISO-country, nonblank-value, and trusted-not-retired checks;
- active owner and active value lookup indexes;
- restrictive FK from `trusted_by_verification_event_id` after event creation.

Lifecycle and security owner: same as tax identifiers.

### 6.5 `buyer_organization_verification_events`

Purpose: immutable evidence and state-transition history for the Buyer Organization aggregate.
Primary key: `id bigserial`.

| Column | Type / nullability | Purpose | Class |
|---|---|---|---|
| `id` | bigint, PK, not null | Event identity | EVIDENCE |
| `buyer_organization_id` | bigint, not null, FK | Verified/reviewed aggregate | EVIDENCE |
| `event_type` | varchar(30), not null | `verified`, `rejected`, `revoked`, `invalidated` | EVIDENCE |
| `outcome_status` | varchar(20), not null | Resulting `verified`, `rejected`, `revoked`, or `pending` | EVIDENCE |
| `actor_type` | varchar(30), not null | `admin`, `buyer_user`, `system`, `external_adapter` | AUDIT |
| `actor_user_id` | uuid, nullable | Required for Admin/Buyer actors; null for system/adapter | AUDIT |
| `source_type` | varchar(30), not null | `admin_manual`, `buyer_change`, `system_rule`, `external_adapter` | EVIDENCE |
| `source_name` | varchar(100), nullable | Human/system source name; required for verified result | EVIDENCE |
| `source_reference` | text, nullable | Minimal internal evidence/ticket reference; no raw payload | EVIDENCE |
| `verification_method` | varchar(100), not null | Method name such as internal manual review | EVIDENCE |
| `reason_code` | varchar(100), nullable | Required for rejected/revoked/invalidated | EVIDENCE |
| `previous_verification_status` | varchar(20), not null | State before this event | AUDIT |
| `legal_name_snapshot` | varchar(255), not null | Reviewed legal name | EVIDENCE |
| `jurisdiction_country_snapshot` | varchar(2), not null | Reviewed jurisdiction | EVIDENCE |
| `tax_identifier_id` | bigint, nullable | Selected tax row belonging to this organization | EVIDENCE |
| `tax_identifier_type_snapshot` | varchar(50), nullable | Frozen reviewed tax type | EVIDENCE |
| `tax_identifier_value_snapshot` | varchar(100), nullable | Frozen reviewed tax value | EVIDENCE |
| `tax_country_code_snapshot` | varchar(2), nullable | Frozen reviewed tax country | EVIDENCE |
| `registry_identifier_id` | bigint, nullable | Selected registry row belonging to this organization | EVIDENCE |
| `registry_type_snapshot` | varchar(50), nullable | Frozen reviewed registry type | EVIDENCE |
| `registry_value_snapshot` | varchar(100), nullable | Frozen reviewed registry value | EVIDENCE |
| `registry_country_code_snapshot` | varchar(2), nullable | Frozen reviewed registry jurisdiction | EVIDENCE |
| `occurred_at` | timestamptz, not null, default now | Decision/event time | CHECKOUT, AUDIT |

Constraints and indexes:

- restrictive FK to organization.
- unique `(id, buyer_organization_id)` for the organization's composite current-event FK.
- composite FK `(tax_identifier_id, buyer_organization_id)` to tax `(id, buyer_organization_id)` and equivalent registry FK. This blocks cross-organization evidence composition.
- complete-pair checks: each identifier ID and its three snapshot fields are either all null or all non-null.
- every event contains at least one complete identifier snapshot because current canonical context requires one identifier pair.
- event/outcome matrix: `verified -> verified`, `rejected -> rejected`, `revoked -> revoked`, `invalidated -> pending`.
- actor matrix: Admin/Buyer actors require `actor_user_id`; system/external adapter forbid it.
- source/actor matrix: `admin_manual` requires Admin actor; `buyer_change` requires Buyer actor; `external_adapter` requires adapter actor.
- `verified` requires nonblank `source_name` and `source_reference`; rejected/revoked/invalidated require `reason_code`.
- indexes `(buyer_organization_id, occurred_at DESC)`, `(event_type, occurred_at)`, tax ID, and registry ID.
- a database trigger rejects `UPDATE` and `DELETE`, matching the established Seller event immutability pattern.

Lifecycle: append only. Events are never overwritten or hard-deleted.

Security owner: Admin Buyer Verification server domain for manual decisions; the Buyer Trust domain may append invalidation caused by a controlled identity change. Future adapters may append only through the same trusted domain executor.

## 7. Cross-table invariants and transaction boundaries

The future implementation must enforce these invariants atomically:

1. A verified organization points to a `verified` event for that same organization.
2. Its selected active identifiers point to that same event and match the event snapshots exactly.
3. A rejected/revoked organization points to the matching state event and has no currently trusted identifiers.
4. Initial pending has no event; invalidated pending points to the invalidation event and has no currently trusted identifiers.
5. Only one current trusted tax identity and at most one current trusted registry identity are selected for a checkout context. Ambiguity fails closed.
6. Verification locks the organization and selected identifiers, checks canonical tax identity conflicts, appends the event, sets identifier trust pointers, and updates organization current state in one transaction.
7. Identity/identifier correction locks the same aggregate, appends invalidation when needed, clears trust pointers, retires/replaces identifiers, and changes organization state to pending in one transaction.
8. No mutation changes an existing `buyer_legal_context_snapshots` row.

Database checks/FKs cover structural impossibilities. Cross-row event/status equality and verified-identity collision use a tested domain transaction with row/advisory locking because PostgreSQL CHECK constraints cannot safely reference other rows.

## 8. Verification lifecycle

| From | Event | To | Authority |
|---|---|---|---|
| initial | organization created | `pending` | Controlled authenticated/server onboarding; never verified |
| `pending` | `verified` | `verified` | LogiMarket Admin in MVP |
| `pending` | `rejected` | `rejected` | LogiMarket Admin |
| `rejected` | corrected data submitted | `pending` | Controlled server action; retains rejection event |
| `verified` | identity/identifier changed | `pending` | Domain appends `invalidated` before change |
| `verified` | evidence withdrawn/bad | `revoked` | LogiMarket Admin; future trusted producer where authorized |
| `revoked` | corrected data resubmitted | `pending` | Controlled server action; no automatic re-verification |
| `pending`/`rejected`/`revoked` | `verified` | `verified` | New Admin evidence; never reuse stale evidence |

Direct `verified -> rejected` is not needed: withdrawal of existing trust is `revoked`; corrected data re-enters `pending`. A repeated identical terminal event is rejected as an invalid transition.

### Identifier correction and supersession

- Never edit identifier type/value/country in place.
- If trust exists, append `invalidated`, clear selected trust pointers, and set organization to `pending` before retiring the old identifier.
- Insert the replacement as untrusted.
- A new Admin review creates a new `verified` or `rejected` event.
- Old identifier rows and all events remain queryable.
- Existing MarketplaceOrder snapshots remain unchanged.

## 9. Membership authorization model

Future server flow:

1. `getCurrentUser()` returns authenticated Auth UUID or fails closed.
2. Parse an optional organization selector only after authentication.
3. Query membership by exact `(auth_user_id, buyer_organization_id)` with `membership_status='active'` and permitted role.
4. Derive the organization ID from that row for all following reads; do not trust a separate client organization ID.
5. Load trusted organization state under that derived ID.

If a user has multiple active organizations, the UI may ask them to select one, but the Server Action repeats exact membership resolution. Missing, inactive, or revoked membership returns a typed authorization failure before identity, cart, price, routing, or checkout mutation.

No Auth `user_metadata` or email-domain claim grants organization authority. Platform Admin allowlisting remains separate.

## 10. Trust boundary

| Data | May client declare? | May client authoritatively set? | Trusted producer |
|---|---:|---:|---|
| Legal name/country | Yes, through future controlled input | No | Verified by Admin event |
| Identifier type/value | Yes, through future controlled input | No | Normalized server-side; trusted by Admin event |
| Buyer Organization ID | May select | No ownership effect | Active server-resolved membership |
| Membership/role/status | No | No | Membership domain/Admin flow |
| Verification status/method/source/time | No | No | Buyer Trust domain from evidence event |
| Verification actor/reference | No | No | Server from Admin session/process |
| Category-B/legal review | Declaration may be an input | No policy result | Separate transaction policy layer |
| Cart price/Seller/routing/readiness | No | No | Existing server domain |
| Contact name/email/phone/message | Yes | Snapshot only, not identity proof | Existing contact snapshot |

Forbidden client trust elevation includes `verified=true`, a verification status/source/method/time/actor, trusted event IDs, membership rows, trusted identifier pointers, Category-B outcome, Partner routing, price, or Seller readiness.

## 11. RLS and application authority matrix

The initial safe posture is server-only/application-authorized access. RLS is defense-in-depth, not the domain authorization mechanism. Future migrations should enable RLS and expose no anonymous policies. Existing Server Actions/read models remain the entry points; server code still performs authentication, membership, Admin, and state-transition checks even if a future policy permits a narrow direct read.

| Entity | Buyer read | Buyer write | Admin read | Admin write | Server domain read | Server domain write |
|---|---|---|---|---|---|---|
| `buyer_organizations` | Controlled read model for own active membership | Controlled declaration/correction only; never trust fields | Yes via Admin server path | Declared data and lifecycle only through domain executor | Yes | Yes |
| `buyer_organization_memberships` | Own effective memberships via controlled read model | No direct write | Yes | Through membership executor | Yes | Yes |
| tax/registry identifiers | Own organization via controlled read model | Controlled pending declaration/correction only | Yes | Through trust-domain executor | Yes | Yes |
| verification events | Sanitized current status only; raw evidence/reference not required | No | Yes | Append only through verification executor | Yes | Append only |
| transaction snapshots | Existing order-owner read contract | No | Existing Admin order contract | No mutation | Yes | Insert only during checkout |

No table is public. Service-role/database credentials remain server-only. `TO authenticated` alone is not authorization; exact row ownership and membership predicates are mandatory.

## 12. Future Buyer Legal Context builder boundary

Proposed server-only interface:

```ts
type TrustedBuyerContextRequest = {
  authenticatedUserId: string;          // AUTH
  selectedBuyerOrganizationId: number;  // selector, not authority
  transactionPolicyDecision: {
    professionalPurposeEvidence: string | null;
    categoryBStatus: CategoryBStatus;
    legalContextReviewState: LegalContextReviewState;
  };                                    // TRANSACTION_POLICY_DECISION
};

type TrustedBuyerContextResult =
  | { ok: true; buyerOrganizationId: number; value: BuyerLegalContextInput }
  | { ok: false; reason:
      | "BUYER_AUTH_REQUIRED"
      | "BUYER_ORGANIZATION_MEMBERSHIP_REQUIRED"
      | "BUYER_ORGANIZATION_NOT_VERIFIED"
      | "BUYER_IDENTIFIER_NOT_TRUSTED"
      | "BUYER_TRUST_STATE_INCONSISTENT"
      | "POLICY_DECISION_REQUIRED" };
```

Builder sequence:

1. resolve Auth UUID from the server session;
2. resolve exact active membership and derive organization authority;
3. load organization, current event, and active identifier rows;
4. require `verified`, same-owner event pointers, matching snapshots, a trusted PL NIP, no ambiguity, and supported PL policy;
5. map persisted trusted identity to `businessName`, country, identifier pairs, `businessVerificationStatus='verified'`, method, source, and event time;
6. combine only with the separate transaction-policy result;
7. run existing `validateBuyerLegalContext` / readiness validation;
8. pass the result and authenticated UUID to `executeMarketplaceCheckout`.

Source separation:

- `AUTH`: authenticated UUID only;
- `PERSISTED_TRUSTED_BUYER_STATE`: business name/country, tax/registry pairs, verification status/method/source/time;
- `TRANSACTION_DECLARATION`: optional professional-purpose evidence, never organization verification;
- `TRANSACTION_POLICY_DECISION`: Category-B and legal-review values;
- browser contact data remains a separate contact snapshot.

The builder cannot accept client-provided verification metadata. No public provider endpoint is needed.

## 13. Category-B and non-PL boundaries

Category-B policy is not implemented here. The only current non-blocking canonical combination remains `not_applicable + no_review_needed`; every other combination remains `POLICY_DECISION_REQUIRED` until separately authorized.

The physical identity schema is trivially jurisdiction-neutral, but that does not change runtime policy. MVP canonical checkout remains PL-only under the current contract. Persisting or even verifying a non-PL organization does not make it checkout-ready.

## 14. Existing transaction snapshot boundary

`PRESERVE_EXISTING_SNAPSHOT=YES`.

The current canonical transaction already freezes the Buyer legal context and contact data before creating the order in one database transaction. The future builder feeds it trusted data; it does not replace it with a live reference. `marketplace_orders.buyer_auth_user_id` continues to identify the purchasing account, while the snapshot records the transaction-time organization identity and policy result.

Old orders remain readable and legally stable when:

- membership later becomes inactive/revoked;
- organization verification is revoked;
- legal name changes;
- identifiers are retired/replaced;
- a future verification provider changes.

## 15. Future migration and backfill

No migration is created by Sprint 13B. A future implementation should create tables in this dependency order:

1. organizations;
2. memberships;
3. tax and registry identifiers;
4. verification events;
5. deferred/composite current-event and trusted-event FKs;
6. append-only trigger and RLS posture.

`BACKFILL_REQUIRED=NO` for trusted identity.

Existing anonymous/legacy orders, contact/company fields, and Buyer snapshots remain historical records. They are not sufficient evidence of ownership or verification and must not generate Buyer Organizations, memberships, verified state, or verification events automatically. Existing authenticated users may later be explicitly onboarded into new pending organizations; that is a new trusted workflow, not a data backfill. Historical snapshots are never rewritten.

Deployment must be additive and fail closed. The new tables may initially be empty; canonical checkout wiring remains blocked until the later membership, verification, trusted-read-model, and transaction-policy implementation is complete.

## 16. Future test contract

The implementation sprint must directly prove:

1. organization creation defaults to `pending` with no trusted event;
2. no active membership means no organization authority;
3. an active permitted membership authorizes only its exact organization;
4. one user can belong to multiple organizations and an organization to multiple users;
5. inactive/revoked membership fails closed;
6. browser input cannot set trust fields, membership, event actor, or event pointers;
7. Admin verification requires `requireAdmin()` and captures exact actor UUID;
8. verification atomically creates append-only evidence and consistent current state;
9. event update/delete is rejected by PostgreSQL;
10. revocation clears current identifier trust and blocks future context building;
11. identifier correction invalidates stale trust, retires rather than rewrites, and requires new review;
12. historical evidence remains queryable after replacement/revocation;
13. cross-organization membership, identifiers, event pointers, and evidence composition are rejected;
14. duplicate verified canonical PL identity is rejected under concurrent verification;
15. builder returns only a structurally consistent verified organization and trusted identifier set;
16. Category-B is never derived from organization verification;
17. transaction snapshot remains immutable after all later identity/membership changes;
18. legacy checkout/order data creates no trusted Buyer state;
19. check/FK constraints reject impossible state/actor/source/identifier combinations;
20. valid trusted Polish Buyer context succeeds in later canonical checkout;
21. missing/invalid/unverified identity, unavailable trust state, Seller-not-ready, and transaction failures fail closed and roll back;
22. non-PL remains `POLICY_DECISION_REQUIRED` under current policy;
23. a spoofed verification payload from the browser is ignored/rejected.

## 17. Out of scope

- physical schema or migration files;
- checkout wiring or modification of either checkout core;
- Buyer/Admin UI, organization signup, invitation, or user-management flows;
- Category-B automation, PKD logic, or new legal policy;
- CEIDG, GUS, REGON API, VIES, commercial KYB, credentials, adapters, or provider selection;
- raw registry/provider payload storage;
- Seller identity/readiness, Partner agreements, RFQ, outbound, payments, settlements, invoices, notifications, or Vercel;
- CRM/profile data and general corporate IAM.

## 18. Open implementation questions

No product/legal decision blocks physical schema implementation. The following bounded technical choices belong to the implementation plan and do not alter this contract:

1. Choose the exact lock key/order for concurrent canonical-identity verification; the contract requires one transaction and fail-closed collision handling.
2. Choose typed error names consistent with the implementation sprint's action-core conventions; semantic failure cases are defined above.
3. Decide whether initial pending organization creation is Admin-assisted or a controlled self-service declaration. Either path must atomically create only pending data and an authorized membership; neither can create trust.
4. Define the minimal sanitized Buyer-facing status view. Raw evidence references are Admin/server data by default.

## 19. Implementation readiness decision

`SCHEMA_IMPLEMENTATION_READY=YES`.

The five-table design is sufficient for internal manual Admin verification without an external registry, separates account/organization/membership/trust/policy/snapshot concerns, preserves current canonical checkout and transaction snapshots, and supports a future trusted evidence producer through the same event contract.

The recommended next sprint is a schema-and-domain-foundation implementation only: Drizzle definitions, one migration, append-only enforcement, membership/trust domain executors, and focused PostgreSQL tests. It must not wire public checkout, implement Category-B policy, or add an external provider.
