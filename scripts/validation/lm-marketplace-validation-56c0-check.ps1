$nodeScript = @'
const fs = require('fs');
const path = require('path');

const baseDir = process.cwd();
const regPath = path.join(baseDir, 'docs/domain/lm-marketplace-validation-56c0-gate-register.md');
const tplPath = path.join(baseDir, 'docs/domain/lm-marketplace-validation-56c0-decision-record-templates.md');
const planPath = path.join(baseDir, 'docs/domain/lm-marketplace-validation-56c0-dependency-and-unblock-plan.md');
const evPath = path.join(baseDir, 'docs/domain/lm-marketplace-validation-56c0-evidence-request-pack.md');
const recPath = path.join(baseDir, 'docs/domain/lm-marketplace-validation-56c0-review-and-validation-record.md');

function parseRegister(text) {
    const records = {};
    const matches = [...text.matchAll(/### ((?:LEG|OMQ)-MKT-\d{2})\n([\s\S]*?)(?=### (?:LEG|OMQ)-MKT-\d{2}|$)/g)];
    for (const match of matches) {
        const id = match[1];
        const b = match[2];
        const safeDefault = (b.match(/-(?: exact)?(?: current)?(?: canonical)?(?: safe)?(?: documentation)? default: (.*)/) || [])[1]?.trim() || '';
        const owner = (b.match(/-(?: exact)?(?: primary)?(?: evidence| decision)? owner: (.*)/) || [])[1]?.trim() || '';
        const supporting = (b.match(/- supporting reviewer(?:s)?: (.*)/) || [])[1]?.trim() || '';
        const mvpPhysical = (b.match(/- initial-MVP physical-schema blocker: (.*)/) || [])[1]?.trim() || '';
        const mvpApp = (b.match(/- initial-MVP application blocker: (.*)/) || [])[1]?.trim() || '';
        const futurePhysical = (b.match(/- future-reseller physical-schema blocker: (.*)/) || [])[1]?.trim() || '';
        const futureApp = (b.match(/- future-reseller application blocker: (.*)/) || [])[1]?.trim() || '';
        const status = (b.match(/^STATUS=(.*)/m) || [])[1]?.trim() || '';

        records[id] = { id, safeDefault, owner, supporting, mvpPhysical, mvpApp, futurePhysical, futureApp, status };
    }
    return records;
}

function parseTemplates(text) {
    const records = {};
    const matches = [...text.matchAll(/- gate ID: ((?:LEG|OMQ)-MKT-\d{2})\n([\s\S]*?)(?=- gate ID: (?:LEG|OMQ)-MKT-\d{2}|$)/g)];
    for (const match of matches) {
        const id = match[1];
        const b = match[2];
        const safeDefault = (b.match(/-(?: exact)?(?: current)?(?: canonical)?(?: safe)?(?: documentation)? default: (.*)/) || [])[1]?.trim() || '';
        const owner = (b.match(/-(?: exact)?(?: primary)?(?: evidence| decision)? owner: (.*)/) || [])[1]?.trim() || '';
        const supporting = (b.match(/- supporting reviewer(?:s)?: (.*)/) || [])[1]?.trim() || '';
        const status = (b.match(/- status: (.*)/) || [])[1]?.trim() || '';
        const decision = (b.match(/- decision: (.*)/) || [])[1]?.trim() || '';
        const evidence = (b.match(/- evidence reviewed: (.*)/) || [])[1]?.trim() || '';
        const approval = (b.match(/- approval signatures: (.*)/) || [])[1]?.trim() || '';

        records[id] = { id, safeDefault, owner, supporting, status, decision, evidence, approval };
    }
    return records;
}

function validate(regText, tplText, planText, evText) {
    const reg = parseRegister(regText);
    const tpl = parseTemplates(tplText);
    const errors = [];
    
    const expectedIds = [];
    for(let i=1; i<=10; i++) expectedIds.push(`LEG-MKT-` + String(i).padStart(2, '0'));
    for(let i=1; i<=12; i++) expectedIds.push(`OMQ-MKT-` + String(i).padStart(2, '0'));

    let duplicateIds = 0;
    let missingIds = 0;
    
    const regIdsCount = [...regText.matchAll(/### (LEG-MKT-\d{2}|OMQ-MKT-\d{2})/g)].length;
    if (regIdsCount > 22) { duplicateIds += (regIdsCount - 22); errors.push("Duplicate ID in register"); }
    
    for (const id of expectedIds) {
        if (!reg[id]) { missingIds++; errors.push(`Missing ID ${id} in register`); }
        if (!tpl[id]) { missingIds++; errors.push(`Missing ID ${id} in templates`); }
    }

    let safeDefaultMismatches = 0;
    let primaryOwnerMismatches = 0;
    let supportingMismatches = 0;
    let crossDocMissing = 0;
    let prematurelyClosed = 0;
    let prepopulatedDecisions = 0;
    let blockerMismatches = 0;

    for (const id of expectedIds) {
        const r = reg[id];
        const t = tpl[id];
        if (r && t) {
            if (r.safeDefault !== t.safeDefault) { safeDefaultMismatches++; errors.push(`Safe default mismatch for ${id} ('${r.safeDefault}' vs '${t.safeDefault}')`); }
            if (r.owner !== t.owner) { primaryOwnerMismatches++; errors.push(`Owner mismatch for ${id} ('${r.owner}' vs '${t.owner}')`); }
            if (r.supporting !== t.supporting) { supportingMismatches++; errors.push(`Supporting mismatch for ${id} ('${r.supporting}' vs '${t.supporting}')`); }
            
            if (r.status !== 'OPEN') { prematurelyClosed++; errors.push(`Register status not OPEN for ${id}`); }
            if (t.status !== 'OPEN') { prematurelyClosed++; errors.push(`Template status not OPEN for ${id}`); }
            if (t.decision !== 'NOT_RECORDED') { prepopulatedDecisions++; errors.push(`Decision not NOT_RECORDED for ${id}`); }
            if (t.evidence !== 'NOT_ATTACHED') { prepopulatedDecisions++; errors.push(`Evidence not NOT_ATTACHED for ${id}`); }
            if (t.approval !== 'NOT_GRANTED') { prepopulatedDecisions++; errors.push(`Approval not NOT_GRANTED for ${id}`); }

            if (['LEG-MKT-10', 'OMQ-MKT-12'].includes(id)) {
                if (r.mvpPhysical !== 'NO') { blockerMismatches++; errors.push(`Blocker mismatch for ${id}`); }
            } else {
                if (r.mvpPhysical !== 'YES') { blockerMismatches++; errors.push(`Blocker mismatch for ${id}`); }
            }
        }
        
        if (!evText.includes(id)) { crossDocMissing++; errors.push(`Missing ${id} in Evidence`); }
        if (!planText.includes(id)) { crossDocMissing++; errors.push(`Missing ${id} in Plan`); }
    }

    let workstreamMismatches = 0;
    const planMatches = [...planText.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s+\|/gm)];
    const mappedIds = {};
    for (const m of planMatches) {
        mappedIds[m[1]] = (mappedIds[m[1]] || 0) + 1;
    }
    for (const id of expectedIds) {
        if (!mappedIds[id]) { workstreamMismatches++; errors.push(`Missing WS mapping for ${id}`); }
        else if (mappedIds[id] > 1) { workstreamMismatches++; errors.push(`Duplicate WS mapping for ${id}`); }
    }

    if (reg['OMQ-MKT-12'] && reg['OMQ-MKT-12'].supporting === 'DPO') {
        supportingMismatches++; errors.push(`OMQ-MKT-12 has DPO`);
    }

    return { errors, metrics: {
        DUPLICATE_GATE_IDS: duplicateIds,
        MISSING_GATE_IDS: missingIds,
        SAFE_DEFAULT_MISMATCHES: safeDefaultMismatches,
        PRIMARY_OWNER_MISMATCHES: primaryOwnerMismatches,
        SUPPORTING_REVIEWER_MISMATCHES: supportingMismatches,
        CROSS_DOCUMENT_GATE_ID_MISMATCHES: crossDocMissing,
        WORKSTREAM_MAPPING_MISMATCHES: workstreamMismatches,
        BLOCKER_CLASSIFICATION_MISMATCHES: blockerMismatches,
        PREMATURELY_CLOSED_GATES: prematurelyClosed,
        PREPOPULATED_DECISIONS: prepopulatedDecisions
    }};
}

function run() {
    const regText = fs.readFileSync(regPath, 'utf8');
    const tplText = fs.readFileSync(tplPath, 'utf8');
    const planText = fs.readFileSync(planPath, 'utf8');
    const evText = fs.readFileSync(evPath, 'utf8');

    let selfTestCount = 0;
    let selfTestFailures = 0;

    function runSelfTest(name, corruptFn) {
        selfTestCount++;
        const corrupted = corruptFn(regText, tplText, planText, evText);
        const res = validate(...corrupted);
        if (res.errors.length === 0) {
            console.log(`Self-Test FAILED: ${name}`);
            selfTestFailures++;
        }
    }

    runSelfTest("changed safe default", (r, t, p, e) => [r.replace(/- exact current safe documentation default: .*/g, '- exact current safe documentation default: CORRUPT'), t, p, e]);
    runSelfTest("changed primary owner", (r, t, p, e) => [r.replace(/- primary evidence owner: Legal Counsel/g, '- primary evidence owner: CORRUPT'), t, p, e]);
    runSelfTest("changed supporting reviewer", (r, t, p, e) => [r.replace(/- supporting reviewer: PSP Specialist/g, '- supporting reviewer: CORRUPT'), t, p, e]);
    runSelfTest("OMQ-MKT-12=DPO", (r, t, p, e) => [r.replace(/(ID: OMQ-MKT-12[\s\S]*?- supporting reviewer:) UNASSIGNED/g, '$1 DPO'), t, p, e]);
    runSelfTest("changed blocker", (r, t, p, e) => [r.replace(/- initial-MVP physical-schema blocker: YES/g, '- initial-MVP physical-schema blocker: NO'), t, p, e]);
    runSelfTest("duplicate ID", (r, t, p, e) => [r + '\n### LEG-MKT-01\n', t, p, e]);
    runSelfTest("missing ID", (r, t, p, e) => [r.replace(/### LEG-MKT-01/g, '### MISSING'), t, p, e]);
    runSelfTest("missing workstream mapping", (r, t, p, e) => [r, t, p.replace(/\| LEG-MKT-01\s+\|/g, '| MISSING-01 |'), e]);
    runSelfTest("two workstream mappings for one ID", (r, t, p, e) => [r, t, p + '\n| LEG-MKT-01 | Workstream X | | |\n', e]);
    runSelfTest("STATUS=CLOSED", (r, t, p, e) => [r, t.replace(/- status: OPEN/g, '- status: CLOSED'), p, e]);
    runSelfTest("decision other than NOT_RECORDED", (r, t, p, e) => [r, t.replace(/- decision: NOT_RECORDED/g, '- decision: APPROVED'), p, e]);
    runSelfTest("evidence other than NOT_ATTACHED", (r, t, p, e) => [r, t.replace(/- evidence reviewed: NOT_ATTACHED/g, '- evidence reviewed: ATTACHED'), p, e]);
    runSelfTest("approval other than NOT_GRANTED", (r, t, p, e) => [r, t.replace(/- approval signatures: NOT_GRANTED/g, '- approval signatures: GRANTED'), p, e]);

    console.log(`NEGATIVE_SELF_TEST_COUNT=${selfTestCount}`);
    console.log(`NEGATIVE_SELF_TEST_FAILURES=${selfTestFailures}`);
    if (selfTestFailures > 0) process.exit(1);

    const res = validate(regText, tplText, planText, evText);
    
    const legCount = [...regText.matchAll(/### LEG-MKT-/g)].length;
    const omqCount = [...regText.matchAll(/### OMQ-MKT-/g)].length;
    const total = legCount + omqCount;
    
    console.log(`LEG_MKT_GATE_COUNT=${legCount}`);
    console.log(`OMQ_MKT_GATE_COUNT=${omqCount}`);
    console.log(`TOTAL_VALIDATION_ITEMS=${total}`);

    for (const [k, v] of Object.entries(res.metrics)) {
        console.log(`${k}=${v}`);
    }

    if (res.errors.length > 0) {
        console.log("Validation Failed with errors:");
        for (const e of res.errors) console.log(" - " + e);
        process.exit(1);
    }

    console.log("Validation Passed");
    process.exit(0);
}

run();
'@

$tempJs = Join-Path $env:TEMP "validator_56c0.js"
[IO.File]::WriteAllText($tempJs, $nodeScript)
node $tempJs
$exitCode = $LASTEXITCODE
Remove-Item $tempJs -Force -ErrorAction SilentlyContinue
exit $exitCode
