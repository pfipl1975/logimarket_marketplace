/**
 * lm44-deferred-fk-test.mjs
 *
 * Node.js pg-driver transaction tests for L06 (OAV + OAOV subchecks).
 * Validates that fk_mot_oav_target_current and fk_mott_oaov_target_current
 * fire at COMMIT when deferred via SET CONSTRAINTS <exact-name> DEFERRED.
 *
 * Asserts:
 *   error.code      === '23503'   (foreign_key_violation)
 *   error.constraint === '<exact constraint name>'
 *
 * Usage:
 *   node scripts/lm44-deferred-fk-test.mjs <host> <port> <user> <dbname>
 *
 * Exit codes:
 *   0 — both subchecks passed (canonical L06 = PASS)
 *   1 — at least one subcheck failed (canonical L06 = FAIL)
 */

import pg from 'pg';

const [host, port, user, dbname] = process.argv.slice(2);

if (!host || !port || !user || !dbname) {
  console.error('Usage: node lm44-deferred-fk-test.mjs <host> <port> <user> <dbname>');
  process.exit(1);
}

const pool = new pg.Pool({
  host,
  port: Number(port),
  user,
  database: dbname,
  password: '',
  max: 2,
});

/**
 * Run a single deferred-FK subcheck.
 *
 * @param {string}   constraintName   - Exact FK constraint name to defer
 * @param {string}   deleteSql        - DELETE statement that will transiently
 *                                     violate the FK after deferral
 * @returns {object}  { passed: boolean, detail: string }
 */
async function runDeferredFkSubcheck(constraintName, deleteSql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Defer only the named constraint — never SET CONSTRAINTS ALL DEFERRED.
    await client.query(`SET CONSTRAINTS ${constraintName} DEFERRED`);
    await client.query(deleteSql);
    // COMMIT must trigger the deferred FK check and raise 23503.
    await client.query('COMMIT');
    // If COMMIT succeeds the FK was not enforced — that is a test failure.
    return { passed: false, detail: `COMMIT succeeded — FK ${constraintName} not enforced` };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    if (err.code === '23503' && err.constraint === constraintName) {
      return { passed: true, detail: `code=23503 constraint=${constraintName}` };
    } else {
      return { passed: false, detail: `code=${err.code ?? 'none'} constraint=${err.constraint ?? 'none'} msg=${err.message}` };
    }
  } finally {
    client.release();
  }
}

async function main() {
  const subchecks = [];

  // Resolve the OAV row and OAOV row that have active manifest targets.
  // These are inserted by the PowerShell harness before this script runs.
  const client = await pool.connect();
  let oavRowId, oaovRowId;
  try {
    const oavRes = await client.query(
      `SELECT id FROM public.offer_attribute_values
       WHERE offer_id = 100 AND attribute_id = 2
       LIMIT 1`
    );
    if (oavRes.rows.length === 0) {
      console.error('FAIL: L06 precondition — no OAV row for offer=100 attr=2');
      subchecks.push({ passed: false, detail: 'precondition: no OAV row' });
    } else {
      oavRowId = oavRes.rows[0].id;
    }

    const oaovRes = await client.query(
      `SELECT id FROM public.offer_attribute_option_values
       WHERE offer_id = 100 AND attribute_id = 3 AND option_id = 201
       LIMIT 1`
    );
    if (oaovRes.rows.length === 0) {
      console.error('FAIL: L06 precondition — no OAOV row for offer=100 attr=3 opt=201');
      subchecks.push({ passed: false, detail: 'precondition: no OAOV row' });
    } else {
      oaovRowId = oaovRes.rows[0].id;
    }
  } finally {
    client.release();
  }

  // L06/OAV: OAV FK fires at COMMIT when fk_mot_oav_target_current is deferred
  if (oavRowId != null) {
    const result = await runDeferredFkSubcheck(
      'fk_mot_oav_target_current',
      `DELETE FROM public.offer_attribute_values WHERE id = ${oavRowId}`
    );
    subchecks.push(result);
    console.log(result.passed ? '  PASS: L06/OAV' : `  FAIL: L06/OAV — ${result.detail}`);
  }

  // L06/OAOV: OAOV FK fires at COMMIT when fk_mott_oaov_target_current is deferred
  if (oaovRowId != null) {
    const result = await runDeferredFkSubcheck(
      'fk_mott_oaov_target_current',
      `DELETE FROM public.offer_attribute_option_values WHERE id = ${oaovRowId}`
    );
    subchecks.push(result);
    console.log(result.passed ? '  PASS: L06/OAOV' : `  FAIL: L06/OAOV — ${result.detail}`);
  }

  await pool.end();

  // Aggregate subchecks into one canonical L06 result.
  const allPassed = subchecks.every(s => s.passed);
  const details = subchecks.map(s => s.detail).join('; ');

  if (allPassed) {
    console.log('  PASS: L06');
  } else {
    console.error('  FAIL: L06');
  }

  // Emit exactly one machine-readable result line for the PowerShell harness.
  process.stdout.write(`L06|${allPassed ? 'PASS' : 'FAIL'}|${details}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in lm44-deferred-fk-test.mjs:', err);
  process.exit(1);
});
