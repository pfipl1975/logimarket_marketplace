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
let ASSERTIONS_PASSED = 0;

function pass() { ASSERTIONS_PASSED++; }

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
            sectionMapObj = inner;
          } else if (name === 'GROUP_ICON_PATHS') {
            groupMapCount++;
            assert.ok(ts.isObjectLiteralExpression(inner), 'GROUP_ICON_PATHS must be object literal');
            groupMapObj = inner;
          } else if (name === 'FALLBACK_GROUP_ICON_PATH') {
            fallbackCount++;
            assert.ok(ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner), 'FALLBACK_GROUP_ICON_PATH must be string literal');
            fallbackStr = inner.text;
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
    entries.push({ key, value: initInner.text });
  });

  return entries;
}

function runValidation() {
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

  const expectedSectionMinusMapped = [...expectedSectionsSet].filter(x => !mappedSectionsSet.has(x));
  const mappedSectionMinusExpected = [...mappedSectionsSet].filter(x => !expectedSectionsSet.has(x as any));
  const expectedGroupMinusMapped = [...expectedGroupsSet].filter(x => !mappedGroupsSet.has(x));
  const mappedGroupMinusExpected = [...mappedGroupsSet].filter(x => !expectedGroupsSet.has(x as any));
  const sectionGroupIntersection = [...mappedSectionsSet].filter(x => mappedGroupsSet.has(x));

  assert.equal(expectedSectionMinusMapped.length, 0, 'EXPECTED_SECTION_MINUS_MAPPED is not empty');
  assert.equal(mappedSectionMinusExpected.length, 0, 'MAPPED_SECTION_MINUS_EXPECTED is not empty');
  if (mappedSectionMinusExpected.length > 0) UNAPPROVED_ASSET_COUNT += mappedSectionMinusExpected.length;

  assert.equal(expectedGroupMinusMapped.length, 0, 'EXPECTED_GROUP_MINUS_MAPPED is not empty');
  assert.equal(mappedGroupMinusExpected.length, 0, 'MAPPED_GROUP_MINUS_EXPECTED is not empty');
  if (mappedGroupMinusExpected.length > 0) UNAPPROVED_ASSET_COUNT += mappedGroupMinusExpected.length;
  
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
  
  const sectionFiles = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.svg'));
  const groupFiles = fs.readdirSync(groupsDir).filter(f => f.endsWith('.svg'));

  let fallbackAssetCount = 0;
  if (groupFiles.includes('package-fallback.svg')) {
    fallbackAssetCount = 1;
  }

  assert.equal(sectionFiles.length, 6, 'SECTION_ASSET_COUNT must be 6');
  assert.equal(groupFiles.length, 20, 'GROUP_ASSET_COUNT must be 20');
  assert.equal(fallbackAssetCount, 1, 'FALLBACK_ASSET_COUNT must be 1');
  pass();

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

  allPhysicalFiles.forEach(p => {
    const fullPath = path.join(process.cwd(), 'public', p);
    const stat = fs.lstatSync(fullPath);
    assert.ok(!stat.isSymbolicLink(), `File ${p} is a symlink`);
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

    assert.ok(!lowerContent.match(/\son[a-z]+=/), `File ${p} contains inline event handler`);

    // Check external href, url()
    const urls = content.match(/url\(['"]?(.*?)['"]?\)/g);
    if (urls) {
      urls.forEach(u => {
        assert.ok(u.includes('#'), `File ${p} contains external CSS url: ${u}`);
      });
    }

    const hrefs = content.match(/href=["'](.*?)["']/gi);
    if (hrefs) {
      hrefs.forEach(h => {
        const val = h.toLowerCase();
        if (!val.includes('w3.org/2000/svg')) {
          assert.ok(val.includes('="#'), `File ${p} contains external href: ${h}`);
        }
      });
    }

    // Check colors
    const colors = Array.from(content.matchAll(/#([0-9a-fA-F]{3,6})/g)).map(m => m[0].toLowerCase());
    const allowedColors = ['#141c2c', '#147487', '#eab308'];
    colors.forEach(c => {
      assert.ok(allowedColors.includes(c), `File ${p} contains invalid color: ${c}`);
      if (p === '/images/catalog/groups/package-fallback.svg') {
        assert.ok(c !== '#eab308', `package-fallback.svg contains forbidden amber #eab308`);
      }
    });

    pass();
  });

  console.log(`SECTION_MAPPING_COUNT=${sectionKeys.length}`);
  console.log(`GROUP_MAPPING_COUNT=${groupKeys.length}`);
  console.log(`SECTION_ASSET_COUNT=${sectionFiles.length}`);
  console.log(`GROUP_ASSET_COUNT=${groupFiles.length}`);
  console.log(`TOTAL_ASSET_COUNT=${sectionFiles.length + groupFiles.length}`);
  console.log(`FALLBACK_ASSET_COUNT=${fallbackAssetCount}`);
  console.log(`UNUSED_ASSET_COUNT=${UNUSED_ASSET_COUNT}`);
  console.log(`MISSING_ASSET_COUNT=${MISSING_ASSET_COUNT}`);
  console.log(`DUPLICATE_SLUG_KEY_COUNT=${DUPLICATE_SLUG_KEY_COUNT}`);
  console.log(`DUPLICATE_ASSET_PATH_COUNT=${DUPLICATE_ASSET_PATH_COUNT}`);
  console.log(`BROKEN_PATH_COUNT=${BROKEN_PATH_COUNT}`);
  console.log(`UNAPPROVED_ASSET_COUNT=${UNAPPROVED_ASSET_COUNT}`);
  
  assert.equal(UNUSED_ASSET_COUNT, 0);
  assert.equal(MISSING_ASSET_COUNT, 0);
  assert.equal(DUPLICATE_SLUG_KEY_COUNT, 0);
  assert.equal(DUPLICATE_ASSET_PATH_COUNT, 0);
  assert.equal(BROKEN_PATH_COUNT, 0);
  assert.equal(UNAPPROVED_ASSET_COUNT, 0);

  console.log(`ASSERTIONS_PASSED=${ASSERTIONS_PASSED}`);
  console.log(`RESULT=PASS`);
}

try {
  runValidation();
} catch (e: any) {
  console.error(`RESULT=FAIL`);
  console.error(`EXPECTED_BASELINE_VIOLATION=${e.message}`);
  process.exit(1);
}
