$nodeScript = @'
const fs = require('fs');
const regPath = 'docs/domain/lm-marketplace-validation-56c0-gate-register.md';
const tplPath = 'docs/domain/lm-marketplace-validation-56c0-decision-record-templates.md';
const planPath = 'docs/domain/lm-marketplace-validation-56c0-dependency-and-unblock-plan.md';
const evPath = 'docs/domain/lm-marketplace-validation-56c0-evidence-request-pack.md';
const recPath = 'docs/domain/lm-marketplace-validation-56c0-review-and-validation-record.md';

function parseRegister(text) {
    const records = {};
    const matches = [...text.matchAll(/### (LEG-MKT-\d{2}|OMQ-MKT-\d{2})\r?\n([\s\S]*?)(?=\r?\n### |$)/g)];
    for (const m of matches) {
        const id = m[1];
        const b = m[2];
        const safeDefault = (b.match(/- exact current safe documentation default: (.*)/) || [])[1]?.trim();
        const owner = (b.match(/- primary evidence owner: (.*)/) || [])[1]?.trim();
        const supporting = (b.match(/- supporting reviewer: (.*)/) || [])[1]?.trim();
        const initialPhys = (b.match(/- initial-MVP physical-schema blocker: (.*)/) || [])[1]?.trim();
        const initialApp = (b.match(/- initial-MVP application blocker: (.*)/) || [])[1]?.trim();
        const futurePhys = (b.match(/- future-reseller physical-schema blocker: (.*)/) || [])[1]?.trim();
        const futureApp = (b.match(/- future-reseller application blocker: (.*)/) || [])[1]?.trim();
        records[id] = { safeDefault, owner, supporting, initialPhys, initialApp, futurePhys, futureApp };
    }
    return records;
}

function parseTemplates(text) {
    const records = {};
    const matches = [...text.matchAll(/### Stub for (LEG-MKT-\d{2}|OMQ-MKT-\d{2})\r?\n([\s\S]*?)(?=\r?\n### |$)/g)];
    for (const m of matches) {
        const id = m[1];
        const b = m[2];
        const safeDefault = (b.match(/- safe default mapping: (.*)/) || [])[1]?.trim();
        const owner = (b.match(/- primary evidence owner: (.*)/) || [])[1]?.trim();
        const supporting = (b.match(/- supporting reviewer: (.*)/) || [])[1]?.trim();
        const status = (b.match(/- status: (.*)/) || [])[1]?.trim();
        const decision = (b.match(/- decision: (.*)/) || [])[1]?.trim();
        const evidence = (b.match(/- evidence reviewed: (.*)/) || [])[1]?.trim();
        const approval = (b.match(/- approval signatures: (.*)/) || [])[1]?.trim();
        const initialPhys = (b.match(/- initial-MVP physical-schema blocker: (.*)/) || [])[1]?.trim();
        const initialApp = (b.match(/- initial-MVP application blocker: (.*)/) || [])[1]?.trim();
        const futurePhys = (b.match(/- future-reseller physical-schema blocker: (.*)/) || [])[1]?.trim();
        const futureApp = (b.match(/- future-reseller application blocker: (.*)/) || [])[1]?.trim();
        records[id] = { safeDefault, owner, supporting, status, decision, evidence, approval, initialPhys, initialApp, futurePhys, futureApp };
    }
    return records;
}

function parseRecord(text) {
    const errors = [];
    if (!text.includes("DOCUMENT_STATUS=")) errors.push("Missing DOCUMENT_STATUS");
    if (!text.includes("AUTHOR_VALIDATION_STATUS=")) errors.push("Missing AUTHOR_VALIDATION_STATUS");
    if (!text.includes("INDEPENDENT_REVIEW_STATUS=")) errors.push("Missing INDEPENDENT_REVIEW_STATUS");
    if (!text.includes("READY_FOR_PHYSICAL_SCHEMA=")) errors.push("Missing READY_FOR_PHYSICAL_SCHEMA");
    if (!text.includes("READY_FOR_APPLICATION_IMPLEMENTATION=")) errors.push("Missing READY_FOR_APPLICATION_IMPLEMENTATION");
    if (!text.includes("READY_FOR_PRODUCTION_IMPLEMENTATION=")) errors.push("Missing READY_FOR_PRODUCTION_IMPLEMENTATION");
    if (!text.includes("SOURCE_CONTRADICTION_STATUS=")) errors.push("Missing SOURCE_CONTRADICTION_STATUS");
    if (!text.includes("OUTPUT MANIFEST")) errors.push("Missing OUTPUT MANIFEST");
    return errors;
}

function validate(regText, tplText, planText, evText, recText) {
    const expectedIds = [];
    for(let i=1; i<=10; i++) expectedIds.push("LEG-MKT-" + String(i).padStart(2, '0'));
    for(let i=1; i<=12; i++) expectedIds.push("OMQ-MKT-" + String(i).padStart(2, '0'));

    const errors = [];
    let dupReg = 0, dupTpl = 0, dupMatrix = 0;
    
    const regMatches = [...regText.matchAll(/### (LEG-MKT-\d{2}|OMQ-MKT-\d{2})/g)];
    if (regMatches.length > 22) { dupReg += (regMatches.length - 22); errors.push("Duplicate ID in register"); }
    const tplMatches = [...tplText.matchAll(/### Stub for (LEG-MKT-\d{2}|OMQ-MKT-\d{2})/g)];
    if (tplMatches.length > 22) { dupTpl += (tplMatches.length - 22); errors.push("Duplicate ID in templates"); }

    const reg = parseRegister(regText);
    const tpl = parseTemplates(tplText);
    const recErrors = parseRecord(recText);
    errors.push(...recErrors);

    let matrixRows = 0;
    let matrixColMismatch = 0;
    let wsMismatch = 0;
    let finalClosureMismatch = 0;

    const planMatches = [...planText.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s*\|([^\|]*)\|([^\|]*)\|([^\|]*)\|([^\|]*)\|([^\|]*)\|([^\|]*)\|([^\|]*)\|(?:\r?\n)/gm)];
    
    const allTableRows = [...planText.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s*\|.*$/gm)];
    for (const r of allTableRows) {
        const cols = r[0].split("|").length - 2;
        if (cols !== 8) {
            errors.push(`Malformed matrix row for ${r[1]} - found ${cols} columns`);
            matrixColMismatch++;
        }
    }

    if (planMatches.length > 22) { dupMatrix += (planMatches.length - 22); errors.push("Duplicate ID in matrix"); }
    
    const wsMap = {
        "Workstream A": ["LEG-MKT-01", "LEG-MKT-02", "LEG-MKT-03", "LEG-MKT-04", "OMQ-MKT-01", "OMQ-MKT-02"],
        "Workstream B": ["LEG-MKT-05", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05"],
        "Workstream C": ["LEG-MKT-07", "OMQ-MKT-08", "OMQ-MKT-09"],
        "Workstream D": ["LEG-MKT-06", "OMQ-MKT-06", "OMQ-MKT-07", "OMQ-MKT-10"],
        "Workstream E": ["LEG-MKT-08", "LEG-MKT-09", "OMQ-MKT-11"],
        "Workstream F": ["LEG-MKT-10", "OMQ-MKT-12"]
    };

    let blockerMismatch = 0;

    for (const id of expectedIds) {
        const r = reg[id];
        const t = tpl[id];
        if (!r) errors.push("Missing in register: " + id);
        if (!t) errors.push("Missing in templates: " + id);

        const expectedInitPhys = (id === "LEG-MKT-10" || id === "OMQ-MKT-12") ? "NO" : "YES";
        const expectedInitApp = (id === "LEG-MKT-10" || id === "OMQ-MKT-12") ? "NO" : "YES";
        
        if (r) {
            if (r.initialPhys !== expectedInitPhys) { blockerMismatch++; errors.push(`Register blocker mismatch initialPhys for ${id}`); }
            if (r.initialApp !== expectedInitApp) { blockerMismatch++; errors.push(`Register blocker mismatch initialApp for ${id}`); }
            if (r.futurePhys !== "YES") { blockerMismatch++; errors.push(`Register blocker mismatch futurePhys for ${id}`); }
            if (r.futureApp !== "YES") { blockerMismatch++; errors.push(`Register blocker mismatch futureApp for ${id}`); }
        }
    }

    for (const m of planMatches) {
        matrixRows++;
        const id = m[1];
        const ws = m[2].trim();
        const deps = m[4].trim();

        if (!['Workstream A', 'Workstream B', 'Workstream C', 'Workstream D', 'Workstream E', 'Workstream F'].includes(ws)) {
            wsMismatch++;
            errors.push(`Invalid Workstream in matrix: ${ws} for ${id}`);
        } else {
            if (!wsMap[ws].includes(id)) {
                wsMismatch++;
                errors.push(`Wrong producing workstream for ${id}: ${ws}`);
            }
        }

        if (ws === 'Workstream C' && deps !== 'Workstream A, Workstream B') {
            finalClosureMismatch++;
            errors.push(`Wrong final closure dependency for ${id} in Workstream C`);
        }
    }
    
    if (matrixRows !== 22) errors.push(`Matrix rows: ${matrixRows} instead of 22`);

    let evSectionMismatch = 0;
    const expectedSecMap = {
        "1": ["LEG-MKT-01", "LEG-MKT-02", "LEG-MKT-03", "LEG-MKT-04", "LEG-MKT-05", "LEG-MKT-07", "LEG-MKT-08", "LEG-MKT-09", "LEG-MKT-10", "OMQ-MKT-01", "OMQ-MKT-02", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05", "OMQ-MKT-06", "OMQ-MKT-08", "OMQ-MKT-09", "OMQ-MKT-11", "OMQ-MKT-12"],
        "2": ["LEG-MKT-06", "OMQ-MKT-07", "OMQ-MKT-10"],
        "3": ["LEG-MKT-05", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05", "OMQ-MKT-08", "OMQ-MKT-09"],
        "4": ["LEG-MKT-09", "OMQ-MKT-11"],
        "5": expectedIds
    };

    const exactIDBlocks = [...evText.matchAll(/- exact LEG-MKT and OMQ-MKT IDs: (.*)/g)];
    if (exactIDBlocks.length !== 5) {
        errors.push(`Could not find 5 exact ID lines in Evidence Pack, found ${exactIDBlocks.length}`);
        evSectionMismatch++;
    } else {
        for (let s=1; s<=5; s++) {
            const secStr = String(s);
            const reqIds = expectedSecMap[secStr];
            const line = exactIDBlocks[s-1][1];
            for (const reqId of reqIds) {
                if (s === 5 && line.includes("All LEG-MKT and OMQ-MKT IDs")) {
                    continue; 
                }
                if (!line.includes(reqId)) {
                    evSectionMismatch++;
                    errors.push(`ID ${reqId} missing from Evidence section ${secStr}`);
                }
            }
        }
    }
    
    let evFormatErrors = 0;
    if (!evText.includes("- external review instruction:")) evFormatErrors++;

    return {
        errors,
        metrics: {
            DEPENDENCY_MATRIX_ROW_COUNT: matrixRows,
            DEPENDENCY_MATRIX_COLUMN_MISMATCHES: matrixColMismatch,
            PRODUCING_WORKSTREAM_MISMATCHES: wsMismatch,
            FINAL_CLOSURE_DEPENDENCY_MISMATCHES: finalClosureMismatch,
            EVIDENCE_SECTION_MAPPING_MISMATCHES: evSectionMismatch,
            EVIDENCE_PACK_FORMAT_ERRORS: evFormatErrors,
            REVIEW_RECORD_STATUS_MISMATCHES: recErrors.length,
            BLOCKER_CLASSIFICATION_MISMATCHES: blockerMismatch,
            DUPLICATE_GATE_IDS_REGISTER: dupReg,
            DUPLICATE_GATE_IDS_TEMPLATES: dupTpl,
            DUPLICATE_GATE_IDS_MATRIX: dupMatrix
        }
    };
}

function run() {
    let regText = fs.readFileSync(regPath, 'utf8');
    let tplText = fs.readFileSync(tplPath, 'utf8');
    let planText = fs.readFileSync(planPath, 'utf8');
    let evText = fs.readFileSync(evPath, 'utf8');
    let recText = fs.readFileSync(recPath, 'utf8');

    const baseline = validate(regText, tplText, planText, evText, recText);

    let selfTestCount = 0;
    let selfTestFailures = 0;

    function runTest(name, mutator, expectedErrorFragment) {
        selfTestCount++;
        if (baseline.errors.length > 0) {
            console.log(`Self-Test FAILED ${name}: baseline has errors! ` + baseline.errors.join(", "));
            selfTestFailures++;
            return;
        }
        const [r, t, p, e, rec] = mutator(regText, tplText, planText, evText, recText);
        const mutatedBaseline = validate(r, t, p, e, rec);
        const hasExpectedError = mutatedBaseline.errors.some(err => err.includes(expectedErrorFragment));
        if (!hasExpectedError) {
            console.log(`Self-Test FAILED ${name}: Expected error containing '${expectedErrorFragment}' not found.`);
            selfTestFailures++;
        }
    }

    runTest("malformed dependency-matrix row with extra column", (r, t, p, e, rec) => {
        return [r, t, p.replace(/(\| LEG-MKT-01 \|[^\r\n]*)\|/, "$1 | EXTRA |"), e, rec];
    }, "Malformed matrix row");

    runTest("wrong producing workstream", (r, t, p, e, rec) => {
        return [r, t, p.replace(/\| LEG-MKT-01\s*\| Workstream A/, "| LEG-MKT-01 | Workstream B"), e, rec];
    }, "Wrong producing workstream");

    runTest("wrong final closure dependency", (r, t, p, e, rec) => {
        return [r, t, p.replace(/\| LEG-MKT-07\s*\| Workstream C\s*\| Workstream B\s*\| Workstream A, Workstream B/, "| LEG-MKT-07 | Workstream C         | Workstream B              | Workstream Z             "), e, rec];
    }, "Wrong final closure dependency");

    runTest("duplicate in register", (r, t, p, e, rec) => {
        return [r + "\n### LEG-MKT-01\n", t, p, e, rec];
    }, "Duplicate ID in register");

    runTest("duplicate in templates", (r, t, p, e, rec) => {
        return [r, t + "\n### Stub for LEG-MKT-01\n", p, e, rec];
    }, "Duplicate ID in templates");

    runTest("duplicate in matrix", (r, t, p, e, rec) => {
        return [r, t, p + "\n| LEG-MKT-01 | Workstream A         | Workstream E              | None                     | YES               | YES                  | YES             | NO               |\n", e, rec];
    }, "Duplicate ID in matrix");

    console.log(`NEGATIVE_SELF_TEST_COUNT=${selfTestCount}`);
    console.log(`NEGATIVE_SELF_TEST_FAILURES=${selfTestFailures}`);
    console.log(`BASELINE_VALIDATION_ERRORS=${baseline.errors.length}`);

    for (const [k, v] of Object.entries(baseline.metrics)) {
        console.log(`${k}=${v}`);
    }

    if (baseline.errors.length > 0) {
        console.log("Validation Failed with errors:");
        for (const e of baseline.errors) console.log(" - " + e);
        process.exit(1);
    }
    
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
