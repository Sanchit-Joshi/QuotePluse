import type { Vendor, Prisma, PrismaClient } from "@/generated/prisma/client";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export interface VendorListFilters extends PageParams {
  search?: string;
}

export class VendorRepository {
  constructor(private readonly db: PrismaClient) {}

  private whereActive(search?: string): Prisma.VendorWhereInput {
    return {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { gstin: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  async list(filters: VendorListFilters): Promise<PageResult<Vendor>> {
    const where = this.whereActive(filters.search);
    const [items, total] = await Promise.all([
      this.db.vendor.findMany({
        where,
        orderBy: { name: "asc" },
        ...paginationToSkipTake(filters),
      }),
      this.db.vendor.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<Vendor | null> {
    return this.db.vendor.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.VendorCreateInput): Promise<Vendor> {
    return this.db.vendor.create({ data });
  }

  update(id: string, data: Prisma.VendorUpdateInput): Promise<Vendor> {
    return this.db.vendor.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Vendor> {
    return this.db.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countReferences(id: string): Promise<number> {
    return this.db.purchaseOrder.count({ where: { vendorId: id } });
  }
}
