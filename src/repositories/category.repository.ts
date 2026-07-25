import type { Category, PrismaClient } from "@/generated/prisma/client";

export class CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  list(): Promise<Category[]> {
    return this.db.category.findMany({ orderBy: { name: "asc" } });
  }

  findByName(name: string): Promise<Category | null> {
    return this.db.category.findUnique({ where: { name } });
  }

  create(name: string): Promise<Category> {
    return this.db.category.create({ data: { name } });
  }
}
