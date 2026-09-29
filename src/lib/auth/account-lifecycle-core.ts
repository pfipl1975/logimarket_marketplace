import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const newPasswordSchema = z.string().min(12).max(128);
export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "MISMATCH" });
export const resetSchema = z.object({
  password: newPasswordSchema,
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "MISMATCH" });

export type AccountActionResult = { code: "IDLE" | "INVALID_EMAIL" | "PASSWORD_POLICY" | "MISMATCH" | "CHECK_EMAIL" | "AUTH_UNAVAILABLE" | "INVALID_LINK" };

export function validateNewPassword(password: unknown, confirmation: unknown): AccountActionResult["code"] | null {
  if (!newPasswordSchema.safeParse(password).success) return "PASSWORD_POLICY";
  if (password !== confirmation) return "MISMATCH";
  return null;
}
