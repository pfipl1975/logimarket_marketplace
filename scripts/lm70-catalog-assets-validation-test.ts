import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

// AUDITED_MAPPING_BASELINE_SNAPSHOT=YES
// INDEPENDENT_TAXONOMY_COVERAGE_PROOF=NO
const EXPECTED_SECTION_SLUGS = [
  "opakowania-i-materialy-eksploatacyjne",
  "regaly-i-systemy-skladowania",
  "robotyzacja-magazynu",
  "systemy-bezpieczenstwa-i-oznakowanie",
  "wozki-i-transport-wewnetrzny",
  "wyposazenie-magazynu",
] as const;

const EXPECTED_GROUP_SLUGS = [
  "agv-amr-do-palet-i-ciezkich-ladunkow",
  "egzoszkielety-i-wspomaganie-pracy",
  "folie-i-zabezpieczenia-ladunku",
  "goods-to-person-i-automatyzacja-kompletacji",
  "infrastruktura-do-robotyzacji-magazynu",
  "meble-magazynowe-i-warsztatowe",
  "nosniki-ladunku",
  "ochrona-osobista-i-bhp",
  "oprogramowanie-i-integracja-robotow",
  "osprzet-do-wozkow-widlowych",
  "pojemniki-i-kuwety",
  "regaly-paletowe",
  "regaly-polkowe-i-antresole",
  "roboty-kompletacyjne-i-manipulacyjne",
  "roboty-mobilne-agv-amr",
  "wdrozenie-i-utrzymanie-robotyzacji",
  "wozki-magazynowe-wysokiego-skladowania",
  "wozki-paletowe-i-podnosnikowe",
  "wozki-widlowe-czolowe",
] as const;

let UNUSED_ASSET_COUNT = 0;
let MISSING_ASSET_COUNT = 0;
let DUPLICATE_SLUG_KEY_COUNT = 0;
let DUPLICATE_ASSET_PATH_COUNT = 0;
let BROKEN_PATH_COUNT = 0;
let UNAPPROVED_ASSET_COUNT = 0;
let VALIDATION_GROUPS_PASSED = 0;

function pass() { VALIDATION_GROUPS_PASSED++; }

function getInnerExpression(node: ts.Expression): ts.Expression {
  let curr = node;
  while (ts.isAsExpression(curr) || ts.isSatisfiesExpression(curr) || ts.isTypeAssertionExpression(curr) || ts.isParenthesizedExpression(curr)) {
    curr = curr.expression;
  }
  return curr;
}

function parseMappingFile() {
  const filePath = path.join(process.cwd(), 'src/lib/catalog/group-icons.ts');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile('group-icons.ts', sourceCode, ts.ScriptTarget.Latest, true);

  let sectionMapObj: ts.ObjectLiteralExpression | null = null;
  let groupMapObj: ts.ObjectLiteralExpression | null = null;
  let fallbackStr: string | null = null;

  let sectionMapCount = 0;
  let groupMapCount = 0;
  let fallbackCount = 0;

  ts.forEachChild(sourceFile, node => {
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const name = decl.name.text;
          const inner = getInnerExpression(decl.initializer);
          if (name === 'SECTION_ICON_PATHS') {
            sectionMapCount++;
            assert.ok(ts.isObjectLiteralExpression(inner), 'SECTION_ICON_PATHS must be object literal');
            sectionMapObj = inner as ts.ObjectLiteralExpression;
          } else if (name === 'GROUP_ICON_PATHS') {
            groupMapCount++;
            assert.ok(ts.isObjectLiteralExpression(inner), 'GROUP_ICON_PATHS must be object literal');
            groupMapObj = inner as ts.ObjectLiteralExpression;
          } else if (name === 'FALLBACK_GROUP_ICON_PATH') {
            fallbackCount++;
            assert.ok(ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner), 'FALLBACK_GROUP_ICON_PATH must be string literal');
            fallbackStr = (inner as ts.StringLiteral).text;
          }
        }
      });
    }
  });

  assert.equal(sectionMapCount, 1, 'SECTION_ICON_PATHS missing or declared multiple times');
  assert.equal(groupMapCount, 1, 'GROUP_ICON_PATHS missing or declared multiple times');
  assert.equal(fallbackCount, 1, 'FALLBACK_GROUP_ICON_PATH missing or declared multiple times');
  pass();

  return { sectionMapObj: sectionMapObj!, groupMapObj: groupMapObj!, fallbackStr: fallbackStr! };
}

