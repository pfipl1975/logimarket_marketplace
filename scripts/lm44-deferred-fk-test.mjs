/**
 * lm44-deferred-fk-test.mjs
 *
 * Node.js pg-driver transaction tests for L06 (OAV) and L06b (OAOV).
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
 *   0 — both tests passed
 *   1 — at least one test failed
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

let allPassed = true;

/**
 * Run a single deferred-FK test.
 *
 * @param {string}   testId           - Test identifier (e.g. 'L06')
 * @param {string}   constraintName   - Exact FK constraint name to defer
 * @param {string}   deleteSql        - DELETE statement that will transiently
 *                                     violate the FK after deferral
 * @param {string[]} results          - Mutable array to push result lines into
 */
async function runDeferredFkTest(testId, constraintName, deleteSql, results) {
  const client = await pool.connect();
  let passed = false;
  try {
    await client.query('BEGIN');
    // Defer only the named constraint — never SET CONSTRAINTS ALL DEFERRED.
    await client.query(`SET CONSTRAINTS ${constraintName} DEFERRED`);
    await client.query(deleteSql);
    // COMMIT must trigger the deferred FK check and raise 23503.
    await client.query('COMMIT');
    // If COMMIT succeeds the FK was not enforced — that is a test failure.
    console.error(`  FAIL: ${testId} — expected 23503 at COMMIT but statement succeeded`);
    results.push(`${testId}|FAIL|COMMIT succeeded — FK not enforced`);
    allPassed = false;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    if (err.code === '23503' && err.constraint === constraintName) {
      console.log(`  PASS: ${testId}`);
      results.push(`${testId}|PASS|code=23503 constraint=${constraintName}`);
      passed = true;
    } else {
      const detail = `code=${err.code ?? 'none'} constraint=${err.constraint ?? 'none'} msg=${err.message}`;
      console.error(`  FAIL: ${testId} — ${detail}`);
      results.push(`${testId}|FAIL|${detail}`);
      allPassed = false;
    }
  } finally {
    client.release();
  }
  return passed;
}

async function main() {
  const results = [];

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
      results.push('L06|FAIL|precondition: no OAV row');
      allPassed = false;
    } else {
      oavRowId = oavRes.rows[0].id;
    }

    const oaovRes = await client.query(
      `SELECT id FROM public.offer_attribute_option_values
       WHERE offer_id = 100 AND attribute_id = 3 AND option_id = 201
       LIMIT 1`
    );
    if (oaovRes.rows.length === 0) {
      console.error('FAIL: L06b precondition — no OAOV row for offer=100 attr=3 opt=201');
      results.push('L06b|FAIL|precondition: no OAOV row');
      allPassed = false;
    } else {
      oaovRowId = oaovRes.rows[0].id;
    }
  } finally {
    client.release();
  }

  // L06: OAV FK fires at COMMIT when fk_mot_oav_target_current is deferred
  if (oavRowId != null) {
    await runDeferredFkTest(
      'L06',
      'fk_mot_oav_target_current',
      `DELETE FROM public.offer_attribute_values WHERE id = ${oavRowId}`,
      results
    );
  }

  // L06b: OAOV FK fires at COMMIT when fk_mott_oaov_target_current is deferred
  if (oaovRowId != null) {
    await runDeferredFkTest(
      'L06b',
      'fk_mott_oaov_target_current',
      `DELETE FROM public.offer_attribute_option_values WHERE id = ${oaovRowId}`,
      results
    );
  }

  await pool.end();

  // Emit machine-readable result lines on stdout for the PowerShell harness.
  for (const line of results) {
    process.stdout.write(line + '\n');
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in lm44-deferred-fk-test.mjs:', err);
  process.exit(1);
});
