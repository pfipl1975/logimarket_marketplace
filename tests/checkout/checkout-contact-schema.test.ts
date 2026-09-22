import test from "node:test";
import assert from "node:assert/strict";
import { CheckoutContactSchema } from "../../src/lib/checkout/contact-schema";
import {
  CHECKOUT_MESSAGE_MAX_LENGTH,
  CHECKOUT_PHONE_MAX,
} from "../../src/lib/checkout/constants";

test("Checkout Contact Schema Validation", async (t) => {
  await t.test("Valid payload passes", () => {
    const result = CheckoutContactSchema.safeParse({
      companyName: "Acme Corp",
      contactName: "John Doe",
      email: "john@acme.com",
      phone: "+48 123 456 789",
      message: "Delivery instructions",
    });
    assert.equal(result.success, true);
  });

  await t.test("Required fields must not be empty", () => {
    assert.equal(CheckoutContactSchema.safeParse({ contactName: "John", email: "john@acme.com" }).success, false);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "", contactName: "John", email: "john@acme.com" }).success, false);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "", email: "john@acme.com" }).success, false);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "" }).success, false);
  });

  await t.test("Fields are trimmed", () => {
    const result = CheckoutContactSchema.safeParse({
      companyName: "  Acme Corp  ",
      contactName: "  John Doe  ",
      email: "  john@acme.com  ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.companyName, "Acme Corp");
      assert.equal(result.data.contactName, "John Doe");
      assert.equal(result.data.email, "john@acme.com");
    }
  });

  await t.test("Empty strings are rejected for required fields even with spaces", () => {
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "   ", contactName: "John", email: "john@acme.com" }).success, false);
  });

  await t.test("Email format validation", () => {
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "not-an-email" }).success, false);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme" }).success, false);
  });

  await t.test("Max length constraints", () => {
    const longString = "a".repeat(255);
    const tooLongString = "a".repeat(256);
    
    assert.equal(CheckoutContactSchema.safeParse({ companyName: longString, contactName: "John", email: "john@acme.com" }).success, true);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: tooLongString, contactName: "John", email: "john@acme.com" }).success, false);

    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: longString, email: "john@acme.com" }).success, true);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: tooLongString, email: "john@acme.com" }).success, false);
    
    const longEmail = "a".repeat(255 - 9) + "@acme.com";
    const tooLongEmail = "a".repeat(256 - 9) + "@acme.com";
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: longEmail }).success, true);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: tooLongEmail }).success, false);
  });

  await t.test("Phone optionality and boundaries", () => {
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", phone: undefined }).success, true);
    
    const res = CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", phone: "" });
    assert.equal(res.success, true);
    if (res.success) assert.equal(res.data.phone, null);

    const longPhone = "1".repeat(CHECKOUT_PHONE_MAX);
    const tooLongPhone = "1".repeat(CHECKOUT_PHONE_MAX + 1);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", phone: longPhone }).success, true);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", phone: tooLongPhone }).success, false);
  });

  await t.test("Message optionality and boundaries", () => {
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", message: undefined }).success, true);
    
    const res = CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", message: "" });
    assert.equal(res.success, true);
    if (res.success) assert.equal(res.data.message, null);

    const longMsg = "a".repeat(CHECKOUT_MESSAGE_MAX_LENGTH);
    const tooLongMsg = "a".repeat(CHECKOUT_MESSAGE_MAX_LENGTH + 1);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", message: longMsg }).success, true);
    assert.equal(CheckoutContactSchema.safeParse({ companyName: "Acme", contactName: "John", email: "john@acme.com", message: tooLongMsg }).success, false);
  });
});