function extractMap(obj: ts.ObjectLiteralExpression) {
  const entries: { key: string, value: string }[] = [];
  const keys = new Set<string>();

  obj.properties.forEach(prop => {
    assert.ok(ts.isPropertyAssignment(prop), 'Only property assignments allowed');
    let key = '';
    if (ts.isIdentifier(prop.name)) key = prop.name.text;
    else if (ts.isStringLiteral(prop.name)) key = prop.name.text;
    else assert.fail('Key must be identifier or string literal');

    if (keys.has(key)) {
      DUPLICATE_SLUG_KEY_COUNT++;
    }
    keys.add(key);

    const initInner = getInnerExpression(prop.initializer);
    assert.ok(
      ts.isStringLiteral(initInner) || ts.isNoSubstitutionTemplateLiteral(initInner),
      'Value must be string literal'
    );
    entries.push({ key, value: (initInner as ts.StringLiteral).text });
  });

  return entries;
}

// -----------------------------------------------------------------------------
// SHARED VALIDATION HELPERS
// -----------------------------------------------------------------------------

function assertAllowedSvgFilename(name: string): void {
  assert.ok(name.endsWith('.svg'), `Filename must end with .svg: ${name}`);
  assert.ok(name.match(/\.svg$/) && name === name.replace(/\.svg\..*$/, '.svg'), `Filename must exactly end with .svg without tricks: ${name}`);
}

function assertLocalCssUrlValue(value: string, context: string): void {
  const trimmed = value.trim();
  const validLocalFragment = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/;
  assert.ok(validLocalFragment.test(trimmed), `CSS url must be a valid local fragment in ${context}: ${value}`);
}

function assertLocalHrefValue(value: string, context: string): void {
  const trimmed = value.trim();
  const validLocalFragment = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/;
  assert.ok(validLocalFragment.test(trimmed), `href must be a valid local fragment in ${context}: ${value}`);
}

function assertNoXlinkHref(content: string, context: string): void {
  assert.ok(!content.toLowerCase().includes('xlink:href'), `xlink:href is forbidden in ${context}`);
}

function assertNoEventHandlers(content: string, context: string): void {
  assert.ok(!content.match(/\bon[a-z0-9:_-]*\s*=/i), `Inline event handler found in ${context}`);
}

function assertAllowedColorValue(
  value: string,
  allowedColors: ReadonlySet<string>,
  context: string
): void {
  assert.ok(allowedColors.has(value.trim().toLowerCase()), `Color not allowed in ${context}: ${value}`);
}

// -----------------------------------------------------------------------------

function expectReject(label: string, callback: () => void): void {
  let thrown = false;
  try {
    callback();
  } catch (e) {
    thrown = true;
  }
  assert.ok(thrown, `Expected rejection but passed: ${label}`);
}

