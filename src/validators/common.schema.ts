import { z } from "zod";

/** 15-character Indian GSTIN pattern, e.g. 22AAAAA0000A1Z5. */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE_PATTERN = /^[+]?[0-9\s-]{7,15}$/;

/**
 * These "optional free-text" schemas deliberately avoid `.transform()`.
 * react-hook-form's zodResolver requires the schema's input and output
 * types to match; a transform (e.g. "" -> undefined) breaks that and
 * produces confusing generic-inference errors in form components. Empty
 * strings are normalized to `undefined` once, server-side, right before
 * persistence (see lib/normalize.ts) — keeping one shared schema usable
 * by both the client form and the API route (NFR: validation parity).
 */
export const optionalGstinSchema = z
  .union([z.literal(""), z.string().regex(GSTIN_PATTERN, "Invalid GSTIN format")])
  .optional();

export const phoneSchema = z
  .union([z.literal(""), z.string().regex(PHONE_PATTERN, "Invalid phone number")])
  .optional();

export const emailSchema = z.union([z.literal(""), z.string().email("Invalid email")]).optional();

export const ifscSchema = z.string().regex(IFSC_PATTERN, "Invalid IFSC code");

/** Non-negative integer paise amount. */
export const paiseSchema = z.number().int().min(0);

export const percentSchema = z.number().min(0).max(100);

export const gstRateSchema = z.number().min(0).max(28);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
