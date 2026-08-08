import { describe, test } from "node:test";
import assert from "node:assert";
import {
  parseOutboundOfferId,
  parseOutboundDestination,
  extractClientIp,
  hashClientIp,
  isPgInt4,
  isValidOutboundTrackingSecret
} from "@/lib/outbound/outbound-core";

describe("Outbound Core Logic", () => {
  describe("parseOutboundOfferId", () => {
    test("allows safe canonical positive integers", () => {
      assert.strictEqual(parseOutboundOfferId("1"), 1);
      assert.strictEqual(parseOutboundOfferId("123456789"), 123456789);
      assert.strictEqual(parseOutboundOfferId(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
    });

    test("rejects invalid or non-canonical formats", () => {
      const invalid = [
        "01",
        "0",
        "-1",
        "+1",
        " 1 ",
        "1 ",
        " 1",
        "1.0",
        "1.5",
        "1e2",
        "NaN",
        "Infinity",
        "",
        "abc",
        String(Number.MAX_SAFE_INTEGER + 1)
      ];

      for (const val of invalid) {
        assert.strictEqual(parseOutboundOfferId(val), null, `Should reject ${val}`);
      }
    });
  });

  describe("parseOutboundDestination", () => {
    test("allows standard https and http", () => {
      assert.strictEqual(parseOutboundDestination("https://partner.example"), "https://partner.example/");
      assert.strictEqual(parseOutboundDestination("http://partner.example/path?q=1"), "http://partner.example/path?q=1");
    });

    test("rejects unsafe protocols and formats", () => {
      const invalid = [
        "javascript:alert(1)",
        "data:text/html,<h1>Hello</h1>",
        "file:///etc/passwd",
        "ftp://example.com",
        "/relative/path",
        "//schemerelative.com",
        "",
        "   ",
        "https://user:pass@example.com",
        "not-a-url"
      ];

      for (const val of invalid) {
        assert.strictEqual(parseOutboundDestination(val), null, `Should reject ${val}`);
      }
    });
  });

  describe("extractClientIp", () => {
    test("respects precedence x-vercel-forwarded-for > x-forwarded-for > x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-vercel-forwarded-for", "1.1.1.1, 2.2.2.2");
      headers.set("x-forwarded-for", "3.3.3.3");
      headers.set("x-real-ip", "4.4.4.4");
      assert.strictEqual(extractClientIp(headers), "1.1.1.1");
    });

    test("falls back to x-forwarded-for", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", " 3.3.3.3 , 5.5.5.5 ");
      headers.set("x-real-ip", "4.4.4.4");
      assert.strictEqual(extractClientIp(headers), "3.3.3.3");
    });

    test("falls back to x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-real-ip", " 4.4.4.4 ");
      assert.strictEqual(extractClientIp(headers), "4.4.4.4");
    });

    test("handles ipv6 lowercase normalization", () => {
      const headers = new Headers();
      headers.set("x-vercel-forwarded-for", "2001:0DB8:85A3:0000:0000:8A2E:0370:7334");
      assert.strictEqual(extractClientIp(headers), "2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    test("returns null if no header matches", () => {
      const headers = new Headers();
      assert.strictEqual(extractClientIp(headers), null);
      
      headers.set("x-vercel-forwarded-for", " , ");
      assert.strictEqual(extractClientIp(headers), null);
    });
  });

  describe("isValidOutboundTrackingSecret", () => {
    test("rejects undefined", () => {
      assert.strictEqual(isValidOutboundTrackingSecret(undefined), false);
    });

    test("rejects empty and short strings", () => {
      assert.strictEqual(isValidOutboundTrackingSecret(""), false);
      assert.strictEqual(isValidOutboundTrackingSecret("a"), false);
      assert.strictEqual(isValidOutboundTrackingSecret("supersecret31characterlongstring"), false); // 31 chars
    });

    test("accepts strings >= 32 chars", () => {
      assert.strictEqual(isValidOutboundTrackingSecret("supersecret32characterlongstringx"), true); // 33 chars
      assert.strictEqual(isValidOutboundTrackingSecret("supersecret32characterlongstring"), true); // 32 chars
      assert.strictEqual(isValidOutboundTrackingSecret("supersecret64characterlongstringsupersecret64characterlongstring"), true); // 64 chars
    });
  });

  describe("hashClientIp", () => {
    const secret = "supersecret32characterlongstring";
    const anotherSecret = "anothersecret32characterlongstri";

    test("throws INVALID_TRACKING_SECRET if secret is too short", () => {
      assert.throws(() => {
        hashClientIp("1.1.1.1", "shortsecret");
      }, /INVALID_TRACKING_SECRET/);
      
      assert.throws(() => {
        hashClientIp("1.1.1.1", "supersecret31characterlongstrin"); // 31 chars
      }, /INVALID_TRACKING_SECRET/);
    });

    test("returns same 64-char hash for same IP and secret", () => {
      const h1 = hashClientIp("1.1.1.1", secret);
      const h2 = hashClientIp("1.1.1.1", secret);
      assert.strictEqual(h1, h2);
      assert.strictEqual(h1.length, 64);
      assert.match(h1, /^[0-9a-f]{64}$/);
    });

    test("returns different hash for different IPs", () => {
      const h1 = hashClientIp("1.1.1.1", secret);
      const h2 = hashClientIp("2.2.2.2", secret);
      assert.notStrictEqual(h1, h2);
    });

    test("returns different hash for different secret", () => {
      const h1 = hashClientIp("1.1.1.1", secret);
      const h2 = hashClientIp("1.1.1.1", anotherSecret);
      assert.notStrictEqual(h1, h2);
    });

    test("uses 'unknown' sentinel if IP is null", () => {
      const h1 = hashClientIp(null, secret);
      const h2 = hashClientIp("unknown", secret);
      assert.strictEqual(h1, h2);
      assert.strictEqual(h1.length, 64);
    });
    
    test("does not expose raw IP in output", () => {
      const ip = "192.168.1.1";
      const h1 = hashClientIp(ip, secret);
      assert.doesNotMatch(h1, new RegExp(ip.replace(/\./g, "\\.")));
    });
  });

  describe("isPgInt4", () => {
    test("validates signed 32-bit integer limits and non-integers", () => {
      assert.strictEqual(isPgInt4(1), true);
      assert.strictEqual(isPgInt4(2147483647), true);
      assert.strictEqual(isPgInt4(0), false);
      assert.strictEqual(isPgInt4(-1), false);
      assert.strictEqual(isPgInt4(2147483648), false);
      assert.strictEqual(isPgInt4(1.5), false);
      assert.strictEqual(isPgInt4(NaN), false);
      assert.strictEqual(isPgInt4(Infinity), false);
    });
  });
});
