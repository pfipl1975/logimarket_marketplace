import { describe, it } from "node:test";
import * as assert from "node:assert";
import { 
  normalizePlNip, 
  isValidPlNip, 
  BuyerBusinessIdentityProvider,
  verifyBuyerIdentity,
  BuyerIdentityVerificationResult
} from "../../src/lib/buyer/buyer-identity-core";

describe("Buyer Identity Verification Core", () => {
  describe("NIP Normalization", () => {
    it("returns plain NIP unchanged", () => {
      assert.strictEqual(normalizePlNip("1234567890"), "1234567890");
    });
    
    it("removes hyphens", () => {
      assert.strictEqual(normalizePlNip("123-456-78-90"), "1234567890");
    });
    
    it("removes spaces", () => {
      assert.strictEqual(normalizePlNip("123 456 78 90"), "1234567890");
    });
  });

  describe("NIP Validation", () => {
    it("rejects non-digit strings", () => {
      assert.strictEqual(isValidPlNip("12345ABC90"), false);
      assert.strictEqual(isValidPlNip("abcdefghij"), false);
    });

    it("rejects bad lengths", () => {
      assert.strictEqual(isValidPlNip("123456789"), false);
      assert.strictEqual(isValidPlNip("12345678901"), false);
    });

    it("accepts valid NIP", () => {
      // 5260250274 is a valid checksum NIP (often used in PL testing)
      assert.strictEqual(isValidPlNip("5260250274"), true);
      assert.strictEqual(isValidPlNip("526-025-02-74"), true);
    });

    it("rejects invalid checksum NIP", () => {
      assert.strictEqual(isValidPlNip("5260250275"), false);
    });
  });

  describe("verifyBuyerIdentity", () => {
    const validNip = "5260250274";

    class FakeProvider implements BuyerBusinessIdentityProvider {
      public nextResult: BuyerIdentityVerificationResult = {
        status: "failed", 
        reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" 
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async verifyByNip(_canonicalNip: string): Promise<BuyerIdentityVerificationResult> {
        return this.nextResult;
      }
    }

    it("rejects invalid NIP before calling provider", async () => {
      const provider = new FakeProvider();
      const res = await verifyBuyerIdentity("invalid-nip", provider);
      assert.strictEqual(res.status, "failed");
      if (res.status === "failed") {
        assert.strictEqual(res.reason, "INVALID_BUYER_IDENTITY");
      }
    });

    it("returns verified when provider finds exactly one match", async () => {
      const provider = new FakeProvider();
      provider.nextResult = {
        status: "verified",
        countryCode: "PL",
        canonicalNip: validNip,
        businessName: "Test Company",
        businessVerificationMethod: "TEST_METHOD",
        businessVerificationSource: "TEST_SOURCE",
        businessVerifiedAt: new Date()
      };

      const res = await verifyBuyerIdentity(validNip, provider);
      assert.strictEqual(res.status, "verified");
      if (res.status === "verified") {
        assert.strictEqual(res.canonicalNip, validNip);
        assert.strictEqual(res.businessName, "Test Company");
      }
    });

    it("returns BUYER_IDENTITY_NOT_FOUND when provider returns not found", async () => {
      const provider = new FakeProvider();
      provider.nextResult = { status: "failed", reason: "BUYER_IDENTITY_NOT_FOUND" };
      const res = await verifyBuyerIdentity(validNip, provider);
      assert.strictEqual(res.status, "failed");
      if (res.status === "failed") {
        assert.strictEqual(res.reason, "BUYER_IDENTITY_NOT_FOUND");
      }
    });
    
    it("returns BUYER_IDENTITY_AMBIGUOUS when provider returns ambiguous", async () => {
      const provider = new FakeProvider();
      provider.nextResult = { status: "failed", reason: "BUYER_IDENTITY_AMBIGUOUS" };
      const res = await verifyBuyerIdentity(validNip, provider);
      assert.strictEqual(res.status, "failed");
      if (res.status === "failed") {
        assert.strictEqual(res.reason, "BUYER_IDENTITY_AMBIGUOUS");
      }
    });

    it("fails closed when provider NIP differs from requested NIP", async () => {
      const provider = new FakeProvider();
      provider.nextResult = {
        status: "verified",
        countryCode: "PL",
        canonicalNip: "1234567890", // Differs from validNip
        businessName: "Test Company",
        businessVerificationMethod: "TEST_METHOD",
        businessVerificationSource: "TEST_SOURCE",
        businessVerifiedAt: new Date()
      };
      
      const res = await verifyBuyerIdentity(validNip, provider);
      assert.strictEqual(res.status, "failed");
      if (res.status === "failed") {
        assert.strictEqual(res.reason, "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE");
      }
    });

    it("fails closed when provider returns missing business name", async () => {
      const provider = new FakeProvider();
      provider.nextResult = {
        status: "verified",
        countryCode: "PL",
        canonicalNip: validNip,
        businessName: "   ", // Missing/whitespace name
        businessVerificationMethod: "TEST_METHOD",
        businessVerificationSource: "TEST_SOURCE",
        businessVerifiedAt: new Date()
      };
      
      const res = await verifyBuyerIdentity(validNip, provider);
      assert.strictEqual(res.status, "failed");
      if (res.status === "failed") {
        assert.strictEqual(res.reason, "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE");
      }
    });
  });
});
