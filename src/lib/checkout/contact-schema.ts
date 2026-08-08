import { z } from "zod";
import {
  CHECKOUT_COMPANY_NAME_MAX,
  CHECKOUT_CONTACT_NAME_MAX,
  CHECKOUT_EMAIL_MAX,
  CHECKOUT_MESSAGE_MAX_LENGTH,
  CHECKOUT_PHONE_MAX,
} from "./constants";

export const CheckoutContactSchema = z.object({
  companyName: z.string().trim().min(1).max(CHECKOUT_COMPANY_NAME_MAX),
  contactName: z.string().trim().min(1).max(CHECKOUT_CONTACT_NAME_MAX),
  email: z.string().trim().min(1).max(CHECKOUT_EMAIL_MAX).email(),
  phone: z
    .string()
    .trim()
    .max(CHECKOUT_PHONE_MAX)
    .optional()
    .transform((val) => (val === "" ? null : val ?? null)),
  message: z
    .string()
    .trim()
    .max(CHECKOUT_MESSAGE_MAX_LENGTH)
    .optional()
    .transform((val) => (val === "" ? null : val ?? null)),
});

export type CheckoutContactInput = z.infer<typeof CheckoutContactSchema>;
