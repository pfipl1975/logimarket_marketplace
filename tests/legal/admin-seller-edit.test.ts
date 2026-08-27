import { describe, it, expect } from "vitest";
import {
  AdminSellerLegalDataSaveInputSchema,
  AdminSellerTaxIdentifierAddInputSchema,
} from "../../src/lib/admin/partner-edit-core";

describe("Admin Seller Legal Data Zod Schemas", () => {
  it("validates valid legal identity input", () => {
    const input = {
      partnerId: 1,
      businessEmail: "test@example.com",
      legalName: "Test Company",
      jurisdictionCountry: "PL",
      registeredAddressLine1: "Street 1",
      registeredAddressLine2: "",
      registeredPostalCode: "00-000",
      registeredCity: "Warsaw",
      registeredRegion: "Mazovia",
      registeredCountryCode: "PL",
    };
    
    const result = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registeredAddressLine2).toBeNull();
    }
  });

  it("trims and normalizes country code", () => {
    const input = {
      partnerId: 1,
      businessEmail: "test@example.com",
      legalName: "  Test Company  ",
      jurisdictionCountry: "pl ",
      registeredAddressLine1: "Street 1",
      registeredAddressLine2: null,
      registeredPostalCode: null,
      registeredCity: null,
      registeredRegion: null,
      registeredCountryCode: " pl",
    };
    
    const result = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.legalName).toBe("Test Company");
      expect(result.data.jurisdictionCountry).toBe("PL");
      expect(result.data.registeredCountryCode).toBe("PL");
    }
  });

  it("fails on invalid business email", () => {
    const input = {
      partnerId: 1,
      businessEmail: "not-an-email",
      legalName: "Test Company",
      jurisdictionCountry: "PL",
      registeredAddressLine1: null,
      registeredAddressLine2: null,
      registeredPostalCode: null,
      registeredCity: null,
      registeredRegion: null,
      registeredCountryCode: null,
    };
    
    const result = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("validates tax identifier input", () => {
    const input = {
      partnerId: 1,
      identifierType: "VAT",
      identifierValue: "PL1234567890",
      countryCode: "PL",
    };
    const result = AdminSellerTaxIdentifierAddInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("fails tax identifier on invalid country code", () => {
    const input = {
      partnerId: 1,
      identifierType: "VAT",
      identifierValue: "PL1234567890",
      countryCode: "POL", // too long
    };
    const result = AdminSellerTaxIdentifierAddInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
