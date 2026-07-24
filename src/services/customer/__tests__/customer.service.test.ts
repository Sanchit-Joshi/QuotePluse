import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { customerService } from "../customer.service";
import { NotFoundError } from "@/lib/errors";

const createdIds: string[] = [];

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { id: { in: createdIds } } });
});

describe("CustomerService", () => {
  it("creates and retrieves a customer", async () => {
    const customer = await customerService.create({
      name: "Integration Test Co",
      billingAddress: "1 Test Way",
      state: "Karnataka",
    });
    createdIds.push(customer.id);

    const fetched = await customerService.getOrThrow(customer.id);
    expect(fetched.name).toBe("Integration Test Co");
  });

  it("normalizes empty-string optional fields to null before persisting", async () => {
    const customer = await customerService.create({
      name: "Empty Fields Co",
      billingAddress: "1 Test Way",
      state: "Karnataka",
      gstin: "",
      phone: "",
      email: "",
    });
    createdIds.push(customer.id);

    expect(customer.gstin).toBeNull();
    expect(customer.phone).toBeNull();
    expect(customer.email).toBeNull();
  });

  it("archives (soft-deletes) rather than hard-deleting", async () => {
    const customer = await customerService.create({
      name: "Archivable Co",
      billingAddress: "1 Test Way",
      state: "Karnataka",
    });
    createdIds.push(customer.id);

    await customerService.archive(customer.id);

    await expect(customerService.getOrThrow(customer.id)).rejects.toBeInstanceOf(NotFoundError);
    const raw = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(raw).not.toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
  });

  it("throws NotFoundError for a nonexistent customer", async () => {
    await expect(customerService.getOrThrow("clnonexistentid0000000000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
