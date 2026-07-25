import type { Item, Prisma, PrismaClient } from "@/generated/prisma/client";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export interface ItemListFilters extends PageParams {
  search?: string;
  categoryId?: string;
}

const withCategory = { category: true } as const;
export type ItemWithCategory = Item & { category: { id: string; name: string } | null };

export class ItemRepository {
  constructor(private readonly db: PrismaClient) {}

  private whereActive(search?: string, categoryId?: string): Prisma.ItemWhereInput {
    return {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { hsnSac: { contains: search, mode: "insensitive" } }] }
        : {}),
    };
  }

  async list(filters: ItemListFilters): Promise<PageResult<ItemWithCategory>> {
    const where = this.whereActive(filters.search, filters.categoryId);
    const [items, total] = await Promise.all([
      this.db.item.findMany({
        where,
        orderBy: { name: "asc" },
        include: withCategory,
        ...paginationToSkipTake(filters),
      }),
      this.db.item.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<ItemWithCategory | null> {
    return this.db.item.findFirst({ where: { id, deletedAt: null }, include: withCategory });
  }

  create(data: Prisma.ItemUncheckedCreateInput): Promise<Item> {
    return this.db.item.create({ data });
  }

  update(id: string, data: Prisma.ItemUncheckedUpdateInput): Promise<Item> {
    return this.db.item.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Item> {
    return this.db.item.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
