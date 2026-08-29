import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

test('createAdminPartner calls requireAdmin() and adheres to contract', () => {
  const actionPath = path.join(process.cwd(), 'src', 'app', 'actions.ts');
  assert.ok(existsSync(actionPath));
  const content = readFileSync(actionPath, 'utf-8');
  
  const actionMatch = content.match(/export async function createAdminPartner\([\s\S]*?\}[\r\n]+(?=export|$)/);
  if (!actionMatch) {
    // If it's at the very end of file, regex might need to be less strict
    const actionMatchEnd = content.match(/export async function createAdminPartner\([\s\S]*?\}/);
    assert.ok(actionMatchEnd, 'Function createAdminPartner must exist in actions.ts');
    assert.match(actionMatchEnd[0], /await requireAdmin\(\)/, 'must call requireAdmin()');
  } else {
    assert.ok(actionMatch, 'Function createAdminPartner must exist in actions.ts');
    const actionContent = actionMatch[0];
    assert.match(actionContent, /await requireAdmin\(\)/, 'must call requireAdmin()');
  }
});

