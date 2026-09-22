import * as fs from 'fs';
import * as path from 'path';

// Define paths
const fixturePath = path.join(__dirname, 'sql/fixtures/lm46-technical-attributes-sanitized.json');
const mapPath = path.join(__dirname, 'sql/fixtures/lm-cat-filter-46-map-v1.json');
const reportPath = path.join(__dirname, 'lm46-dry-run-report.txt');

interface TechnicalAttributes {
  [key: string]: string | number;
}

interface SourceOffer {
  sourceOfferId: number;
  sourceCategoryId: number;
  technicalAttributes: TechnicalAttributes;
}

interface Fixture {
  contractVersion: string;
  fixtureClass: string;
  sourceClass: string;
  sanitizationConfirmed: boolean;
  nonSyntheticValuesConfirmed: boolean;
  offers: SourceOffer[];
}

interface MapEntry {
  manifestVersion: string;
  sourceKey: string;
  sourceCategoryScope: number[];
  observedJsonTypes: string[];
  targetAttributeStableKey: string | null;
  targetAttributeType: string | null;
  targetUnit: string | null;
  decision: 'mapped' | 'intentionally_skipped' | 'manual_review_required' | 'out_of_scope';
  decisionReason: string;
  canonicalPayloadVersion: string;
  optionMapping: any;
  evidenceSource: string;
}

