import { z } from "zod";
import { optionalGstinSchema } from "./common.schema";

export const bankDetailInputSchema = z.object({
  accountName: z.string().trim().min(1),
  accountNumber: z.string().trim().min(1),
  ifsc: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  bankName: z.string().trim().min(1),
  branch: z.string().trim().min(1),
});

export const companyInputSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  gstin: optionalGstinSchema,
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().optional(),
  state: z.string().trim().min(1),
  signatoryName: z.string().trim().optional(),
  bankDetail: bankDetailInputSchema.optional(),
});

export type CompanyInput = z.infer<typeof companyInputSchema>;

export const numberingUpdateSchema = z.object({
  prefix: z.string().trim().min(1).max(10).optional(),
  nextNumber: z.number().int().min(1).optional(),
  resetRule: z.enum(["NEVER", "YEARLY", "FINANCIAL_YEAR"]).optional(),
});

export type NumberingUpdateInput = z.infer<typeof numberingUpdateSchema>;
