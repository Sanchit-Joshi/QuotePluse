import type { Item, Prisma, PrismaClient } from "@/generated/prisma/client";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export interface ItemListFilters extends PageParams {
  search?: string;
}

export class ItemRepository {
  constructor(private readonly db: PrismaClient) {}

  private whereActive(search?: string): Prisma.ItemWhereInput {
    return {
      deletedAt: null,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { hsnSac: { contains: search, mode: "insensitive" } }] }
        : {}),
    };
  }

  async list(filters: ItemListFilters): Promise<PageResult<Item>> {
    const where = this.whereActive(filters.search);
    const [items, total] = await Promise.all([
      this.db.item.findMany({ where, orderBy: { name: "asc" }, ...paginationToSkipTake(filters) }),
      this.db.item.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<Item | null> {
    return this.db.item.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.ItemCreateInput): Promise<Item> {
    return this.db.item.create({ data });
  }

  update(id: string, data: Prisma.ItemUpdateInput): Promise<Item> {
    return this.db.item.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Item> {
    return this.db.item.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
