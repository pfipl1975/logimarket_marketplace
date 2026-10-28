import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../../scripts/e2e/buyer-trust-fixtures";
import { CHECKOUT_READY_BUYER_ID } from "../../../scripts/e2e/buyer-checkout-fixtures";
import { verifySqlIdentityBeforeDestructiveDdl } from "../../database/helpers/destructive-db-safety";
import { createDummySupabaseCookie } from "../fixtures/auth";
import pl from "../../../src/messages/pl.json";

type ActionEntry = { exportedName?: string; filename?: string; workers: Record<string, unknown> };
type Manifest = { node: Record<string, ActionEntry>; edge: Record<string, ActionEntry> };
type Evidence = { risk: string; result: "PASS" | "FAIL" | "BLOCKED"; [key: string]: unknown };
type Inputs = { database: Pool; seller: { partnerId: string; offerId: string }; browser: Browser; nonAdminPage: Page };

const AUDITED_TREES = {
  src: "da48184f3aa47f995e5264fa626e92c453702fbe",
  ".github": "cac787a0895ee025568df20b973f3a5eba8436f9",
  "package.json": "bc3c4fce3e46c5ed7d4521ca3ce68f83a1ff8a96",
  "package-lock.json": "8c93ea500d587d5572e065add13dba40a90550e3",
  "next.config.ts": "d3296a6a2867e9de3ef31a9e8c7b9d742790c228",
} as const;

