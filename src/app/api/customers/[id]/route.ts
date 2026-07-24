import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { customerService } from "@/services/customer/customer.service";
import { customerUpdateSchema } from "@/validators/customer.schema";

export const GET = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  const customer = await customerService.getOrThrow(id);
  return NextResponse.json(customer);
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  const { id } = await params;
  const body = customerUpdateSchema.parse(await req.json());
  const customer = await customerService.update(id, body);
  return NextResponse.json(customer);
});

export const DELETE = withErrorHandling(async (_req, { params }) => {
  const { id } = await params;
  await customerService.archive(id);
  return new NextResponse(null, { status: 204 });
});
