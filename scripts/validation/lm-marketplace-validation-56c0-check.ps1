$ErrorActionPreference = 'Stop'

Write-Host "======================================================================"
Write-Host "LM-MARKETPLACE-VALIDATION-56C0-CHECK"
Write-Host "======================================================================"

$code = @'
const fs = require('fs');

const regPath = 'docs/domain/lm-marketplace-validation-56c0-gate-register.md';
const tplPath = 'docs/domain/lm-marketplace-validation-56c0-decision-record-templates.md';
const planPath = 'docs/domain/lm-marketplace-validation-56c0-dependency-and-unblock-plan.md';
const evPath = 'docs/domain/lm-marketplace-validation-56c0-evidence-request-pack.md';
const recPath = 'docs/domain/lm-marketplace-validation-56c0-review-and-validation-record.md';

function normalizeEol(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
}

function validate(regTxt, tplTxt, planTxt, evTxt, recTxt) {
    regTxt = normalizeEol(regTxt);
    tplTxt = normalizeEol(tplTxt);
    planTxt = normalizeEol(planTxt);
    evTxt = normalizeEol(evTxt);
    recTxt = normalizeEol(recTxt);
    let errors = [];
    let metrics = {
        SAFE_DEFAULT_MISMATCHES: 0,
        PRIMARY_OWNER_MISMATCHES: 0,
        SUPPORTING_REVIEWER_MISMATCHES: 0,
        TEMPLATE_STATUS_MISMATCHES: 0,
        TEMPLATE_EVIDENCE_MISMATCHES: 0,
        TEMPLATE_DECISION_MISMATCHES: 0,
        TEMPLATE_APPROVAL_MISMATCHES: 0,
        REGISTER_STATUS_MISMATCHES: 0,
        REVIEW_RECORD_STATUS_MISMATCHES: 0,
        REVIEW_RECORD_READINESS_MISMATCHES: 0,
        REVIEW_RECORD_REVIEW_STATE_MISMATCHES: 0,
        DUPLICATE_GATE_IDS_REGISTER: 0,
        MISSING_GATE_IDS_REGISTER: 0,
        DUPLICATE_GATE_IDS_TEMPLATES: 0,
        MISSING_GATE_IDS_TEMPLATES: 0,
        DUPLICATE_GATE_IDS_MATRIX: 0,
        MISSING_GATE_IDS_MATRIX: 0,
        DEPENDENCY_MATRIX_ROW_COUNT: 0,
        DEPENDENCY_MATRIX_COLUMN_MISMATCHES: 0,
        PRODUCING_WORKSTREAM_MISMATCHES: 0,
        PRELIMINARY_PARALLEL_WORK_MISMATCHES: 0,
        FINAL_CLOSURE_DEPENDENCY_MISMATCHES: 0,
        MATRIX_REGISTER_BLOCKER_MISMATCHES: 0,
        EVIDENCE_SECTION_MISSING_IDS: 0,
        EVIDENCE_SECTION_EXTRA_IDS: 0,
        EVIDENCE_PACK_FORMAT_ERRORS: 0,
        REOPEN_POLICY_MISMATCHES: 0,
        EARLIEST_SCHEMA_SPRINT_MISMATCHES: 0,
        REVIEWED_HEAD_SHA_MISMATCHES: 0
    };

    const expectedIds = [];
    for(let i=1; i<=10; i++) expectedIds.push("LEG-MKT-" + String(i).padStart(2, '0'));
    for(let i=1; i<=12; i++) expectedIds.push("OMQ-MKT-" + String(i).padStart(2, '0'));

    const regMatches = [...regTxt.matchAll(/### (LEG-MKT-\d{2}|OMQ-MKT-\d{2})(?=\r?\n)/g)].map(m => m[1]);
    const tplMatches = [...tplTxt.matchAll(/### Stub for (LEG-MKT-\d{2}|OMQ-MKT-\d{2})(?=\r?\n)/g)].map(m => m[1]);
    const matMatches = [...planTxt.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s*\|/gm)].map(m => m[1]);

    const countIds = (arr) => arr.reduce((acc, cur) => { acc[cur] = (acc[cur] || 0) + 1; return acc; }, {});
    const regCounts = countIds(regMatches);
    const tplCounts = countIds(tplMatches);
    const matCounts = countIds(matMatches);

    for (const id of expectedIds) {
        if (!regCounts[id]) { metrics.MISSING_GATE_IDS_REGISTER++; errors.push(`Register missing ${id}`); }
        else if (regCounts[id] > 1) { metrics.DUPLICATE_GATE_IDS_REGISTER += (regCounts[id]-1); errors.push(`Register duplicate ${id}`); }

        if (!tplCounts[id]) { metrics.MISSING_GATE_IDS_TEMPLATES++; errors.push(`Template missing ${id}`); }
        else if (tplCounts[id] > 1) { metrics.DUPLICATE_GATE_IDS_TEMPLATES += (tplCounts[id]-1); errors.push(`Template duplicate ${id}`); }

        if (!matCounts[id]) { metrics.MISSING_GATE_IDS_MATRIX++; errors.push(`Matrix missing ${id}`); }
        else if (matCounts[id] > 1) { metrics.DUPLICATE_GATE_IDS_MATRIX += (matCounts[id]-1); errors.push(`Matrix duplicate ${id}`); }
    }

    for (const id in regCounts) if (!expectedIds.includes(id)) { metrics.DUPLICATE_GATE_IDS_REGISTER += regCounts[id]; errors.push(`Unknown id in reg: ${id}`); }
    for (const id in tplCounts) if (!expectedIds.includes(id)) { metrics.DUPLICATE_GATE_IDS_TEMPLATES += tplCounts[id]; errors.push(`Unknown id in tpl: ${id}`); }
    for (const id in matCounts) if (!expectedIds.includes(id)) { metrics.DUPLICATE_GATE_IDS_MATRIX += matCounts[id]; errors.push(`Unknown id in mat: ${id}`); }

    const regDict = {};
    const regBlocks = [...regTxt.matchAll(/### (LEG-MKT-\d{2}|OMQ-MKT-\d{2})\r?\n([\s\S]*?)(?=\r?\n### |$)/g)];
    for (const m of regBlocks) {
        const id = m[1];
        const block = m[2];
        const status = (block.match(/^STATUS=(.*)$/m) || [])[1]?.trim();
        const safeDef = (block.match(/^- exact (?:current )?safe documentation default: (.*)$/m) || [])[1]?.trim();
        const owner = (block.match(/^- (?:exact )?primary evidence owner: (.*)$/m) || [])[1]?.trim();
        const reviewer = (block.match(/^- supporting reviewer: (.*)$/m) || [])[1]?.trim();
        const mvpPhys = (block.match(/^- initial-MVP physical-schema blocker: (.*)$/m) || [])[1]?.trim();
        const mvpApp = (block.match(/^- initial-MVP application blocker: (.*)$/m) || [])[1]?.trim();
        const futPhys = (block.match(/^- future-reseller physical-schema blocker: (.*)$/m) || [])[1]?.trim();
        const futApp = (block.match(/^- future-reseller application blocker: (.*)$/m) || [])[1]?.trim();
        regDict[id] = { status, safeDef, owner, reviewer, mvpPhys, mvpApp, futPhys, futApp };
        if (status !== 'OPEN') { metrics.REGISTER_STATUS_MISMATCHES++; errors.push(`Register ${id} status != OPEN`); }

        if (id === 'OMQ-MKT-12' && reviewer === 'DPO') { errors.push("OMQ-MKT-12 assigned to DPO"); metrics.SUPPORTING_REVIEWER_MISMATCHES++; }
    }

    const tplDict = {};
    const tplBlocks = [...tplTxt.matchAll(/### Stub for (LEG-MKT-\d{2}|OMQ-MKT-\d{2})\r?\n([\s\S]*?)(?=\r?\n### |$)/g)];
    for (const m of tplBlocks) {
        const id = m[1];
        const block = m[2];
        const safeDef = (block.match(/^- current safe default: (.*)$/m) || [])[1]?.trim();
        const owner = (block.match(/^- decision owner: (.*)$/m) || [])[1]?.trim();
        const reviewer = (block.match(/^- supporting reviewers: (.*)$/m) || [])[1]?.trim();
        const status = (block.match(/^- status: (.*)$/m) || [])[1]?.trim();
        const evidence = (block.match(/^- evidence reviewed: (.*)$/m) || [])[1]?.trim();
        const decision = (block.match(/^- decision: (.*)$/m) || [])[1]?.trim();
        const approval = (block.match(/^- approval signatures: (.*)$/m) || [])[1]?.trim();
        tplDict[id] = { safeDef, owner, reviewer, status, evidence, decision, approval };

        if (status !== 'OPEN') { metrics.TEMPLATE_STATUS_MISMATCHES++; errors.push(`Template ${id} status != OPEN`); }
        if (evidence !== 'NOT_ATTACHED') { metrics.TEMPLATE_EVIDENCE_MISMATCHES++; errors.push(`Template ${id} evidence != NOT_ATTACHED`); }
        if (decision !== 'NOT_RECORDED') { metrics.TEMPLATE_DECISION_MISMATCHES++; errors.push(`Template ${id} decision != NOT_RECORDED`); }
        if (approval !== 'NOT_GRANTED') { metrics.TEMPLATE_APPROVAL_MISMATCHES++; errors.push(`Template ${id} approval != NOT_GRANTED`); }
    }

    for (const id of expectedIds) {
        const r = regDict[id];
        const t = tplDict[id];
        if (r && t) {
            if (r.safeDef !== t.safeDef) { metrics.SAFE_DEFAULT_MISMATCHES++; errors.push(`Safe default mismatch for ${id}`); }
            if (r.owner !== t.owner) { metrics.PRIMARY_OWNER_MISMATCHES++; errors.push(`Owner mismatch for ${id}`); }
            if (r.reviewer !== t.reviewer) { metrics.SUPPORTING_REVIEWER_MISMATCHES++; errors.push(`Reviewer mismatch for ${id}`); }
        }
    }

    const matLines = [...planTxt.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s*\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|(?:\r?\n)/gm)];
    metrics.DEPENDENCY_MATRIX_ROW_COUNT = matLines.length;

    const matLoose = [...planTxt.matchAll(/^\| ((?:LEG|OMQ)-MKT-\d{2})\s*\|.*$/gm)];
    for (const m of matLoose) {
        const cols = m[0].split('|').length - 2;
        if (cols !== 8) {
            metrics.DEPENDENCY_MATRIX_COLUMN_MISMATCHES++;
            errors.push(`Malformed matrix row cols=${cols} for ${m[1]}`);
        }
    }

    const wsMap = {
        "Workstream A": ["LEG-MKT-01", "LEG-MKT-02", "LEG-MKT-03", "LEG-MKT-04", "OMQ-MKT-01", "OMQ-MKT-02"],
        "Workstream B": ["LEG-MKT-05", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05"],
        "Workstream C": ["LEG-MKT-07", "OMQ-MKT-08", "OMQ-MKT-09"],
        "Workstream D": ["LEG-MKT-06", "OMQ-MKT-06", "OMQ-MKT-07", "OMQ-MKT-10"],
        "Workstream E": ["LEG-MKT-08", "LEG-MKT-09", "OMQ-MKT-11"],
        "Workstream F": ["LEG-MKT-10", "OMQ-MKT-12"]
    };

    const finalClosureMap = {
        "Workstream A": "None",
        "Workstream B": "Workstream A",
        "Workstream C": "Workstream A, Workstream B",
        "Workstream D": "Workstream A",
        "Workstream E": "Workstream A",
        "Workstream F": "None"
    };

    const prelimMap = {
        "Workstream A": "Workstream E",
        "Workstream B": "Workstream C",
        "Workstream C": "Workstream B",
        "Workstream D": "Workstream B",
        "Workstream E": "Workstream A, Workstream B",
        "Workstream F": "None"
    };

    const reopenPolicyById = {
        "LEG-MKT-01": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-02": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-03": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-04": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-05": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-06": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-07": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-08": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-09": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "LEG-MKT-10": "FUTURE_EXTENSION_ONLY",
        "OMQ-MKT-01": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-02": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-03": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-04": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-05": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-06": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-07": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-08": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-09": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-10": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-11": "CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED",
        "OMQ-MKT-12": "FUTURE_EXTENSION_ONLY"
    };

    const earliestSchemaSprintById = {
        "LEG-MKT-01": "LM-MARKETPLACE-SCHEMA-56B1",
        "LEG-MKT-02": "LM-MARKETPLACE-SCHEMA-56B1",
        "LEG-MKT-03": "LM-MARKETPLACE-SCHEMA-56B1",
        "LEG-MKT-04": "LM-MARKETPLACE-SCHEMA-56B1",
        "LEG-MKT-05": "LM-MARKETPLACE-SCHEMA-56B3",
        "LEG-MKT-06": "LM-MARKETPLACE-SCHEMA-56B3",
        "LEG-MKT-07": "LM-MARKETPLACE-SCHEMA-56B3",
        "LEG-MKT-08": "LM-MARKETPLACE-SCHEMA-56B2",
        "LEG-MKT-09": "LM-MARKETPLACE-SCHEMA-56B1",
        "LEG-MKT-10": "FUTURE_RESELLER_ACTIVATION_SPRINT_NOT_SCHEDULED",
        "OMQ-MKT-01": "LM-MARKETPLACE-SCHEMA-56B2",
        "OMQ-MKT-02": "LM-MARKETPLACE-SCHEMA-56B2",
        "OMQ-MKT-03": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-04": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-05": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-06": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-07": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-08": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-09": "LM-MARKETPLACE-SCHEMA-56B3",
        "OMQ-MKT-10": "LM-MARKETPLACE-SCHEMA-56B4",
        "OMQ-MKT-11": "LM-MARKETPLACE-SCHEMA-56B6",
        "OMQ-MKT-12": "FUTURE_RESELLER_ACTIVATION_SPRINT_NOT_SCHEDULED"
    };

    for (const m of matLines) {
        const id = m[1].trim();
        const ws = m[2].trim();
        const prelim = m[3].trim();
        const closure = m[4].trim();
        const blkMvp = m[5].trim();
        const blkFut = m[6].trim();
        const reopenPol = m[7].trim();
        const schemaSpr = m[8].trim();

        if (!wsMap[ws] || !wsMap[ws].includes(id)) {
            metrics.PRODUCING_WORKSTREAM_MISMATCHES++;
            errors.push(`Producing workstream mismatch for ${id}`);
        }
        if (finalClosureMap[ws] && closure !== finalClosureMap[ws]) {
            metrics.FINAL_CLOSURE_DEPENDENCY_MISMATCHES++;
            errors.push(`Final closure mismatch for ${id}`);
        }
        if (prelimMap[ws] && prelim !== prelimMap[ws]) {
            metrics.PRELIMINARY_PARALLEL_WORK_MISMATCHES++;
            errors.push(`Preliminary parallel work mismatch for ${id}`);
        }
        if (reopenPolicyById[id] && reopenPol !== reopenPolicyById[id]) {
            metrics.REOPEN_POLICY_MISMATCHES++;
            errors.push(`Reopen policy mismatch for ${id}`);
        }
        if (earliestSchemaSprintById[id] && schemaSpr !== earliestSchemaSprintById[id]) {
            metrics.EARLIEST_SCHEMA_SPRINT_MISMATCHES++;
            errors.push(`Earliest schema sprint mismatch for ${id}`);
        }

        const r = regDict[id];
        if (r) {
            let expMvp = (id === 'LEG-MKT-10' || id === 'OMQ-MKT-12') ? 'NO' : 'YES';
            let expFut = 'YES';
            if (blkMvp !== expMvp || blkFut !== expFut || r.mvpPhys !== expMvp || r.futPhys !== expFut || r.mvpApp !== expMvp || r.futApp !== expFut) {
                metrics.MATRIX_REGISTER_BLOCKER_MISMATCHES++;
                errors.push(`Blocker mismatch for ${id}`);
            }
        }
    }

    const expStatus = {
        "DOCUMENT_STATUS": "INDEPENDENT_REVIEW_PASSED",
        "AUTHOR_VALIDATION_STATUS": "PASS_READY_FOR_RENEWED_INDEPENDENT_REVIEW",
        "AUTHOR_REMEDIATION_STATUS": "PASS_READY_FOR_FINAL_REREVIEW",
        "INDEPENDENT_REVIEW_STATUS": "PASS"
    };
    for (const [k, v] of Object.entries(expStatus)) {
        const m = recTxt.match(new RegExp(`^${k}=(.*)$`, 'm'));
        if (!m || m[1].trim() !== v) {
            metrics.REVIEW_RECORD_STATUS_MISMATCHES++;
            errors.push(`Record status mismatch for ${k}`);
        }
    }

    const mSource = recTxt.match(/^SOURCE_CONTRADICTION_STATUS=(.*)$/m);
    if (!mSource || mSource[1].trim() !== 'RESOLVED') { metrics.REVIEW_RECORD_STATUS_MISMATCHES++; errors.push("Missing SOURCE_CONTRADICTION_STATUS"); }

    const expReadiness = {
        "READY_FOR_PHYSICAL_SCHEMA": "NO",
        "READY_FOR_APPLICATION_IMPLEMENTATION": "NO",
        "READY_FOR_PRODUCTION_IMPLEMENTATION": "NO"
    };
    for (const [k, v] of Object.entries(expReadiness)) {
        const m = recTxt.match(new RegExp(`^${k}=(.*)$`, 'm'));
        if (!m || m[1].trim() !== v) {
            metrics.REVIEW_RECORD_READINESS_MISMATCHES++;
            errors.push(`Record readiness mismatch for ${k}`);
        }
    }

    const mRevPerf = recTxt.match(/^- independent review performed: (.*)$/m);
    if (!mRevPerf || mRevPerf[1].trim() !== 'YES') { metrics.REVIEW_RECORD_REVIEW_STATE_MISMATCHES++; errors.push("Review performed mismatch"); }
    const mRevVerd = recTxt.match(/^- independent review verdict: (.*)$/m);
    if (!mRevVerd || mRevVerd[1].trim() !== 'PASS') { metrics.REVIEW_RECORD_REVIEW_STATE_MISMATCHES++; errors.push("Review verdict mismatch"); }
    const mRevSha = recTxt.match(/^- reviewed head SHA: (.*)$/m);
    if (!mRevSha || mRevSha[1].trim() !== '192ce4780de41c65b8b6e8ffb283802f1943bee5') { metrics.REVIEWED_HEAD_SHA_MISMATCHES++; errors.push("Reviewed head SHA mismatch"); }

    const expectedSecMap = {
        "1": ["LEG-MKT-01", "LEG-MKT-02", "LEG-MKT-03", "LEG-MKT-04", "LEG-MKT-05", "LEG-MKT-07", "LEG-MKT-08", "LEG-MKT-09", "LEG-MKT-10", "OMQ-MKT-01", "OMQ-MKT-02", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05", "OMQ-MKT-06", "OMQ-MKT-08", "OMQ-MKT-09", "OMQ-MKT-11", "OMQ-MKT-12"],
        "2": ["LEG-MKT-06", "OMQ-MKT-07", "OMQ-MKT-10"],
        "3": ["LEG-MKT-05", "OMQ-MKT-03", "OMQ-MKT-04", "OMQ-MKT-05", "OMQ-MKT-08", "OMQ-MKT-09"],
        "4": ["LEG-MKT-09", "OMQ-MKT-11"]
    };

    const evSections = [...evTxt.matchAll(/## \d\. (.*?)\r?\n([\s\S]*?)(?=\r?\n## |\r?\n$)/g)];
    if (evSections.length < 5) {
        errors.push("Missing evidence sections");
        metrics.EVIDENCE_PACK_FORMAT_ERRORS++;
    }
    for (let s=1; s<=5; s++) {
        if (s-1 >= evSections.length) continue;
        const block = evSections[s-1][2];

        const reqKeys = [
            "- external review instruction:",
            "- approved business-model assumptions and intended operating constraints:",
            "- unresolved questions:",
            "- expected response format:"
        ];
        for (const key of reqKeys) {
            if (!block.includes(key)) {
                metrics.EVIDENCE_PACK_FORMAT_ERRORS++;
                errors.push(`Missing key in ev section ${s}: ${key}`);
            }
        }
        const nested = block.match(/- approved business-model assumptions.*\n([\s\S]*?)(?=\n- |$)/);
        if (!nested || !nested[1].match(/^\s+-/m)) {
            metrics.EVIDENCE_PACK_FORMAT_ERRORS++;
            errors.push(`No nested assumption in ev section ${s}`);
        }

        const mExact = block.match(/- exact LEG-MKT and OMQ-MKT IDs:(.*)/);
        if (!mExact) {
            metrics.EVIDENCE_PACK_FORMAT_ERRORS++;
            errors.push(`Missing exact IDs line in sec ${s}`);
        } else {
            const idLine = mExact[1];
            if (s === 5) {
                if (!idLine.includes('All LEG-MKT and OMQ-MKT IDs')) {
                    metrics.EVIDENCE_SECTION_MISSING_IDS++;
                    errors.push("Section 5 must contain All LEG-MKT and OMQ-MKT IDs");
                }
            } else {
                const reqIds = expectedSecMap[String(s)];
                for (const id of reqIds) {
                    if (!idLine.includes(id)) { metrics.EVIDENCE_SECTION_MISSING_IDS++; errors.push(`Sec ${s} missing ${id}`); }
                }
                const foundIds = [...idLine.matchAll(/(LEG|OMQ)-MKT-\d{2}/g)].map(x => x[0]);
                for (const f of foundIds) {
                    if (!reqIds.includes(f)) { metrics.EVIDENCE_SECTION_EXTRA_IDS++; errors.push(`Sec ${s} extra id ${f}`); }
                }
            }
        }
    }

    return { errors, metrics };
}

function run() {
    let regText = fs.readFileSync(regPath, 'utf8');
    let tplText = fs.readFileSync(tplPath, 'utf8');
    let planText = fs.readFileSync(planPath, 'utf8');
    let evText = fs.readFileSync(evPath, 'utf8');
    let recText = fs.readFileSync(recPath, 'utf8');

    let selfTestCount = 0;
    let selfTestFailures = 0;

    const baseReg = regText, baseTpl = tplText, basePlan = planText, baseEv = evText, baseRec = recText;
    const base = validate(baseReg, baseTpl, basePlan, baseEv, baseRec);

    const toCrlf = text => normalizeEol(text).replace(/\n/g, '\r\n');
    const crlfBaseline = validate(
        toCrlf(baseReg),
        toCrlf(baseTpl),
        toCrlf(basePlan),
        toCrlf(baseEv),
        toCrlf(baseRec)
    );

    const toMixed = text => {
        let lines = normalizeEol(text).split('\n');
        return lines.map((l, i) => i % 2 === 0 ? l + '\r\n' : l + '\n').join('');
    };
    const mixedBaseline = validate(
        toMixed(baseReg),
        toMixed(baseTpl),
        toMixed(basePlan),
        toMixed(baseEv),
        toMixed(baseRec)
    );

    function test(name, corruptFn, expFrag) {
        selfTestCount++;
        if (base.errors.length > 0) {
            console.log(`Self-Test FAILED ${name}: baseline has errors! ` + base.errors[0]);
            selfTestFailures++;
            return;
        }
        const baselineInputs = [baseReg, baseTpl, basePlan, baseEv, baseRec];
        const mut = corruptFn();

        const mutationApplied = mut.some((val, idx) => val !== baselineInputs[idx]);
        if (!mutationApplied) {
            console.log(`Self-Test FAILED ${name}: mutation did not change input`);
            selfTestFailures++;
            return;
        }

        const res = validate(...mut);
        const hasErr = res.errors.some(e => e.includes(expFrag));
        if (!hasErr) {
            console.log(`Self-Test FAILED ${name}: missing err '${expFrag}'`);
            selfTestFailures++;
        }
    }

    test("1. safe default mismatch", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- current safe default: )([^\n]+)/, "$1CORRUPT"), basePlan, baseEv, baseRec], "Safe default mismatch");
    test("2. primary owner mismatch", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- decision owner: )([^\n]+)/, "$1CORRUPT"), basePlan, baseEv, baseRec], "Owner mismatch");
    test("3. supporting reviewer mismatch", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- supporting reviewers: )([^\n]+)/, "$1CORRUPT"), basePlan, baseEv, baseRec], "Reviewer mismatch");
    test("4. OMQ-MKT-12 assigned to DPO", () => [baseReg.replace(/### OMQ-MKT-12\r?\n([\s\S]*?)- supporting reviewer: UNASSIGNED/, '### OMQ-MKT-12\n$1- supporting reviewer: DPO'), baseTpl, basePlan, baseEv, baseRec], "OMQ-MKT-12 assigned to DPO");
    test("5. Register STATUS=CLOSED", () => [baseReg.replace(/STATUS=OPEN/, 'STATUS=CLOSED'), baseTpl, basePlan, baseEv, baseRec], "status != OPEN");
    test("6. Template status CLOSED", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- status: )OPEN/, "$1CLOSED"), basePlan, baseEv, baseRec], "status != OPEN");
    test("7. Template decision APPROVED", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- decision: )NOT_RECORDED/, "$1APPROVED"), basePlan, baseEv, baseRec], "decision != NOT_RECORDED");
    test("8. Template evidence ATTACHED", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- evidence reviewed: )NOT_ATTACHED/, "$1ATTACHED"), basePlan, baseEv, baseRec], "evidence != NOT_ATTACHED");
    test("9. Template approval GRANTED", () => [baseReg, baseTpl.replace(/(### Stub for LEG-MKT-01[\s\S]*?- approval signatures: )NOT_GRANTED/, "$1GRANTED"), basePlan, baseEv, baseRec], "approval != NOT_GRANTED");
    test("10. Initial MVP physical blocker changed", () => [baseReg.replace(/- initial-MVP physical-schema blocker: YES/, '- initial-MVP physical-schema blocker: NO'), baseTpl, basePlan, baseEv, baseRec], "Blocker mismatch");
    test("11. Initial MVP application blocker changed", () => [baseReg.replace(/- initial-MVP application blocker: YES/, '- initial-MVP application blocker: NO'), baseTpl, basePlan, baseEv, baseRec], "Blocker mismatch");
    test("12. Future physical blocker changed", () => [baseReg.replace(/- future-reseller physical-schema blocker: YES/, '- future-reseller physical-schema blocker: NO'), baseTpl, basePlan, baseEv, baseRec], "Blocker mismatch");
    test("13. Future application blocker changed", () => [baseReg.replace(/- future-reseller application blocker: YES/, '- future-reseller application blocker: NO'), baseTpl, basePlan, baseEv, baseRec], "Blocker mismatch");
    test("14. malformed matrix extra column", () => [baseReg, baseTpl, basePlan.replace(/(\| LEG-MKT-01 \|[^\r\n]*)\|/, "$1 | EXTRA |"), baseEv, baseRec], "Malformed matrix row cols");
    test("15. wrong producing workstream", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01\s*\| Workstream A/, "| LEG-MKT-01 | Workstream B"), baseEv, baseRec], "Producing workstream mismatch");
    test("16. wrong final closure dependency", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-07\s*\| Workstream C\s*\| Workstream B\s*\| Workstream A, Workstream B/, "| LEG-MKT-07 | Workstream C         | Workstream B              | Workstream Z             "), baseEv, baseRec], "Final closure mismatch");
    test("17. duplicate Register ID", () => [baseReg + "\n### LEG-MKT-01\nSTATUS=OPEN\n", baseTpl, basePlan, baseEv, baseRec], "Register duplicate");
    test("18. missing Register ID", () => [baseReg.replace(/### LEG-MKT-01/, "### MISSING-01"), baseTpl, basePlan, baseEv, baseRec], "Register missing");
    test("19. duplicate Template ID", () => [baseReg, baseTpl + "\n### Stub for LEG-MKT-01\n", basePlan, baseEv, baseRec], "Template duplicate");
    test("20. missing Template ID", () => [baseReg, baseTpl.replace(/### Stub for LEG-MKT-01/, "### Stub for MISSING-01"), basePlan, baseEv, baseRec], "Template missing");
    test("21. duplicate Matrix ID", () => [baseReg, baseTpl, basePlan + "\n| LEG-MKT-01 | Workstream A         | None                      | None                     | YES               | YES                  | YES             | NO               |\n", baseEv, baseRec], "Matrix duplicate");
    test("22. missing Matrix ID", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01/, "| MISSING-01"), baseEv, baseRec], "Matrix missing");
    test("23. duplicate-plus-missing Matrix with row count still 22", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01/, "| LEG-MKT-02"), baseEv, baseRec], "Matrix missing");
    test("24. wrong Review Record readiness value", () => [baseReg, baseTpl, basePlan, baseEv, baseRec.replace(/READY_FOR_PHYSICAL_SCHEMA=NO/, "READY_FOR_PHYSICAL_SCHEMA=YES")], "readiness mismatch");
    test("25. ID assigned to wrong Evidence Pack section", () => [baseReg, baseTpl, basePlan, baseEv.replace(/- exact LEG-MKT and OMQ-MKT IDs: (.*)LEG-MKT-01, (.*)/, "- exact LEG-MKT and OMQ-MKT IDs: $1$2"), baseRec], "Sec 1 missing LEG-MKT-01");
    test("26. missing Evidence Pack instruction/assumptions block", () => [baseReg, baseTpl, basePlan, baseEv.replace(/- external review instruction:/, ""), baseRec], "Missing key");
    test("27. wrong preliminary parallel work", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01\s*\| Workstream A\s*\| Workstream E/, "| LEG-MKT-01 | Workstream A         | Workstream F"), baseEv, baseRec], "Preliminary parallel work mismatch");
    test("28. wrong 56B0 reopen policy", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01\s*\|([^\r\n]*)\| CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED\s*\|/, "| LEG-MKT-01 |$1| WRONG_POLICY |"), baseEv, baseRec], "Reopen policy mismatch");
    test("29. wrong earliest downstream schema sprint", () => [baseReg, baseTpl, basePlan.replace(/\| LEG-MKT-01\s*\|([^\r\n]*)\| LM-MARKETPLACE-SCHEMA-56B1\s*\|/, "| LEG-MKT-01 |$1| LM-MARKETPLACE-SCHEMA-WRONG |"), baseEv, baseRec], "Earliest schema sprint mismatch");
    test("30. missing original author validation status", () => [baseReg, baseTpl, basePlan, baseEv, baseRec.replace(/AUTHOR_VALIDATION_STATUS=PASS_READY_FOR_RENEWED_INDEPENDENT_REVIEW/, "AUTHOR_VALIDATION_STATUS=MISSING")], "Record status mismatch for AUTHOR_VALIDATION_STATUS");
    test("31. wrong independent review PASS status", () => [baseReg, baseTpl, basePlan, baseEv, baseRec.replace(/^- independent review verdict: PASS/m, "- independent review verdict: FAIL")], "Review verdict mismatch");
    test("32. wrong reviewed head SHA", () => [baseReg, baseTpl, basePlan, baseEv, baseRec.replace(/^- reviewed head SHA: 192ce4780de41c65b8b6e8ffb283802f1943bee5/m, "- reviewed head SHA: WRONG_SHA")], "Reviewed head SHA mismatch");

    console.log(`NEGATIVE_SELF_TEST_COUNT=${selfTestCount}`);
    console.log(`NEGATIVE_SELF_TEST_FAILURES=${selfTestFailures}`);
    console.log(`BASELINE_VALIDATION_ERRORS=${base.errors.length}`);
    console.log(`CRLF_BASELINE_VALIDATION_ERRORS=${crlfBaseline.errors.length}`);
    console.log(`MIXED_EOL_BASELINE_VALIDATION_ERRORS=${mixedBaseline.errors.length}`);

    for (const [k, v] of Object.entries(base.metrics)) {
        console.log(`${k}=${v}`);
    }

    if (base.errors.length > 0 || crlfBaseline.errors.length > 0 || mixedBaseline.errors.length > 0 || selfTestFailures > 0) {
        console.log("Validation Failed with errors:");
        for (const e of base.errors) console.log(" - " + e);
        for (const e of crlfBaseline.errors) console.log(" - CRLF: " + e);
        for (const e of mixedBaseline.errors) console.log(" - MIXED: " + e);
        process.exit(1);
    }

    process.exit(0);
}

run();
'@

$tempFile = [System.IO.Path]::GetTempFileName()
$code | Out-File $tempFile -Encoding UTF8
node $tempFile
$exitCode = $LASTEXITCODE
Remove-Item $tempFile -ErrorAction SilentlyContinue

if ($exitCode -ne 0) {
    Write-Host "Validation script failed."
    exit $exitCode
}
Write-Host "Validation script passed."
exit 0
