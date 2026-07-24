import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Accepts a single image file (logo/signature) and stores it under a
 * generated filename (never the client-supplied name, to prevent path
 * traversal — security.md §File uploads). Returns the public URL to store
 * on the Company record.
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

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
});
