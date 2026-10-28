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
  src: "2902afdaeceb995cadc82cec42252b203aa7172b",
  ".github": "3fa9055bba2beaf7d37913dd4fb32eac3fc17f48",
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

  return actions;
}

async function invoke(request: APIRequestContext, actions: Map<string, string>, name: string, args: unknown[], port = 3000) {
  const id = actions.get(name);
  expect(id, "BLOCKED_UNREGISTERED_REQUIRED_ACTION: " + name).toBeTruthy();
  const origin = "http://localhost:" + port;
  return request.post(origin + "/", {
    headers: { "next-action": id!, "content-type": "text/plain;charset=UTF-8", origin },
    data: JSON.stringify(args),
    timeout: 20_000,
  });
}


async function record(evidence: Evidence) {
  // Only synthetic outcome metadata, never cookies, action IDs, raw HTTP/RSC or provider payloads.
  console.log("LM_SEC_57A_REGRESSION " + JSON.stringify(evidence));
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
        const protectedOffers = [ownDraft, foreignDraft];
        for (const status of ["hidden", "archived", "deleted"]) {
          const target = await offer("private-" + status, foreign.rows[0].id, status);
          protectedOffers.push(target);
          const sentinel = "PRIVATE_" + status + "_" + prefix;
          await database.query("INSERT INTO offer_attribute_values (offer_id,attribute_id,value_text) VALUES ($1,$2,$3)", [target.id, attributeId, sentinel]);
          for (const request of [anon.request, nonAdminPage.request]) {
            const html = await request.get("http://localhost:3000/oferta/" + target.id);
            expect(html.status()).toBe(status === "archived" ? 200 : 404);
            expect((await html.text()).includes(sentinel)).toBe(false);
            const rsc = await request.get("http://localhost:3000/oferta/" + target.id + "?security=rsc", { headers: { RSC: "1" } });
            expect(rsc.status()).toBeLessThan(500);
            expect((await rsc.text()).includes(sentinel)).toBe(false);
          }
        }
        const registered = actions.has("hydrateOffersWithAttributes");
        expect(registered, "R01 internal hydrator must not be a public action").toBe(false);
        const publicHtml = await anon.request.get("http://localhost:3000/oferta/" + control.id);
        expect(publicHtml.status()).toBe(200);
        expect((await publicHtml.text()).includes(sentinels[0]), "R01 published attributes remain visible").toBe(true);
        let leaked = false;
        let calls = 0;
        const rejectedActions = new Map(actions);
        rejectedActions.set("hydrateOffersWithAttributes", "0".repeat(40));
        for (const request of [anon.request, nonAdminPage.request]) {
          for (const target of protectedOffers) {
            const response = await invoke(request, rejectedActions, "hydrateOffersWithAttributes",
              [[{ id: Number(target.id), categoryId: Number(categoryId) }], "pl"]);
            expect(response.status(), "R01 unregistered action must reject HTTP invocation").toBe(404);
            const body = await response.text();
            leaked = leaked || sentinels.slice(1).some(sentinel => body.includes(sentinel));
            calls++;
          }
        }
        const result = leaked ? "FAIL" : "PASS";
        await record({ risk: "R01", result, registeredInBuiltManifest: registered, actionCalls: calls,
          publicActionProtocolControl: true, publishedAttributesVisible: true, draftRoutesDenied: true, privateAttributeDisclosed: leaked,
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
      for (const variant of variants.flatMap(value => ["anonymous", "buyer"].map(actor => ({ ...value, actor })))) {
        const target = await offer("stale-" + variant.label);
        const context = variant.actor === "buyer" ? await buyerContext(browser) : await browser.newContext();
        try {
          const page = await context.newPage();
          await addUsingUI(page, target.id, target.title);
          const hash = await session(context); sessions.push(hash);
          const baseline = await invoke(context.request, actions, "getCartItems", []);
          expect(baseline.status()).toBe(200);
          const baselineBody = await baseline.text();
          expect(baselineBody.includes(target.title), "BLOCKED_CART_POSITIVE_CONTROL").toBe(true);
          expect(baselineBody.includes("100.00"), "R02 normal cart price").toBe(true);
          const privateTitle = "HIDDEN_TITLE_" + prefix;
          // Literal allowlisted state mutations on this test's single offer only.
          await database.query(
            "UPDATE offers SET " + variant.sql + ",price_brutto=987654.37,title=$2 WHERE id=$1",
            [target.id, variant.privateTitle ? privateTitle : target.title],
          );
          await page.goto("/");
          await page.getByRole("button", { name: pl.nav.cart, exact: true }).click();
          await expect(page.getByRole("dialog").getByText(pl.offers.unavailableTitle)).toBeVisible();
          await expect(page.getByRole("dialog")).not.toContainText(target.title);
          const action = await invoke(context.request, actions, "getCartItems", []);
          expect(action.status()).toBe(200);
          const actionBody = await action.text();
          expect(actionBody.includes('"isUnavailable":true') || actionBody.includes('isUnavailable'), "R02 unavailable position is retained").toBe(true);
          const retained = await database.query<{ quantity: number }>("SELECT quantity FROM cart_items WHERE session_hash=$1 AND offer_id=$2", [hash, target.id]);
          expect(retained.rows).toEqual([{ quantity: 1 }]);
          const html = await context.request.get("http://localhost:3000/oferta/" + target.id);
          expect(html.status()).toBe(variant.privateTitle ? 404 : 200);
          const htmlBody = await html.text();
          const flight = await context.request.get("http://localhost:3000/oferta/" + target.id + "?qa56i=rsc", {
            headers: { RSC: "1" },
          });
          expect([200, 404]).toContain(flight.status());
          expect(flight.headers()["content-type"], "BLOCKED_RSC_PROTOCOL").toContain("text/x-component");
          const flightBody = await flight.text();
          if (variant.privateTitle) {
            // Streaming RSC may commit HTTP 200 before rendering notFound().
            expect(flightBody.includes("NEXT_HTTP_ERROR_FALLBACK;404"), "BLOCKED_MISSING_RSC_NOT_FOUND_BOUNDARY").toBe(true);
          } else { expect(flight.status()).toBe(200); }
          const actionLeak = actionBody.includes("987654.37") || (variant.privateTitle && actionBody.includes(privateTitle));
          const htmlLeak = htmlBody.includes("987654.37");
          const rscLeak = flightBody.includes("987654.37");
          const netLeak = variant.label === "hidden-rfq" && [actionBody, htmlBody, flightBody].some(body => body.includes("765432.19"));
          evidence.push({ actor: variant.actor, variant: variant.label, htmlStatus: html.status(), rscStatus: flight.status(), actionLeak, htmlLeak, rscLeak, netLeak });
          expect.soft(actionLeak, "R02 " + variant.label + " private data in cart Action").toBe(false);
          expect.soft(htmlLeak || rscLeak || netLeak, "R02 " + variant.label + " private price in HTML/RSC").toBe(false);
        } finally { await context.close(); }
      }
      const failed = evidence.some(row => Object.entries(row).some(([key, value]) => key.endsWith("Leak") && value === true));
      await record({ risk: "R02", result: failed ? "FAIL" : "PASS", variants: evidence });
      outcomes.add("R02");
    });

  } finally {
    // Only fixture-owned IDs/sessions. No schema, reset, migration or cross-test cleanup.
    for (const hash of sessions) await database.query("DELETE FROM cart_items WHERE session_hash=$1", [hash]);
    if (created.length) await database.query("UPDATE offers SET is_active=false,publication_status='draft' WHERE id=ANY($1::int[])", [created]);
    expect([...outcomes].sort(), "All four risks must have explicit evidence").toEqual(["R01", "R02"]);
  }
}
