import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