function runSelfTests() {
  expectReject('reject asset.png', () => assertAllowedSvgFilename('asset.png'));
  expectReject('reject asset.svg.exe', () => assertAllowedSvgFilename('asset.svg.exe'));
  expectReject('reject notes.txt', () => assertAllowedSvgFilename('notes.txt'));
  assertAllowedSvgFilename('asset.svg');

  expectReject('reject external CSS URL', () => assertLocalCssUrlValue('https://example.com/a.svg#x', 'test'));
  expectReject('reject external CSS URL 2', () => assertLocalCssUrlValue('//example.com/a.svg#x', 'test'));
  expectReject('reject external CSS URL 3', () => assertLocalCssUrlValue('data:image/svg+xml;base64,...', 'test'));
  expectReject('reject external CSS URL 4', () => assertLocalCssUrlValue('#', 'test'));
  expectReject('reject external CSS URL 5', () => assertLocalCssUrlValue('#bad value', 'test'));
  assertLocalCssUrlValue('#x', 'test');
  assertLocalCssUrlValue('#gradient-1', 'test');

  expectReject('reject href=https://example.com', () => assertLocalHrefValue('https://example.com', 'test'));
  expectReject('reject href = https://example.com', () => assertLocalHrefValue('https://example.com', 'test'));
  assertLocalHrefValue('#x', 'test');

  expectReject('reject every xlink:href', () => assertNoXlinkHref('<use xlink:href="#something" />', 'test'));
  expectReject('reject onload=', () => assertNoEventHandlers('<svg onload="alert(1)">', 'test'));
  expectReject('reject onload =', () => assertNoEventHandlers('<svg onload = "alert(1)">', 'test'));

  const testColors = new Set(['#141c2c', '#147487', '#eab308', 'none']);
  expectReject('reject fill=red', () => assertAllowedColorValue('red', testColors, 'test'));
  expectReject('reject fill=rgb(...)', () => assertAllowedColorValue('rgb(255,0,0)', testColors, 'test'));
  expectReject('reject fill=currentColor', () => assertAllowedColorValue('currentColor', testColors, 'test'));
  assertAllowedColorValue('#141c2c', testColors, 'test');
  assertAllowedColorValue('none', testColors, 'test');
}

function checkColorsInContent(p: string, content: string, isFallback: boolean) {
  const allowed = new Set(['#141c2c', '#147487', '#eab308', 'none']);
  if (isFallback) {
    allowed.delete('#eab308');
  }

  const colorAttrRegex = /(?:fill|stroke|color|stop-color|flood-color|lighting-color)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = colorAttrRegex.exec(content)) !== null) {
    assertAllowedColorValue(match[1], allowed, p);
  }

  const styleAttrRegex = /style\s*=\s*["']([^"']+)["']/gi;
  while ((match = styleAttrRegex.exec(content)) !== null) {
    const styleStr = match[1];
    const styles = styleStr.split(';');
    for (const s of styles) {
      if (!s.trim()) continue;
      const parts = s.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const colorProps = ['fill', 'stroke', 'color', 'stop-color', 'flood-color', 'lighting-color'];
        if (colorProps.includes(key)) {
          assertAllowedColorValue(parts[1], allowed, p);
        }
      }
    }
  }
}

