import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { categoryService } from "../category.service";
import { ConflictError } from "@/lib/errors";

const createdIds: string[] = [];

afterAll(async () => {
  await prisma.category.deleteMany({ where: { id: { in: createdIds } } });
});

describe("CategoryService", () => {
  it("creates a category", async () => {
    const category = await categoryService.create({ name: "Integration Test Category" });
    createdIds.push(category.id);
    expect(category.name).toBe("Integration Test Category");
  });

  it("rejects a duplicate category name", async () => {
    const category = await categoryService.create({ name: "Duplicate Category Test" });
    createdIds.push(category.id);

    await expect(categoryService.create({ name: "Duplicate Category Test" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("lists categories alphabetically", async () => {
    const category = await categoryService.create({ name: "Zzz Listable Category" });
    createdIds.push(category.id);

    const all = await categoryService.list();
    expect(all.some((c) => c.id === category.id)).toBe(true);
    const names = all.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
