import { expect, type Browser } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../../scripts/e2e/buyer-trust-fixtures";
import { CHECKOUT_READY_BUYER_ID } from "../../../scripts/e2e/buyer-checkout-fixtures";
import { verifySqlIdentityBeforeDestructiveDdl } from "../../database/helpers/destructive-db-safety";
import { createDummySupabaseCookie } from "../fixtures/auth";
import pl from "../../../src/messages/pl.json";

/**
 * A real two-process checkout/add-to-cart race. Checkout has already locked and
 * snapshotted A when independent server B commits a new cart row. A must be
 * ordered exactly once; B must survive, neither lost nor silently purchased.
 */
export async function proveConcurrentCartConservation(
  database: Pool,
  seller: { offerId: string; partnerId: string },
  browser: Browser,
) {
  expect(process.env.GITHUB_ACTIONS, "R04 requires isolated GitHub CI").toBe("true");
  expect(process.env.CI).toBeTruthy();
  requireIsolatedE2EDatabaseUrl();
  await verifySqlIdentityBeforeDestructiveDdl(database);

  // Read only action metadata. The manifest includes secret key material: never log it.
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as {
    node: Record<string, { exportedName?: string }>;
    edge: Record<string, { exportedName?: string }>;
  };
  const entries = Object.entries({ ...manifest.node, ...manifest.edge });
  const actionId = (name: string) => {
    const ids = entries.filter(([, entry]) => entry.exportedName === name).map(([id]) => id);
    expect(ids.length, "Expected exactly one built Action: " + name).toBe(1);
    return ids[0];
  };
  const checkoutAction = actionId("submitMarketplaceCheckout");
  const addAction = actionId("addToCart");

  async function createOffer(label: string) {
    const rows = await database.query<{ id: string }>(
      "INSERT INTO offers(partner_id,category_id,title,offer_model,conversion_type,price_brutto,price_on_request,is_active,publication_status) SELECT $1,category_id,$2,'marketplace','inbound',100.00,false,true,'published' FROM offers WHERE id=$3 RETURNING id",
      [seller.partnerId, "r04-" + randomUUID() + "-" + label, seller.offerId],
    );
    expect(rows.rows).toHaveLength(1);
    return rows.rows[0].id;
  }

  const offersCreated: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 844 } });
  const barrier = await database.connect();
  let barrierHeld = false;
  let stopReplica: (() => Promise<void>) | null = null;
  let sessionHash: string | null = null;
  let checkoutResponse: Promise<import("@playwright/test").Response | null> | null = null;
  try {
    const firstOffer = await createOffer("A");
    offersCreated.push(firstOffer);
    const laterOffer = await createOffer("B");
    offersCreated.push(laterOffer);

    await context.addCookies([{
      name: "sb-localhost-auth-token",
      value: createDummySupabaseCookie(CHECKOUT_READY_BUYER_ID),
      domain: "localhost",
      path: "/",
    }]);
    const page = await context.newPage();
    const browserErrors: string[] = [];
    page.on("pageerror", () => browserErrors.push("pageerror"));
    page.on("console", entry => { if (entry.type() === "error") browserErrors.push("console_error"); });
    page.on("response", response => { if (response.status() >= 500) browserErrors.push("HTTP_500"); });
    expect((await page.goto("/oferta/" + firstOffer))?.status()).toBe(200);
    await page.getByRole("button", { name: /dodaj do koszyka/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/zamowienie");
    const form = page.locator("form").filter({ has: page.locator('input[name="confirmation"]') });
    await expect(form.locator('input[name="confirmation"]')).toHaveCount(1);
    const submit = form.getByRole("button", { name: pl.checkoutFlow.submit, exact: true });
    await expect(submit).toBeEnabled();

    sessionHash = (await context.cookies("http://localhost:3000"))
      .find(cookie => cookie.name === "session_hash")?.value ?? null;
    expect(sessionHash, "R04 requires the exact buyer cart session").toBeTruthy();
    const initial = await database.query<{ offer_id: string; quantity: number }>(
      "SELECT offer_id,quantity FROM cart_items WHERE session_hash=$1 ORDER BY id",
      [sessionHash],
    );
    expect(initial.rows).toEqual([{ offer_id: firstOffer, quantity: 1 }]);

    // Separate Node/Next server: no shared in-process mutex or connection pool.
    const child = spawn(process.execPath, [
      "node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3002",
    ], { env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
    stopReplica = async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
        child.kill("SIGTERM");
      });
    };
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("R04_REPLICA_START_TIMEOUT")), 15_000);
        let output = "";
        child.once("error", () => { clearTimeout(timer); reject(new Error("R04_REPLICA_START_FAILED")); });
        child.once("exit", () => { clearTimeout(timer); reject(new Error("R04_REPLICA_EARLY_EXIT")); });
        child.stderr.on("data", () => {}); // Drain without logging provider output.
        child.stdout.on("data", chunk => {
          output = (output + chunk.toString()).slice(-2048).replace(/\x1b\[[0-9;]*m/g, "");
          if (output.includes("Ready in")) { clearTimeout(timer); resolve(); }
        });
      });
    } catch (error) {
      await stopReplica();
      throw error;
    }

    await barrier.query("BEGIN");
    barrierHeld = true;
    await barrier.query("SET LOCAL idle_in_transaction_session_timeout='60s'");
    // SHARE conflicts with the checkout INSERT (ROW EXCLUSIVE) but not a
    // concurrent insert into cart_items from the independent application.
    await barrier.query("LOCK TABLE marketplace_orders IN SHARE MODE");
    const blockerPid = (await barrier.query<{ pid: number }>(
      "SELECT pg_backend_pid() AS pid",
    )).rows[0].pid;

    checkoutResponse = page.waitForResponse(response => {
      const request = response.request();
      const url = new URL(request.url());
      return request.method() === "POST" &&
        url.origin === "http://localhost:3000" &&
        url.pathname === "/zamowienie" &&
        request.headers()["next-action"] === checkoutAction;
    }, { timeout: 45_000 }).then(response => response, () => null);

    await submit.click({ noWaitAfter: true });

    // Positive SQL synchronization: checkout has read/locked the original cart
    // and reached INSERT into marketplace_orders before B is committed.
    await expect.poll(async () => {
      const waiting = await database.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_stat_activity a WHERE a.datname=current_database() AND a.wait_event_type='Lock' AND $1=ANY(pg_blocking_pids(a.pid)) AND a.query ~* 'insert into.*marketplace_orders'",
        [blockerPid],
      );
      return waiting.rows[0].count;
    }, { timeout: 12_000, intervals: [25, 50, 100], message: "R04_CHECKOUT_SQL_BARRIER_NOT_REACHED" }).toBe(1);

    // Real authenticated Server Action through an independent Next instance.
    const addition = await context.request.post("http://localhost:3002/", {
      headers: {
        "next-action": addAction,
        "content-type": "text/plain;charset=UTF-8",
        origin: "http://localhost:3002",
      },
      data: JSON.stringify([Number(laterOffer), 1]),
      timeout: 20_000,
    });
    expect(addition.status()).toBe(200);
    const committedB = await database.query<{ quantity: number }>(
      "SELECT quantity FROM cart_items WHERE session_hash=$1 AND offer_id=$2",
      [sessionHash, laterOffer],
    );
    expect(committedB.rows).toEqual([{ quantity: 1 }]);

    await barrier.query("COMMIT");
    barrierHeld = false;
    const response = await checkoutResponse;
    expect(response, "Checkout must respond after the barrier is released").not.toBeNull();
    expect([200, 303]).toContain(response!.status());
    await expect(page).toHaveURL(/\/zamowienia(?:\?|$)/);
    await expect(page.getByText(pl.checkoutFlow.successNotice, { exact: true })).toBeVisible();

    const orders = await database.query<{ id: string }>(
      "SELECT id FROM marketplace_orders WHERE session_hash=$1",
      [sessionHash],
    );
    expect(orders.rows).toHaveLength(1);
    const lines = await database.query<{ offer_id: string; quantity: number; unit_price: string }>(
      "SELECT si.offer_id,si.quantity,si.unit_price FROM seller_order_items si JOIN seller_orders so ON so.id=si.seller_order_id WHERE so.marketplace_order_id=$1 ORDER BY si.offer_id",
      [orders.rows[0].id],
    );
    expect(lines.rows).toEqual([{ offer_id: firstOffer, quantity: 1, unit_price: "100.00" }]);
    const remaining = await database.query<{ offer_id: string; quantity: number }>(
      "SELECT offer_id,quantity FROM cart_items WHERE session_hash=$1 ORDER BY id",
      [sessionHash],
    );
    expect(remaining.rows).toEqual([{ offer_id: laterOffer, quantity: 1 }]);
    expect(browserErrors).toEqual([]);

    console.log("R04_CART_CONSERVATION PASS SNAPSHOT=A ORDER=A:1 REMAINING_CART=B:1 PROCESSES=2 SQL_BARRIER=OBSERVED LOST=0 DUPLICATED=0");
  } finally {
    if (barrierHeld) await barrier.query("ROLLBACK");
    // Never leave a pending response unobserved during cleanup.
    if (checkoutResponse) await checkoutResponse;
    barrier.release();
    if (stopReplica) await stopReplica();
    await context.close();
    if (sessionHash) await database.query(
      "DELETE FROM cart_items WHERE session_hash=$1 AND offer_id=ANY($2::bigint[])",
      [sessionHash, offersCreated],
    );
    if (offersCreated.length) await database.query(
      "UPDATE offers SET is_active=false,publication_status='draft' WHERE id=ANY($1::bigint[])",
      [offersCreated],
    );
  }
}
