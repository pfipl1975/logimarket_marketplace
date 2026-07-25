$ErrorActionPreference = "Stop"

$register = Get-Content "docs/domain/lm-marketplace-validation-56c0-gate-register.md" -Raw
$evidence = Get-Content "docs/domain/lm-marketplace-validation-56c0-evidence-request-pack.md" -Raw
$plan = Get-Content "docs/domain/lm-marketplace-validation-56c0-dependency-and-unblock-plan.md" -Raw
$templates = Get-Content "docs/domain/lm-marketplace-validation-56c0-decision-record-templates.md" -Raw
$record = Get-Content "docs/domain/lm-marketplace-validation-56c0-review-and-validation-record.md" -Raw

# 1. Counts
$legCount = ([regex]::Matches($register, "(?m)^### LEG-MKT-")).Count
$omqCount = ([regex]::Matches($register, "(?m)^### OMQ-MKT-")).Count

if ($legCount -ne 10) { Write-Error "Expected 10 LEG-MKT gates, found $legCount"; exit 1 }
if ($omqCount -ne 12) { Write-Error "Expected 12 OMQ-MKT gates, found $omqCount"; exit 1 }

# 2. Unique IDs
for ($i = 1; $i -le 10; $i++) {
    $id = "LEG-MKT-{0:D2}" -f $i
    if (-not $register.Contains($id)) { Write-Error "Missing $id in register"; exit 1 }
}
for ($i = 1; $i -le 12; $i++) {
    $id = "OMQ-MKT-{0:D2}" -f $i
    if (-not $register.Contains($id)) { Write-Error "Missing $id in register"; exit 1 }
}

# 3. Cross-document coverage & Owner consistency
# We'll just verify the presence of the IDs in the templates and evidence packs
for ($i = 1; $i -le 10; $i++) {
    $id = "LEG-MKT-{0:D2}" -f $i
    if (-not $templates.Contains("gate ID: $id")) { Write-Error "Missing $id in templates"; exit 1 }
    if (-not $evidence.Contains($id)) { Write-Error "Missing $id in evidence"; exit 1 }
    if (-not $plan.Contains($id)) { Write-Error "Missing $id in plan"; exit 1 }
}
for ($i = 1; $i -le 12; $i++) {
    $id = "OMQ-MKT-{0:D2}" -f $i
    if (-not $templates.Contains("gate ID: $id")) { Write-Error "Missing $id in templates"; exit 1 }
    if (-not $evidence.Contains($id)) { Write-Error "Missing $id in evidence"; exit 1 }
    if (-not $plan.Contains($id)) { Write-Error "Missing $id in plan"; exit 1 }
}

# 4. Open-state enforcement
if ($templates -match "(?m)^- status: (CLOSED|APPROVED)") { Write-Error "Found closed status in templates"; exit 1 }
if ($templates -match "(?m)^- decision: (APPROVED|SELECTED)") { Write-Error "Found closed decision in templates"; exit 1 }
if ($templates -match "(?m)^- approval signatures: GRANTED") { Write-Error "Found granted signatures in templates"; exit 1 }

# 5. Reviewer rules
$pspGates = @("LEG-MKT-05", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05", "OMQ-MKT-08", "OMQ-MKT-09")
foreach ($gate in $pspGates) {
    if (-not ($register -match "(?sm)ID: $gate.*?supporting reviewer: PSP Specialist")) { Write-Error "Missing PSP Specialist for $gate in register"; exit 1 }
    if (-not ($templates -match "(?sm)gate ID: $gate.*?supporting reviewers: PSP Specialist")) { Write-Error "Missing PSP Specialist for $gate in templates"; exit 1 }
}

$dpoGates = @("LEG-MKT-09", "OMQ-MKT-11")
foreach ($gate in $dpoGates) {
    if (-not ($register -match "(?sm)ID: $gate.*?supporting reviewer: DPO")) { Write-Error "Missing DPO for $gate in register"; exit 1 }
    if (-not ($templates -match "(?sm)gate ID: $gate.*?supporting reviewers: DPO")) { Write-Error "Missing DPO for $gate in templates"; exit 1 }
}

# 6. Workstream coverage
$workstreams = ([regex]::Matches($plan, "(?m)^### Workstream [A-F]")).Count
if ($workstreams -ne 6) { Write-Error "Expected 6 workstreams, found $workstreams"; exit 1 }

# 7. No premature readiness
$files = @($register, $evidence, $plan, $templates, $record)
foreach ($file in $files) {
    if ($file -match "READY_FOR_PHYSICAL_SCHEMA=YES") { Write-Error "Found READY_FOR_PHYSICAL_SCHEMA=YES"; exit 1 }
    if ($file -match "READY_FOR_APPLICATION_IMPLEMENTATION=YES") { Write-Error "Found READY_FOR_APPLICATION_IMPLEMENTATION=YES"; exit 1 }
    if ($file -match "READY_FOR_PRODUCTION_IMPLEMENTATION=YES") { Write-Error "Found READY_FOR_PRODUCTION_IMPLEMENTATION=YES"; exit 1 }
}

Write-Output "Validation passed successfully."
exit 0
