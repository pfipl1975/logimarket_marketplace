import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

test('verifyAdminSellerIdentityAction calls requireAdmin() and adheres to contract', () => {
  const actionPath = path.join(process.cwd(), 'src', 'app', 'actions.ts');
  assert.ok(existsSync(actionPath));
  const content = readFileSync(actionPath, 'utf-8');
  
  const actionIndex = content.indexOf('export async function verifyAdminSellerIdentityAction');
  assert.ok(actionIndex !== -1, 'Function verifyAdminSellerIdentityAction must exist in actions.ts');
  
  // Extract a chunk of code following the function declaration
  const actionContent = content.slice(actionIndex, actionIndex + 1000);
  
  assert.match(actionContent, /await requireAdmin\(\)/, 'must call requireAdmin()');
  assert.match(actionContent, /adminUser\.id/, 'must use server-derived actor ID');
});
