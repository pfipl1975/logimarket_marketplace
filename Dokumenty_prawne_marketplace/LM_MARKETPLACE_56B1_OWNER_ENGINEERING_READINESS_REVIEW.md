# LM-MARKETPLACE-SCHEMA-56B1 — Owner / Engineering Readiness Review

**Review date:** 2026-08-10  
**Review type:** READ_ONLY / NO_REPO_MUTATION  
**Repository:** `pfipl1975/logimarket_marketplace`  
**Reviewed main SHA:** `cd1de62625f6a95bb0ed8e651ab40b3544e41a5d`  
**Target sprint:** `LM-MARKETPLACE-SCHEMA-56B1 — Seller Identity and Offer Contract Classification`

## 1. Final decision

```text
BASELINE=PASS
LEGAL_56B1_GATES=PASS
DPO_ARCHITECTURAL_BLOCKER_56B1=PASS
TAX_DAC7_ARCHITECTURAL_BLOCKER_56B1=PASS
TAX_DAC7_GUARDRAILS=REQUIRED_BEFORE_GO_LIVE_AND_NO_GLOBAL_DAC7_FLAG_IN_56B1
56B0_STRUCTURAL_COMPATIBILITY=PASS
56B0_CURRENT_SCHEMA_MAPPING_SYNC=FAIL
CANONICAL_GATE_REGISTER_SYNC=FAIL

LM_MARKETPLACE_SCHEMA_56B1_READY=NO
BLOCKER=BLOCKED_CANONICAL_DOCUMENTATION_DRIFT
```

The substantive external work needed for the narrow 56B1 seller foundation is no longer the blocker. The blocker is repository governance: the normative/canonical documentation on `main` has not yet been synchronized with the later Legal, DPO, Tax and current canonical offer-model evidence.

## 2. Evidence reviewed

### Repository baseline
- `main` currently resolves to `cd1de62625f6a95bb0ed8e651ab40b3544e41a5d`.
- Current physical schema still has `partners` with basic company/contact fields and `offers.partnerId`, but no marketplace SellerLegalIdentity/contractModel foundation.

### Current runtime offer model — direct repository evidence
`src/lib/offers/model.ts` defines the runtime database contract as:

```text
offer_model:     rfq | marketplace
conversion_type: inbound | outbound
```

and the canonical resolver:

```text
rfq + inbound         -> rfq
rfq + outbound        -> outbound
marketplace + inbound -> ecommerce
marketplace + outbound-> outbound
unknown/inconsistent  -> unknown
```

This resolver is the current source of truth for conversion behavior and must not be replaced or duplicated by 56B1.

### 56B0 structural model
The 56B0 logical model correctly preserves the important structural separation:
- seller identity is distinct from offer classification;
- `contractModel` is independent from conversion classification;
- active contract models remain `partner_marketplace` / `external_redirect`, with `logimarket_reseller` future and disabled;
- seller/order/payment/privacy aggregates remain separated;
- 56B1 is seller/offer-classification foundation only.

Therefore the later Legal/DPO/Tax decisions do **not** require reopening the aggregate architecture from zero.

## 3. 56B1 dependency assessment

### LEG-MKT-01 — PASS
Later counsel evidence resolves the intermediary model sufficiently for 56B1: Partner remains seller; LogiMarket is intermediary/agent in the approved business model; no `contractModel=AGENCY`; no default del credere.

### LEG-MKT-02 — PASS for 56B1 scope
E2/E7 semantics are now resolved, but they belong to 56B2. They do not require order lifecycle tables in 56B1.

### LEG-MKT-03 — PASS
Seller identity/disclosure direction is sufficiently defined for a minimal seller foundation:
- legal name;
- country / registered office;
- tax identifier type/value;
- VAT ID where applicable;
- registry type/number where applicable;
- verification status/method/timestamp/evidence reference;
- public/contractual/internal-KYB classification.

Transactional disclosure snapshots remain 56B2.

### LEG-MKT-04 / P2B — PASS / NOT_APPLICABLE_WHILE_PURE_B2B
No dedicated P2B physical model is required in 56B1. Re-open only if real consumer-facing intermediation/B2C is introduced.

### LEG-MKT-09 / DPO — PASS for architectural readiness
Final privacy record clears the 56B1 architectural blocker. 56B1 must minimize seller personal data and must not hardcode a global controller/joint-controller role. Privacy implementation P0 remains separate before go-live.

### Tax / DAC7 — PASS for 56B1 architecture
The final tax record permits 56B1 to contain neutral seller legal/tax/registry identity and verification data. Full DAC7 classification/reporting, transaction counts, consideration, annual reports and KSeF belong to later compliance/56B4 work. Do not add a global `dac7Required=true` field in 56B1.

## 4. Blocking findings

### BLOCKER A — canonical gate register is stale
`docs/domain/lm-marketplace-validation-56c0-gate-register.md` on current `main` still marks LEG-MKT-01/02/03/04/09 as `STATUS=OPEN` with `EXTERNAL_EVIDENCE_REQUIRED` and therefore still marks them as physical-schema blockers.

