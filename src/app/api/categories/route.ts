import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { categoryService } from "@/services/category/category.service";
import { categoryInputSchema } from "@/validators/category.schema";

export const GET = withErrorHandling(async () => {
  const categories = await categoryService.list();
  return NextResponse.json(categories);
});

export const POST = withErrorHandling(async (req) => {
  const body = categoryInputSchema.parse(await req.json());
  const category = await categoryService.create(body);
  return NextResponse.json(category, { status: 201 });
});