function runValidation() {
  runSelfTests();
  pass();

  const { sectionMapObj, groupMapObj, fallbackStr } = parseMappingFile();
  const sectionEntries = extractMap(sectionMapObj);
  const groupEntries = extractMap(groupMapObj);

  const sectionKeys = sectionEntries.map(e => e.key);
  const groupKeys = groupEntries.map(e => e.key);

  assert.equal(sectionKeys.length, 6, 'SECTION_MAPPING_COUNT must be 6');
  assert.equal(groupKeys.length, 19, 'GROUP_MAPPING_COUNT must be 19');
  pass();

  const expectedSectionsSet = new Set(EXPECTED_SECTION_SLUGS);
  const expectedGroupsSet = new Set(EXPECTED_GROUP_SLUGS);

  const mappedSectionsSet = new Set(sectionKeys);
  const mappedGroupsSet = new Set(groupKeys);

  const expectedSectionMinusMapped = [...expectedSectionsSet].filter(x => !mappedSectionsSet.has(x as any));
  const mappedSectionMinusExpected = [...mappedSectionsSet].filter(x => !expectedSectionsSet.has(x as any));
  const expectedGroupMinusMapped = [...expectedGroupsSet].filter(x => !mappedGroupsSet.has(x as any));
  const mappedGroupMinusExpected = [...mappedGroupsSet].filter(x => !expectedGroupsSet.has(x as any));
  const sectionGroupIntersection = [...mappedSectionsSet].filter(x => mappedGroupsSet.has(x as any));

  if (mappedSectionMinusExpected.length > 0) UNAPPROVED_ASSET_COUNT += mappedSectionMinusExpected.length;
  if (mappedGroupMinusExpected.length > 0) UNAPPROVED_ASSET_COUNT += mappedGroupMinusExpected.length;

  assert.equal(expectedSectionMinusMapped.length, 0, 'EXPECTED_SECTION_MINUS_MAPPED is not empty');
  assert.equal(mappedSectionMinusExpected.length, 0, 'MAPPED_SECTION_MINUS_EXPECTED is not empty');
  assert.equal(expectedGroupMinusMapped.length, 0, 'EXPECTED_GROUP_MINUS_MAPPED is not empty');
  assert.equal(mappedGroupMinusExpected.length, 0, 'MAPPED_GROUP_MINUS_EXPECTED is not empty');
  assert.equal(sectionGroupIntersection.length, 0, 'SECTION_GROUP_INTERSECTION is not empty');
  pass();

  const allPaths = [...sectionEntries, ...groupEntries].map(e => e.value);
  const pathSet = new Set(allPaths);
  if (pathSet.size !== allPaths.length) {
    DUPLICATE_ASSET_PATH_COUNT += (allPaths.length - pathSet.size);
  }

  assert.ok(pathSet.has(fallbackStr) === false, 'Regular slug points to fallback path');
  assert.equal(fallbackStr, '/images/catalog/groups/package-fallback.svg');
  pass();

  allPaths.forEach(p => {
    if (p.includes('..') || p.includes('\\')) BROKEN_PATH_COUNT++;
  });

  sectionEntries.forEach(e => {
    if (!e.value.startsWith('/images/catalog/sections/')) BROKEN_PATH_COUNT++;
  });

  groupEntries.forEach(e => {
    if (!e.value.startsWith('/images/catalog/groups/')) BROKEN_PATH_COUNT++;
  });

  const sectionsDir = path.join(process.cwd(), 'public/images/catalog/sections');
  const groupsDir = path.join(process.cwd(), 'public/images/catalog/groups');

  function getSvgFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.map(entry => {
      assert.ok(entry.isFile() === true, `Entry ${entry.name} is not a regular file`);
      assert.ok(!entry.isSymbolicLink(), `Entry ${entry.name} is a symlink`);
      assertAllowedSvgFilename(entry.name);
      return entry.name;
    });
  }

  let sectionFiles: string[] = [];
  let groupFiles: string[] = [];
  try {
    sectionFiles = getSvgFiles(sectionsDir);
    groupFiles = getSvgFiles(groupsDir);
  } catch (e: any) {
    assert.fail(e.message);
  }

  let fallbackAssetCount = 0;
  if (groupFiles.includes('package-fallback.svg')) {
    fallbackAssetCount = 1;
  }

  const allPhysicalFiles = [
    ...sectionFiles.map(f => `/images/catalog/sections/${f}`),
    ...groupFiles.map(f => `/images/catalog/groups/${f}`)
  ];

  allPaths.forEach(p => {
    if (!allPhysicalFiles.includes(p)) MISSING_ASSET_COUNT++;
  });

  allPhysicalFiles.forEach(p => {
    if (p !== fallbackStr && !pathSet.has(p)) {
      UNUSED_ASSET_COUNT++;
    }
  });

  const sectionMappingCount = sectionKeys.length;
  const groupMappingCount = groupKeys.length;
  const sectionAssetCount = sectionFiles.length;
  const groupAssetCount = groupFiles.length;
  const totalAssetCount = sectionFiles.length + groupFiles.length;

  console.log(`SECTION_MAPPING_COUNT=${sectionMappingCount}`);
  console.log(`GROUP_MAPPING_COUNT=${groupMappingCount}`);
  console.log(`SECTION_ASSET_COUNT=${sectionAssetCount}`);
  console.log(`GROUP_ASSET_COUNT=${groupAssetCount}`);
  console.log(`TOTAL_ASSET_COUNT=${totalAssetCount}`);
  console.log(`FALLBACK_ASSET_COUNT=${fallbackAssetCount}`);
  console.log(`UNUSED_ASSET_COUNT=${UNUSED_ASSET_COUNT}`);
  console.log(`MISSING_ASSET_COUNT=${MISSING_ASSET_COUNT}`);
  console.log(`DUPLICATE_SLUG_KEY_COUNT=${DUPLICATE_SLUG_KEY_COUNT}`);
  console.log(`DUPLICATE_ASSET_PATH_COUNT=${DUPLICATE_ASSET_PATH_COUNT}`);
  console.log(`BROKEN_PATH_COUNT=${BROKEN_PATH_COUNT}`);
  console.log(`UNAPPROVED_ASSET_COUNT=${UNAPPROVED_ASSET_COUNT}`);

  assert.equal(sectionAssetCount, 6, 'SECTION_ASSET_COUNT must be 6');
  assert.equal(groupAssetCount, 20, 'GROUP_ASSET_COUNT must be 20');
  assert.equal(fallbackAssetCount, 1, 'FALLBACK_ASSET_COUNT must be 1');
  pass();

  assert.equal(UNUSED_ASSET_COUNT, 0);
  assert.equal(MISSING_ASSET_COUNT, 0);
  assert.equal(DUPLICATE_SLUG_KEY_COUNT, 0);
  assert.equal(DUPLICATE_ASSET_PATH_COUNT, 0);
  assert.equal(BROKEN_PATH_COUNT, 0);
  assert.equal(UNAPPROVED_ASSET_COUNT, 0);
  pass();

  allPhysicalFiles.forEach(p => {
    const fullPath = path.join(process.cwd(), 'public', p);
    const stat = fs.lstatSync(fullPath);
    assert.ok(stat.size > 0 && stat.size <= 2048, `File ${p} size must be > 0 and <= 2048`);

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lowerContent = content.toLowerCase();

    assert.match(content, /viewBox=["']0 0 48 48["']/, `File ${p} viewBox must be 0 0 48 48`);
    assert.match(content, /width=["']48(?:px)?["']/, `File ${p} width must be 48`);
    assert.match(content, /height=["']48(?:px)?["']/, `File ${p} height must be 48`);

    const forbiddenTags = ['<script', '<foreignobject', '<text', '<image', '<lineargradient', '<radialgradient', '<filter', 'base64'];
    forbiddenTags.forEach(tag => {
      assert.ok(!lowerContent.includes(tag), `File ${p} contains forbidden element: ${tag}`);
    });

    assertNoEventHandlers(content, p);
    assertNoXlinkHref(content, p);

    const urls = content.match(/url\(['"]?(.*?)['"]?\)/gi);
    if (urls) {
      urls.forEach(u => {
        const val = u.match(/url\(['"]?(.*?)['"]?\)/i)?.[1];
        if (val !== undefined) {
          assertLocalCssUrlValue(val, p);
        }
      });
    }

    const hrefs = content.match(/\bhref\s*=\s*["']([^"']*)["']/gi);
    if (hrefs) {
      hrefs.forEach(h => {
        const val = h.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
        if (val !== undefined) {
          assertLocalHrefValue(val, p);
        }
      });
    }

    const isFallback = p === '/images/catalog/groups/package-fallback.svg';
    checkColorsInContent(p, content, isFallback);

    pass();
  });

  console.log(`VALIDATION_GROUPS_PASSED=${VALIDATION_GROUPS_PASSED}`);
  console.log(`RESULT=PASS`);
}

try {
  runValidation();
} catch (e: any) {
  console.error(`RESULT=FAIL`);
  console.error(`EXPECTED_BASELINE_VIOLATION=${e.message}`);
  process.exit(1);
}
