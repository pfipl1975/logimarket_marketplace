# LM-CAT-FILTER-50AB — Pilot Filter Configuration Runbook

## Scope and approval gate

This configuration pack applies pilot filters for B2B plastic containers in the category `pojemniki-plastikowe-euro` (slug: `pojemniki-plastikowe-euro`).
This is a configuration-data package prepared and tested locally; no production mutation is performed in this sprint.

The forward SQL script inserts exactly 8 pilot attribute definitions, 56 translations, 2 controlled option values, 14 option translations, and 8 category attribute assignments.

## Selected Pilot Product Category

- **Path:** `wyposazenie-magazynu > pojemniki-i-kuwety > pojemniki-plastikowe-euro`
- **Slug:** `pojemniki-plastikowe-euro`
- **Lookup:** Category is resolved dynamically using the slug `'pojemniki-plastikowe-euro'`. No serial IDs are hardcoded.

## Manifest of 8 Attributes

| Attribute stable_key | Data Type | Unit | Active Filter (`is_filterable`) | Business Context |
|---|---|---|---|---|
| `external_length` | `number` | `mm` | **`true`** | Outer length of the container |
| `external_width` | `number` | `mm` | **`true`** | Outer width of the container |
| `external_height` | `number` | `mm` | **`true`** | Outer height of the container |
| `capacity` | `number` | `l` | **`true`** | Capacity of the container |
| `material` | `enum` | `NULL` | **`true`** | Material (PP, HDPE) |
| `esd_protection` | `boolean` | `NULL` | **`false`** | ESD protection capability |
| `load_capacity` | `number` | `kg` | **`false`** | Single load capacity |
| `stackable` | `boolean` | `NULL` | **`false`** | Stackability capability |

### Controlled Options for `material`
1. `pp` (PP - Polipropylen)
2. `hdpe` (HDPE - Polietylen wysokiej gęstości)

## Verification commands

These commands are used to test the configuration scripts locally on a disposable database.

### 1. Connection settings
Prepare a local loopback port and credentials.

### 2. Forward execution
```powershell
$connection = "service=$env:PGSERVICE"
$forward = Resolve-Path 'scripts/sql/production/lm-cat-filter-50ab-pilot-filter-configuration.sql'
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --file=$forward
```

### 3. Rollback execution
```powershell
$connection = "service=$env:PGSERVICE"
$rollback = Resolve-Path 'scripts/sql/production/lm-cat-filter-50ab-rollback-pilot-filter-configuration.sql'
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --file=$rollback
```
