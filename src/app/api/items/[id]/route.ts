import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { itemService } from "@/services/item/item.service";
import { itemUpdateSchema } from "@/validators/item.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const item = await itemService.getOrThrow(id);
  return NextResponse.json(item);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = itemUpdateSchema.parse(await req.json());
  const item = await itemService.update(id, body);
  return NextResponse.json(item);
});

export const DELETE = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  await itemService.archive(id);
  return new NextResponse(null, { status: 204 });
});
