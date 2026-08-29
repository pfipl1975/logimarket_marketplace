## LM-ADMIN-PARTNER-CREATE-A1

Implements centrally curated manual Partner creation in the LogiMarket Admin panel.

### Scope

- Adds `+ Dodaj partnera` / localized equivalent to Admin Partner list.
- Adds PL route `/admin/partnerzy/nowy`.
- Adds localized route `/[locale]/admin/partners/new`.
- Adds minimal Partner creation form:
  - company name
  - contact email
  - optional website URL.
- Adds Admin-only Server Action protected by `requireAdmin()`.
- Inserts only into the canonical `partners` table.
- Redirects to Partner details after successful creation.
- Adds native dictionaries for PL/EN/DE/FR/UK/ES/ZH.
- Adds authoritative Partner validation unit tests.
- Adds disposable PostgreSQL integration proof.

### Locked business boundaries

- Partner login required: NO.
- Partner Portal required: NO.
- Vendor self-registration: NO.
- Automatic Seller Legal Identity creation: NO.
- Automatic Seller Eligibility creation: NO.
- Automatic seller approval: NO.
- Duplicate blocking by company name/email: NO.
- CEIDG/KRS/GUS/VIES integration: NO.
- Offer model/conversion behavior changed: NO.
- MarketplaceOrder/checkout changed: NO.

### Database / schema

- Schema changes: NO.
- Migration changes: NO.
- Shared-dev DB writes: NO.
- Production DB writes: NO.
- DB mutation proof uses disposable GitHub Actions PostgreSQL only.

### Verification

Exact approved HEAD:

`4e8c2bb33871cba8473af3665818403af27fa3b7`

- Unit tests: PASS
- Build: PASS
- Lint: PASS
- `git diff --check`: PASS
- Runtime Database Integration: PASS
- Vercel: PASS
- Browser QA: NOT_TESTED
