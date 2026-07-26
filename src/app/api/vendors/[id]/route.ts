import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { vendorService } from "@/services/vendor/vendor.service";
import { vendorUpdateSchema } from "@/validators/vendor.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const vendor = await vendorService.getOrThrow(id);
  return NextResponse.json(vendor);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = vendorUpdateSchema.parse(await req.json());
  const vendor = await vendorService.update(id, body);
  return NextResponse.json(vendor);
});

export const DELETE = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  await vendorService.archive(id);
  return new NextResponse(null, { status: 204 });
});
