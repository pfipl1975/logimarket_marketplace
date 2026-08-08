import { z } from "zod";

export const PublicRfqInputSchema = z.object({
  offerId: z.number().int().positive().safe(),
  companyName: z.string().trim().min(1).max(255),
  contactName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(100).optional().transform(v => (v === "" ? undefined : v)),
  message: z.string().trim().max(5000).optional().transform(v => (v === "" ? undefined : v)),
});

export const AdminRfqStatusMutationSchema = z.object({
  rfqId: z.number().int().positive().safe(),
  expectedStatus: z.enum(["new", "in_progress", "responded", "closed"]),
  targetStatus: z.enum(["new", "in_progress", "responded", "closed"]),
});

export type PublicRfqInput = z.infer<typeof PublicRfqInputSchema>;
export type AdminRfqStatusMutation = z.infer<typeof AdminRfqStatusMutationSchema>;