This conflicts with the later authorized evidence and the current PM/DPO/Tax decision records.

**Result:** `CANONICAL_GATE_REGISTER_SYNC=FAIL`.

### BLOCKER B — 56B0 current-schema mapping is stale against the actual canonical resolver
`docs/domain/lm-marketplace-data-model-56b0-current-schema-mapping.md` states that `offers.offerModel` has application values `rfq, ecommerce, outbound` and that the semantic relationship of `conversionType` is unresolved.

Current repository code proves the opposite representation:
- raw `offers.offerModel` is legacy `rfq | marketplace`;
- raw `conversionType` is `inbound | outbound`;
- canonical public model is derived by `resolveCanonicalOfferModel()` as `rfq | ecommerce | outbound | unknown`.

The logical model also describes `offers.offerModel` as the canonical conversion-mode field. That wording is unsafe for a physical-schema sprint because it can cause a migration to overwrite or reinterpret the existing raw legacy field instead of adding a separate `contractModel` representation.

**Result:** `56B0_CURRENT_SCHEMA_MAPPING_SYNC=FAIL`.

### BLOCKER C — stale unresolved flags in normative docs
The 56B0 logical model still records contract-formation semantics and privacy role allocation as unresolved. The aggregate structure remains safe, but the decision-state metadata is no longer current after Legal/DPO closure.

This is documentation drift, not a requirement to redesign the whole model.

## 5. Authorized 56B1 scope after synchronization

### IN SCOPE
- seller legal identity foundation;
- seller tax/VAT/registry identifiers needed for neutral identity/KYB/DAC7 capability;
- seller verification metadata;
- explicit offer-to-seller relationship / referential integrity design;
- explicit project `contractModel` using only:
  - `partner_marketplace`;
  - `external_redirect`;
  - `logimarket_reseller` future/disabled;
- seller eligibility/publication foundation for centrally curated MVP;
- seller/public/internal-KYB field classification;
- migration/backfill design necessary only for these fields, after separate schema sprint authorization.

### OUT OF SCOPE
- changing the existing canonical resolver;
- changing raw `offerModel` / `conversionType` business semantics;
- `AGENCY` as a `contractModel` value;
- buyer NIP/VIES/PKD gating;
- mandatory professional-purpose declaration;
- MarketplaceOrder / SellerOrder / SellerAcceptanceDecision;
- E2/E6/E7 state machine;
- payments, preauth, capture, allocation, settlement;
- PSP selection/KYB implementation;
- DAC7 reporting engine or global reportable flags;
- KSeF API integration;
- retention jobs / cookie remediation / RFQ privacy UI;
- Partner Portal or automated vendor registration.

## 6. Required next sprint before 56B1

```text
SPRINT=LM-MARKETPLACE-READINESS-56C0A
TITLE=Canonical Gate Register and 56B0 Decision-State Synchronization
TYPE=DOCUMENTATION_ONLY
DB_WRITES_ALLOWED=NO
SCHEMA_CHANGES_ALLOWED=NO
APPLICATION_CODE_CHANGES_ALLOWED=NO
```

Minimum objectives:
1. Update the canonical gate register with the authorized final Legal/DPO state relevant to 56B1.
2. Update dependency/readiness metadata so later PSP/Tax/go-live gates do not incorrectly block the narrow 56B1 foundation.
3. Correct 56B0 terminology for raw legacy `offerModel`, raw `conversionType`, and canonical `resolveCanonicalOfferModel()` output.
4. Preserve `contractModel` independence and existing values; never add `AGENCY`.
5. Mark resolved E2/E7 and privacy decision-state metadata without pulling 56B2/56B6 implementation into 56B1.
6. Add a formal post-sync readiness record.
7. No changes to `src/lib/schema.ts`, migrations, SQL, runtime migrations, app code or production DB.

After this documentation-only sync is reviewed/merged, rerun this read-only readiness review. If no new mismatch is found, the expected decision is:

```text
LM_MARKETPLACE_SCHEMA_56B1_READY=YES
```

## 7. Sprint reporting

```text
CODE_CHANGES_REQUIRED=NO
DOCUMENTATION_CHANGES_REQUIRED_FOR_FOLLOWUP=YES
COMMIT_REQUIRED_FOR_THIS_REVIEW=NO
PR_REQUIRED_FOR_THIS_REVIEW=NO

SCHEMA_FILES_CHANGED=NO
MIGRATION_FILES_CHANGED=NO
RUNTIME_MIGRATION_FILES_CHANGED=NO
PRODUCTION_DB_WRITE_ATTEMPTS=0
PRODUCTION_DB_WRITES=0

LOCAL_WORKING_TREE=NOT_TESTED_REMOTE_GITHUB_REVIEW_ONLY
OWNER_REVIEW_REQUIRED=YES
```

## 8. Owner review boundary

This review stops here. It does not authorize 56B1 schema implementation. The next authorized action should be the documentation-only `LM-MARKETPLACE-READINESS-56C0A` synchronization sprint, followed by a second readiness decision.
