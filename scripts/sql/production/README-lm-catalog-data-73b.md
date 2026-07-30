# LM-CATALOG-DATA-73B: Read-Only Production Audit

This package contains a non-mutating SQL script designed to verify the configuration and backfill state of the LM-CATALOG-DATA-73 pilot.

## Security & Role Requirements

The script must be executed by a PostgreSQL role that adheres to the principle of least privilege.

**Required permissions:**
* `CONNECT` to the target database.
* `USAGE` on schema `public`.
* `SELECT` strictly on the following tables:
  * `public.categories`
  * `public.offers`
  * `public.attribute_definitions`
  * `public.attribute_definition_translations`
  * `public.controlled_option_values`
  * `public.controlled_option_value_translations`
  * `public.category_attribute_assignments`
  * `public.offer_attribute_values`
  * `public.offer_attribute_option_values`

**Restrictions:**
* The role **must not** possess any mutating rights (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `CREATE`, etc.).
* The role **must not** have permissions to read partner, RFQ, orders, or customer data.

## Execution Requirements

* The connection must enforce `default_transaction_read_only=on`.
* Secrets and connection parameters must be injected via a safe method (e.g., `PGSERVICE` with a pre-configured `pgpass` or vault), avoiding any `.env.local` storage or explicit connection strings in the command.

## Execution Command

Run the following PowerShell command in the root of the repository to generate the audit report:

```powershell
$env:PGSERVICE = "logimarket_prod_readonly"
$env:PGOPTIONS = "-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000"

$reportDir = "C:\tmp\lm-catalog-data-73b"
New-Item -ItemType Directory -Force $reportDir | Out-Null

& psql.exe `
  -X `
  --csv `
  -v ON_ERROR_STOP=1 `
  -P footer=off `
  -f ".\scripts\sql\production\lm-cat-filter-73b-verify-production-state.sql" |
  Set-Content `
    -Encoding utf8 `
    "$reportDir\lm-catalog-data-73b-audit.csv"

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
```