/** Run only in the existing GitHub-hosted disposable E2E job, never against a developer .env. */
function requireReproductionEnvironment() {
  expect(process.env.CI, "BLOCKED_NOT_CI").toBeTruthy();
  expect(process.env.GITHUB_ACTIONS, "BLOCKED_NOT_GITHUB_ACTIONS").toBe("true");
  requireIsolatedE2EDatabaseUrl();
  expect(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin).toBe("http://localhost:54321");
  expect(process.env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  for (const [path, expected] of Object.entries(AUDITED_TREES)) {
    const actual = execFileSync("git", ["rev-parse", "HEAD:" + path], { encoding: "utf8" }).trim();
    expect(actual, "BLOCKED_APPLICATION_BASELINE_MISMATCH: " + path).toBe(expected);
  }
}

function readActions(): Map<string, string> {
  // Do not log this document: it also contains the build encryption key.
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as Manifest;
  const actions = new Map<string, string>();
  const entries = Object.entries({ ...manifest.node, ...manifest.edge });
  expect(entries.length).toBeGreaterThan(0);
  const required = new Set(["getCartItems", "addToCart", "submitMarketplaceCheckout", "hydrateOffersWithAttributes"]);
  for (const [id, entry] of entries) {
    expect(typeof entry.exportedName, "BLOCKED_ACTION_NAME_METADATA_UNAVAILABLE").toBe("string");
    if (entry.exportedName && required.has(entry.exportedName)) {
      const existing = actions.get(entry.exportedName);
      expect(!existing || existing === id, "BLOCKED_AMBIGUOUS_ACTION_NAME").toBe(true);
      actions.set(entry.exportedName, id);
    }
  }
  expect(actions.has("getCartItems"), "BLOCKED_ACTION_POSITIVE_CONTROL_MISSING").toBe(true);
  expect(actions.has("addToCart")).toBe(true);
  expect(actions.has("submitMarketplaceCheckout")).toBe(true);
  return actions;
}

async function invoke(request: APIRequestContext, actions: Map<string, string>, name: string, args: unknown[]) {
  const id = actions.get(name);
  expect(id, "BLOCKED_UNREGISTERED_REQUIRED_ACTION: " + name).toBeTruthy();
  return request.post("http://localhost:3000/", {
    headers: { "next-action": id!, "content-type": "text/plain;charset=UTF-8", origin: "http://localhost:3000" },
    data: JSON.stringify(args),
    timeout: 20_000,
  });
}

async function record(evidence: Evidence) {
  // Only synthetic outcome metadata, never cookies, action IDs, raw HTTP/RSC or provider payloads.
  console.log("LM_QA_56I_REPRO " + JSON.stringify(evidence));
  await test.info().attach(evidence.risk + "-evidence", {
    body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: "application/json",
  });
}

async function buyerContext(browser: Browser) {
  const context = await browser.newContext();
  await context.addCookies([{
    name: "sb-localhost-auth-token", value: createDummySupabaseCookie(CHECKOUT_READY_BUYER_ID),
    domain: "localhost", path: "/",
  }]);
  return context;
}

async function session(context: BrowserContext) {
  const cookie = (await context.cookies("http://localhost:3000")).find(value => value.name === "session_hash");
  expect(cookie?.value, "BLOCKED_MISSING_SYNTHETIC_CART_SESSION").toBeTruthy();
  return cookie!.value; // Used for scoped fixture queries only; never attached or logged.
}

async function addUsingUI(page: Page, offerId: string, title: string) {
  expect((await page.goto("/oferta/" + offerId))?.status()).toBe(200);
  await page.getByRole("button", { name: /dodaj do koszyka/i }).click();
  await expect(page.getByRole("dialog")).toContainText(title);
}

export async function reproduceMarketplaceRisks({ database, seller, browser, nonAdminPage }: Inputs) {
  requireReproductionEnvironment();
  await verifySqlIdentityBeforeDestructiveDdl(database);
  const actions = readActions();
  const created: string[] = [];
  const sessions: string[] = [];
  const outcomes = new Set<string>();
  const prefix = "qa56i-" + randomUUID();
  const category = await database.query<{ id: string }>(
    "INSERT INTO categories (name, slug) VALUES ($1, $1) RETURNING id", [prefix],
  );
  const categoryId = category.rows[0].id;

  async function offer(label: string, partnerId = seller.partnerId, status = "published") {
    const title = prefix + "-" + label;
    const row = await database.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_brutto, price_on_request, is_active, publication_status) VALUES ($1,$2,$3,'marketplace','inbound',100.00,false,true,$4) RETURNING id",
      [partnerId, categoryId, title, status],
    );
    const id = row.rows[0].id;
    created.push(id);
    return { id, title };
  }

  async function scenario(risk: string, run: () => Promise<void>) {
    try { await test.step(risk, run); }
    catch {
      if (!outcomes.has(risk)) {
        await record({ risk, result: "BLOCKED", reason: "REPRODUCTION_PRECONDITION_OR_PROTOCOL_FAILURE" });
        outcomes.add(risk);
      }
      // Keep every scenario scheduled; an infrastructure error cannot turn into PASS.
      expect.soft(false, risk + " BLOCKED: inspect the failing step; no vulnerability verdict").toBe(true);
    }
  }

  try {
    await scenario("R01", async () => {
      const attribute = await database.query<{ id: string }>(
        "INSERT INTO attribute_definitions (stable_key,data_type,is_active) VALUES ($1,'text',true) RETURNING id", [prefix],
      );
      const attributeId = attribute.rows[0].id;
      await database.query(
        "INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,is_visible) VALUES ($1,$2,true)",
        [categoryId, attributeId],
      );
      const foreign = await database.query<{ id: string }>(
        "INSERT INTO partners (company_name,contact_email) VALUES ($1,'qa56i@example.invalid') RETURNING id", [prefix],
      );
      const control = await offer("public-control");
      const ownDraft = await offer("own-partner-draft", seller.partnerId, "draft");
      const foreignDraft = await offer("foreign-partner-draft", foreign.rows[0].id, "draft");
      const sentinels = ["PUBLIC_" + prefix, "OWN_PRIVATE_" + prefix, "FOREIGN_PRIVATE_" + prefix];
      for (const [index, target] of [control, ownDraft, foreignDraft].entries()) {
        await database.query(
          "INSERT INTO offer_attribute_values (offer_id,attribute_id,value_text) VALUES ($1,$2,$3)",
          [target.id, attributeId, sentinels[index]],
        );
      }
      const anon = await browser.newContext();
      try {
        const positive = await invoke(anon.request, actions, "getCartItems", []);
        expect(positive.status(), "BLOCKED_SERVER_ACTION_PROTOCOL_POSITIVE_CONTROL").toBe(200);
        expect(await positive.text()).toContain("[]");
        for (const target of [ownDraft, foreignDraft]) {
          expect((await anon.request.get("http://localhost:3000/oferta/" + target.id)).status()).toBe(404);
        }
        const membership = await database.query<{ allowed: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM partner_user_memberships WHERE partner_id=$1 AND auth_user_id=$2 AND membership_status='active') AS allowed",
          [seller.partnerId, "11111111-1111-1111-1111-111111111111"],
        );
        expect(membership.rows[0].allowed).toBe(true);
        const foreignMembership = await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM partner_user_memberships WHERE partner_id=$1", [foreign.rows[0].id],
        );
        expect(foreignMembership.rows[0].count).toBe(0);
        const registered = actions.has("hydrateOffersWithAttributes");
        let leaked = false;
        let calls = 0;
        if (registered) {
          const args = (id: string) => [[{ id: Number(id), categoryId: Number(categoryId) }], "pl"];
          const controlResponse = await invoke(anon.request, actions, "hydrateOffersWithAttributes", args(control.id));
          expect(controlResponse.status()).toBe(200);
          expect((await controlResponse.text()).includes(sentinels[0]), "BLOCKED_HYDRATOR_POSITIVE_CONTROL").toBe(true);
          for (const request of [anon.request, nonAdminPage.request]) {
            for (const [target, sentinel] of [[ownDraft, sentinels[1]], [foreignDraft, sentinels[2]]] as const) {
              const response = await invoke(request, actions, "hydrateOffersWithAttributes", args(target.id));
              expect(response.status()).toBeLessThan(500);
              leaked ||= (await response.text()).includes(sentinel);
              calls++;
            }
          }
        }
        const result = leaked ? "FAIL" : "PASS";
        await record({ risk: "R01", result, registeredInBuiltManifest: registered, actionCalls: calls,
          publicActionProtocolControl: true, draftRoutesDenied: true, privateAttributeDisclosed: leaked,
          boundary: registered ? "BUILT_ACTION_HTTP" : "NOT_REGISTERED_IN_THIS_EXACT_BUILD" });
        outcomes.add("R01");
        expect.soft(leaked, "R01 private attribute sentinel in unauthorized Server Action response").toBe(false);
      } finally { await anon.close(); }
    });

    await scenario("R02", async () => {
      const variants = [
        { label: "unpublished", sql: "publication_status='draft',is_active=false", privateTitle: true },
        { label: "hidden-rfq", sql: "offer_model='rfq',conversion_type='inbound',price_on_request=true,rfq_net_price_visible=false,price_netto=765432.19", privateTitle: false },
        { label: "price-on-request", sql: "price_on_request=true", privateTitle: false },
      ];
      const evidence: object[] = [];
      for (const variant of variants) {
        const target = await offer("stale-" + variant.label);
        const context = await buyerContext(browser);
        try {
          const page = await context.newPage();
          await addUsingUI(page, target.id, target.title);
          const hash = await session(context); sessions.push(hash);
          const baseline = await invoke(context.request, actions, "getCartItems", []);
          expect(baseline.status()).toBe(200);
          expect((await baseline.text()).includes(target.title), "BLOCKED_CART_POSITIVE_CONTROL").toBe(true);
          const privateTitle = "HIDDEN_TITLE_" + prefix;
          // Literal allowlisted state mutations on this test's single offer only.
          await database.query(
            "UPDATE offers SET " + variant.sql + ",price_brutto=987654.37,title=$2 WHERE id=$1",
            [target.id, variant.privateTitle ? privateTitle : target.title],
          );
          const action = await invoke(context.request, actions, "getCartItems", []);
          expect(action.status()).toBe(200);
          const actionBody = await action.text();
          const html = await context.request.get("http://localhost:3000/oferta/" + target.id);
          expect(html.status()).toBe(variant.privateTitle ? 404 : 200);
          const htmlBody = await html.text();
          const flight = await context.request.get("http://localhost:3000/oferta/" + target.id + "?qa56i=rsc", {
            headers: { RSC: "1" },
          });
          expect(flight.status()).toBe(variant.privateTitle ? 404 : 200);
          expect(flight.headers()["content-type"], "BLOCKED_RSC_PROTOCOL").toContain("text/x-component");
          const flightBody = await flight.text();
          const actionLeak = actionBody.includes("987654.37") || (variant.privateTitle && actionBody.includes(privateTitle));
          const htmlLeak = htmlBody.includes("987654.37");
          const rscLeak = flightBody.includes("987654.37");
          const netLeak = variant.label === "hidden-rfq" && [actionBody, htmlBody, flightBody].some(body => body.includes("765432.19"));
          evidence.push({ variant: variant.label, actionLeak, htmlLeak, rscLeak, netLeak });
          expect.soft(actionLeak, "R02 " + variant.label + " private data in cart Action").toBe(false);
          expect.soft(htmlLeak || rscLeak || netLeak, "R02 " + variant.label + " private price in HTML/RSC").toBe(false);
        } finally { await context.close(); }
      }
      const failed = evidence.some(row => Object.entries(row).some(([key, value]) => key.endsWith("Leak") && value === true));
      await record({ risk: "R02", result: failed ? "FAIL" : "PASS", variants: evidence });
      outcomes.add("R02");
    });

    await scenario("R03", async () => {
      const target = await offer("repricing");
      const context = await buyerContext(browser);
      try {
        const page = await context.newPage();
        await addUsingUI(page, target.id, target.title);
        const hash = await session(context); sessions.push(hash);
        await page.goto("/zamowienie");
        const form = page.locator("form").filter({ has: page.locator("#checkout-message") });
        const submit = form.getByRole("button", { name: pl.checkoutFlow.submit, exact: true });
        await expect(submit).toBeEnabled();
        await expect(page.getByText(/100,00/).first()).toBeVisible();
        const before = await form.innerHTML();
        await database.query("UPDATE offers SET price_brutto=135.79 WHERE id=$1", [target.id]);
        expect((await database.query<{ price: string }>("SELECT price_brutto::text AS price FROM offers WHERE id=$1", [target.id])).rows[0].price).toBe("135.79");
        expect(await form.innerHTML(), "BLOCKED_FORM_CHANGED_BEFORE_SUBMIT").toBe(before);
        const responsePromise = page.waitForResponse(response =>
          response.request().method() === "POST" &&
          response.request().headers()["next-action"] === actions.get("submitMarketplaceCheckout"));
        await submit.click({ noWaitAfter: true });
        const response = await responsePromise;
        expect(response.status()).toBeLessThan(500);
        const orders = await database.query<{ id: string; unit_price: string }>(
          "SELECT mo.id,si.unit_price::text FROM marketplace_orders mo JOIN seller_orders so ON so.marketplace_order_id=mo.id JOIN seller_order_items si ON si.seller_order_id=so.id WHERE mo.session_hash=$1 AND si.offer_id=$2",
          [hash, target.id],
        );
        expect(orders.rows.length).toBeLessThanOrEqual(1);
        const persisted = orders.rows[0]?.unit_price ?? null;
        const rejectedForChange = orders.rows.length === 0 && (await response.text()).includes("CHECKOUT_CART_CHANGED");
        const safe = persisted === "100.00" || persisted === "100" || rejectedForChange;
        if (!orders.rows.length && !rejectedForChange) throw new Error("BLOCKED_CHECKOUT_DID_NOT_COMPLETE_FOR_UNRELATED_REASON");
        await record({ risk: "R03", result: safe ? "PASS" : "FAIL", displayedPrice: "100.00",
          changedPrice: "135.79", formUnchangedBeforeSubmit: true, persistedPrice: persisted,
          rejectedForChange, orderCount: orders.rows.length });
        outcomes.add("R03");
        expect.soft(safe, "R03 order price differs from the price displayed before the unchanged form was submitted").toBe(true);
      } finally { await context.close(); }
    });

    await scenario("R04", async () => {
      const first = await offer("concurrent-A");
      const added = await offer("concurrent-B");
      const context = await buyerContext(browser);
      const coordinator = await database.connect();
      const timeline: string[] = [];
      let locked = false;
      try {
        const page = await context.newPage();
        await addUsingUI(page, first.id, first.title);
        const hash = await session(context); sessions.push(hash);
        await page.goto("/zamowienie");
        const submit = page.getByRole("button", { name: pl.checkoutFlow.submit, exact: true });
        await expect(submit).toBeEnabled();
        const initial = await database.query("SELECT offer_id FROM cart_items WHERE session_hash=$1", [hash]);
        expect(initial.rows).toHaveLength(1);
        expect(String(initial.rows[0].offer_id)).toBe(first.id);
        await coordinator.query("BEGIN");
        locked = true;
        await coordinator.query("SET LOCAL idle_in_transaction_session_timeout='60s'");
        await coordinator.query("LOCK TABLE marketplace_orders IN SHARE MODE");
        const ownerPid = (await coordinator.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        timeline.push("barrier_held");
        const responsePromise = page.waitForResponse(response =>
          response.request().method() === "POST" &&
          response.request().headers()["next-action"] === actions.get("submitMarketplaceCheckout"), { timeout: 45_000 });
        // Attach rejection handling immediately; releasing the SQL barrier is always in finally.
        const responseSettled = responsePromise.then(response => ({ response }), () => ({ response: null }));
        await submit.click({ noWaitAfter: true });
        // Bounded condition wait, not a scheduling delay: proves the real checkout is blocked
        // at marketplace_orders INSERT, after its cart SELECT FOR UPDATE has completed.
        await expect.poll(async () => {
          const blocked = await database.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM pg_stat_activity a WHERE a.datname=current_database() AND a.wait_event_type='Lock' AND $1=ANY(pg_blocking_pids(a.pid)) AND a.query ~* 'insert into.*marketplace_orders'",
            [ownerPid],
          );
          return blocked.rows[0].count;
        }, { timeout: 12_000, intervals: [25, 50, 100], message: "BLOCKED_CHECKOUT_BARRIER_NOT_REACHED" }).toBe(1);
        timeline.push("checkout_snapshot_precedes_blocked_order_insert");
        const addition = await invoke(context.request, actions, "addToCart", [Number(added.id), 1]);
        expect(addition.status()).toBe(200);
        const committed = await database.query<{ quantity: number }>(
          "SELECT quantity FROM cart_items WHERE session_hash=$1 AND offer_id=$2", [hash, added.id],
        );
        expect(committed.rows).toEqual([{ quantity: 1 }]);
        timeline.push("B_committed_in_cart");
        await coordinator.query("COMMIT"); locked = false;
        timeline.push("barrier_released");
        const settled = await responseSettled;
        expect(settled.response, "BLOCKED_CHECKOUT_RESPONSE").not.toBeNull();
        expect(settled.response!.status()).toBeLessThan(500);
        const orders = await database.query<{ id: string }>("SELECT id FROM marketplace_orders WHERE session_hash=$1", [hash]);
        expect(orders.rows).toHaveLength(1);
        timeline.push("checkout_committed");
        const items = await database.query<{ offer_id: string; quantity: number }>(
          "SELECT si.offer_id,si.quantity FROM seller_order_items si JOIN seller_orders so ON so.id=si.seller_order_id WHERE so.marketplace_order_id=$1", [orders.rows[0].id],
        );
        expect(items.rows.filter(row => String(row.offer_id) === first.id)).toHaveLength(1);
        const cart = await database.query<{ quantity: number }>(
          "SELECT quantity FROM cart_items WHERE session_hash=$1 AND offer_id=$2", [hash, added.id],
        );
        const cartQuantity = cart.rows.reduce((sum, row) => sum + row.quantity, 0);
        const orderedQuantity = items.rows.filter(row => String(row.offer_id) === added.id).reduce((sum, row) => sum + row.quantity, 0);
        const conserved = cartQuantity + orderedQuantity === 1;
        await record({ risk: "R04", result: conserved ? "PASS" : "FAIL", timeline,
          addedQuantity: 1, remainingCartQuantity: cartQuantity, orderedQuantity,
          synchronization: "SQL_SHARE_LOCK_AND_PG_BLOCKING_PIDS", randomSchedulingDelays: false });
        outcomes.add("R04");
        expect.soft(conserved, "R04 committed new cart position must remain in cart or be included exactly once in the order").toBe(true);
      } finally {
        if (locked) await coordinator.query("ROLLBACK");
        coordinator.release();
        await context.close();
      }
    });
  } finally {
    // Only fixture-owned IDs/sessions. No schema, reset, migration or cross-test cleanup.
    for (const hash of sessions) await database.query("DELETE FROM cart_items WHERE session_hash=$1", [hash]);
    if (created.length) await database.query("UPDATE offers SET is_active=false,publication_status='draft' WHERE id=ANY($1::int[])", [created]);
    expect([...outcomes].sort(), "All four risks must have explicit evidence").toEqual(["R01", "R02", "R03", "R04"]);
  }
}
