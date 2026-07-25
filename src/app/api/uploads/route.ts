import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { uploadPublicFile } from "@/services/storage/storage.service";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Accepts a single image file (logo/signature) and stores it in Supabase
 * Storage (see ADR-010) under a generated filename. Returns the public URL
 * to store on the Company record.
 */
export const POST = withErrorHandling(async (req) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ValidationError("No file provided", { file: "Required" });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new ValidationError("Unsupported file type", { file: "Only PNG, JPEG, or WebP allowed" });
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError("File too large", { file: "Max 2MB" });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadPublicFile(buffer, ext, file.type);

  return NextResponse.json({ url }, { status: 201 });
});
