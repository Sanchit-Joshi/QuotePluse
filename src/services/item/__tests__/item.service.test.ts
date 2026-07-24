import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { itemService } from "../item.service";
import { NotFoundError } from "@/lib/errors";

const createdIds: string[] = [];

afterAll(async () => {
  await prisma.item.deleteMany({ where: { id: { in: createdIds } } });
});

describe("ItemService", () => {
  it("creates and retrieves an item", async () => {
    const item = await itemService.create({
      name: "Integration Test Item",
      unit: "hr",
      defaultUnitPricePaise: 100000,
      defaultGstRate: 18,
    });
    createdIds.push(item.id);

    const fetched = await itemService.getOrThrow(item.id);
    expect(fetched.name).toBe("Integration Test Item");
  });

  it("updates an item", async () => {
    const item = await itemService.create({
      name: "Before Update",
      unit: "pcs",
      defaultUnitPricePaise: 5000,
      defaultGstRate: 12,
    });
    createdIds.push(item.id);

    const updated = await itemService.update(item.id, { name: "After Update" });
    expect(updated.name).toBe("After Update");
  });

  it("archives (soft-deletes) rather than hard-deleting", async () => {
    const item = await itemService.create({
      name: "Archivable Item",
      unit: "pcs",
      defaultUnitPricePaise: 1000,
      defaultGstRate: 5,
    });
    createdIds.push(item.id);

    await itemService.archive(item.id);

    await expect(itemService.getOrThrow(item.id)).rejects.toBeInstanceOf(NotFoundError);
    const raw = await prisma.item.findUnique({ where: { id: item.id } });
    expect(raw?.deletedAt).not.toBeNull();
  });

  it("throws NotFoundError for a nonexistent item", async () => {
    await expect(itemService.getOrThrow("clnonexistentid0000000000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("lists items filtered by search term", async () => {
    const item = await itemService.create({
      name: "UniqueSearchableWidget",
      unit: "pcs",
      defaultUnitPricePaise: 2000,
      defaultGstRate: 18,
    });
    createdIds.push(item.id);

    const result = await itemService.list({ page: 1, pageSize: 10, search: "UniqueSearchableWidget" });
    expect(result.items.some((i) => i.id === item.id)).toBe(true);
  });
});