function runDryRun() {
  // Check for --write-report flag
  const writeReportFlag = process.argv.includes('--write-report');

  let fixture: Fixture;
  let mappings: MapEntry[];

  try {
    fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    mappings = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (e) {
    console.error("Failed to read or parse files:", e);
    process.exit(1);
  }

  const offers = fixture.offers;
  const categories = new Set<number>();
  const sourceKeys = new Set<string>();
  const dimensionLikeStrings: string[] = [];

  let mappedCount = 0;
  let skippedCount = 0;
  let manualReviewCount = 0;
  let outOfScopeCount = 0;
  let expectedOavCount = 0;
  let expectedOaovCount = 0;
  let canonicalFailures = 0;
  let unsupportedValues = 0;

  let attributeOccurrenceCount = 0;
  const uniqueMappedKeys = new Set<string>();
  const uniqueSkippedKeys = new Set<string>();
  const uniqueManualReviewKeys = new Set<string>();
  const uniqueOutOfScopeKeys = new Set<string>();

  const executionLog: string[] = [];

  // Index mappings by sourceKey
  const mappingsByKey = new Map<string, MapEntry>();
  for (const m of mappings) {
    mappingsByKey.set(m.sourceKey, m);
  }

  for (const offer of offers) {
    categories.add(offer.sourceCategoryId);
    for (const [key, value] of Object.entries(offer.technicalAttributes)) {
      sourceKeys.add(key);
      attributeOccurrenceCount++;

      // Check dimension-like strings
      if (typeof value === 'string' && /\d+x\d+/i.test(value)) {
        dimensionLikeStrings.push(`Offer ${offer.sourceOfferId} (Category ${offer.sourceCategoryId}): "${key}" = "${value}"`);
      }

      const mapping = mappingsByKey.get(key);
      if (!mapping) {
        unsupportedValues++;
        executionLog.push(`Offer ${offer.sourceOfferId}: [UNMAPPED KEY] "${key}" = "${value}"`);
        continue;
      }

      // Check decision
      if (mapping.decision === 'mapped') {
        uniqueMappedKeys.add(key);
        mappedCount++;
        const targetType = mapping.targetAttributeType;
        let canonicalPayload = '';

        if (targetType === 'text') {
          canonicalPayload = `v2:text:${value}`;
          expectedOavCount++;
        } else if (targetType === 'number') {
          if (typeof value !== 'number') {
            canonicalFailures++;
            executionLog.push(`Offer ${offer.sourceOfferId}: [CANONICAL ERROR] Key "${key}" expects number, got "${value}"`);
            continue;
          }
          canonicalPayload = `v2:number:${value}`;
          expectedOavCount++;
        } else if (targetType === 'boolean') {
          canonicalPayload = `v2:boolean:${value}`;
          expectedOavCount++;
        } else if (targetType === 'date') {
          // Check offset-free timestamp
          const valStr = String(value);
          if (!valStr.toUpperCase().includes('Z') && !/[\+\-]\d{2}/.test(valStr)) {
            canonicalFailures++;
            executionLog.push(`Offer ${offer.sourceOfferId}: [CANONICAL ERROR] Offset-free date rejected: "${value}"`);
            continue;
          }
          const d = new Date(valStr);
          canonicalPayload = `v2:date:${d.toISOString().replace('Z', '000Z')}`;
          expectedOavCount++;
        } else if (targetType === 'year') {
          canonicalPayload = `v2:year:${value}`;
          expectedOavCount++;
        } else if (targetType === 'enum') {
          canonicalPayload = `v2:enum:MAPPED_OPTION`;
          expectedOavCount++;
        } else if (targetType === 'multi_enum') {
          canonicalPayload = `v2:multi_enum:MAPPED_OPTIONS`;
          expectedOaovCount++;
        }

        executionLog.push(`Offer ${offer.sourceOfferId} (Category ${offer.sourceCategoryId}): Mapped "${key}" = "${value}" -> StableKey: "${mapping.targetAttributeStableKey}", Canonical: "${canonicalPayload}"`);
      } else if (mapping.decision === 'intentionally_skipped') {
        uniqueSkippedKeys.add(key);
        skippedCount++;
        executionLog.push(`Offer ${offer.sourceOfferId} (Category ${offer.sourceCategoryId}): Skipped "${key}" = "${value}" (Reason: ${mapping.decisionReason})`);
      } else if (mapping.decision === 'manual_review_required') {
        uniqueManualReviewKeys.add(key);
        manualReviewCount++;
        executionLog.push(`Offer ${offer.sourceOfferId} (Category ${offer.sourceCategoryId}): Manual Review "${key}" = "${value}" (Reason: ${mapping.decisionReason})`);
      } else if (mapping.decision === 'out_of_scope') {
        uniqueOutOfScopeKeys.add(key);
        outOfScopeCount++;
        executionLog.push(`Offer ${offer.sourceOfferId} (Category ${offer.sourceCategoryId}): Out of Scope "${key}" = "${value}" (Reason: ${mapping.decisionReason})`);
      }
    }
  }

  // Build the canonical report body (strictly deterministic)
  const reportBody: string[] = [];
  reportBody.push(`================================================================`);
  reportBody.push(`LOGIMARKET SPRINT 46 DRY-RUN REPORT`);
  reportBody.push(`================================================================`);
  reportBody.push(`## 1. INVENTORY INFO`);
  reportBody.push(`fixture contract version: ${fixture.contractVersion}`);
  reportBody.push(`manifest version: ${mappings[0]?.manifestVersion || 'unknown'}`);
  reportBody.push(`offer count: ${offers.length}`);
  reportBody.push(`category count: ${categories.size}`);
  reportBody.push(`source-key count: ${sourceKeys.size}`);
  reportBody.push(`attribute occurrence count: ${attributeOccurrenceCount}`);
  reportBody.push(``);

  reportBody.push(`## 2. DECISIONS AND STATS`);
  reportBody.push(`mapped count: ${uniqueMappedKeys.size}`);
  reportBody.push(`manual-review count: ${uniqueManualReviewKeys.size}`);
  reportBody.push(`intentionally-skipped count: ${uniqueSkippedKeys.size}`);
  reportBody.push(`out-of-scope count: ${uniqueOutOfScopeKeys.size}`);
  reportBody.push(``);

  reportBody.push(`## 3. EXPECTED WRITE TARGETS`);
  reportBody.push(`- Expected OAV target inserts: ${expectedOavCount}`);
  reportBody.push(`- Expected OAOV target inserts: ${expectedOaovCount}`);
  reportBody.push(``);

  reportBody.push(`## 4. VALIDATION & SANITY CHECKS`);
  reportBody.push(`unsupported-value count: ${unsupportedValues}`);
  reportBody.push(`validation errors: ${canonicalFailures}`);
  reportBody.push(`dimension-like string count: ${dimensionLikeStrings.length}`);
  for (const ds of dimensionLikeStrings.sort()) {
    reportBody.push(`  * ${ds}`);
  }
  reportBody.push(``);

  // Group details deterministically
  reportBody.push(`## 5. MAPPING EXECUTION DETAILS`);
  for (const logLine of executionLog.sort()) {
    reportBody.push(`  ${logLine}`);
  }
  reportBody.push(`================================================================`);

  const finalReport = reportBody.join('\n');

  // Output timestamp to stderr (non-canonical, not part of deterministic output)
  console.error(`Dry-run execution timestamp: ${new Date().toISOString()}`);

  // Print canonical report to stdout
  console.log(finalReport);

  // Write canonical report to file only when explicitly requested
  if (writeReportFlag) {
    fs.writeFileSync(reportPath, finalReport, 'utf8');
  }
}

runDryRun();
