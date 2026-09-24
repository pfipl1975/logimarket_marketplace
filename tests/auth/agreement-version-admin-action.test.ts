import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function checkAuthStaticContract(actionContent: string, actionName: string) {
  const requireAdminIndex = actionContent.indexOf('await requireAdmin()');
  assert.ok(requireAdminIndex !== -1, `${actionName} must call requireAdmin()`);

  const coreInvocationIndex = actionContent.indexOf('Core(');
  assert.ok(coreInvocationIndex !== -1, `${actionName} must invoke core`);

  assert.ok(requireAdminIndex < coreInvocationIndex, `${actionName}: requireAdmin() must be before core invocation`);

  const forbiddenKeys = ['actorUserId', 'status', 'effectiveFrom', 'effectiveTo', 'publishedAt'];
  for (const key of forbiddenKeys) {
    const rawInputAssignmentRegex = new RegExp(`rawInput\\.${key}`);
    const parsedDataAssignmentRegex = new RegExp(`parsed\\.data\\.${key}`);
    assert.ok(!rawInputAssignmentRegex.test(actionContent), `${actionName} must not construct ${key} from rawInput`);
    assert.ok(!parsedDataAssignmentRegex.test(actionContent), `${actionName} must not construct ${key} from parsed.data`);
  }
}

test('createAdminAgreementVersionAction adheres to auth contract', () => {
  const actionPath = path.join(process.cwd(), 'src', 'app', 'actions.ts');
  assert.ok(existsSync(actionPath));
  const content = readFileSync(actionPath, 'utf-8');

  const actionIndex = content.indexOf('export async function createAdminAgreementVersionAction');
  assert.ok(actionIndex !== -1, 'Function createAdminAgreementVersionAction must exist in actions.ts');

  const actionContent = content.slice(actionIndex, actionIndex + 1000);
  checkAuthStaticContract(actionContent, 'createAdminAgreementVersionAction');
});

test('activateAdminAgreementVersionAction adheres to auth contract', () => {
  const actionPath = path.join(process.cwd(), 'src', 'app', 'actions.ts');
  assert.ok(existsSync(actionPath));
  const content = readFileSync(actionPath, 'utf-8');

  const actionIndex = content.indexOf('export async function activateAdminAgreementVersionAction');
  assert.ok(actionIndex !== -1, 'Function activateAdminAgreementVersionAction must exist in actions.ts');

  const actionContent = content.slice(actionIndex, actionIndex + 1000);
  checkAuthStaticContract(actionContent, 'activateAdminAgreementVersionAction');
});
