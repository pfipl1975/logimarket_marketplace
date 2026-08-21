import { expect, test, describe } from "vitest";
import { parseOfferDraftCreateInput } from "./draft-core";

describe("draft-core validation", () => {
  test("valid input parses correctly", () => {
    const input = {
      partnerId: 10,
      categoryId: 20,
      title: "  My Valid Title  ",
      offerModel: "rfq",
      conversionType: "outbound"
    };
    
    const result = parseOfferDraftCreateInput(input);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("My Valid Title"); // checks trim
      expect(result.data.partnerId).toBe(10);
      expect(result.data.categoryId).toBe(20);
      expect(result.data.offerModel).toBe("rfq");
      expect(result.data.conversionType).toBe("outbound");
    }
  });

  test("invalid model rejects", () => {
    const input = {
      partnerId: 10,
      categoryId: 20,
      title: "Title",
      offerModel: "invalid_model",
      conversionType: "outbound"
    };
    const result = parseOfferDraftCreateInput(input);
    expect(result.ok).toBe(false);
  });

  test("empty title rejects", () => {
    const input = {
      partnerId: 10,
      categoryId: 20,
      title: "   ",
      offerModel: "rfq",
      conversionType: "inbound"
    };
    const result = parseOfferDraftCreateInput(input);
    expect(result.ok).toBe(false);
  });

  test("missing partner rejects", () => {
    const input = {
      categoryId: 20,
      title: "Title",
      offerModel: "rfq",
      conversionType: "inbound"
    };
    const result = parseOfferDraftCreateInput(input);
    expect(result.ok).toBe(false);
  });
});
