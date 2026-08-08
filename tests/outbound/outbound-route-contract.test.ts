import { describe, test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("Outbound Route Contract", () => {
  const routeSourcePath = path.join(process.cwd(), "src", "app", "go", "[id]", "route.ts");
  const coreSourcePath = path.join(process.cwd(), "src", "lib", "outbound", "outbound-core.ts");

  let routeSource: string;
  let coreSource: string;

  try {
    routeSource = fs.readFileSync(routeSourcePath, "utf-8");
    coreSource = fs.readFileSync(coreSourcePath, "utf-8");
  } catch {
    routeSource = "";
    coreSource = "";
  }

  test("uses Next.js after()", () => {
    assert.match(routeSource, /import \{.*?after.*?\} from "next\/server"/);
    assert.match(routeSource, /after\(async \(\) => \{/);
  });

  test("does not use fire-and-forget Promise without after", () => {
    assert.doesNotMatch(routeSource, /void db\.execute/);
    assert.doesNotMatch(routeSource, /void db\.insert/);
    assert.doesNotMatch(routeSource, /\.catch\(/);
  });

  test("returns redirect independently of tracking result", () => {
    // Ensuring the redirect is returned synchronously relative to the request lifecycle
    assert.match(routeSource, /return response;/);
    assert.match(routeSource, /NextResponse\.redirect\(destinationUrl, 302\)/);
  });

  test("does not log PII or sensitive values", () => {
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?ipHash/);
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?sessionHash/);
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?offerId/);
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?partnerId/);
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?outboundUrl/);
    assert.doesNotMatch(routeSource, /console\.(log|error)\(.*?rawIp/);
    
    assert.doesNotMatch(coreSource, /console\.(log|error)\(.*?ipHash/);
    assert.doesNotMatch(coreSource, /console\.(log|error)\(.*?sessionHash/);
  });

  test("SQL uses correct unique 24h interval and identity", () => {
    assert.match(coreSource, /session_hash = \$\{sessionHash\}/);
    assert.match(coreSource, /offer_id = \$\{offerId\}/);
    assert.match(coreSource, /NOT EXISTS/);
    assert.match(coreSource, /INTERVAL '24 HOURS'/);
    assert.match(coreSource, /CURRENT_TIMESTAMP AT TIME ZONE 'UTC'/);
  });
});
