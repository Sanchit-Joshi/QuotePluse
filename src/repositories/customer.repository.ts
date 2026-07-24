import type { Customer, Prisma, PrismaClient } from "@/generated/prisma/client";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export interface CustomerListFilters extends PageParams {
  search?: string;
}

export class CustomerRepository {
  constructor(private readonly db: PrismaClient) {}

  private whereActive(search?: string): Prisma.CustomerWhereInput {
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

  async list(filters: CustomerListFilters): Promise<PageResult<Customer>> {
    const where = this.whereActive(filters.search);
    const [items, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        orderBy: { name: "asc" },
        ...paginationToSkipTake(filters),
      }),
      this.db.customer.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<Customer | null> {
    return this.db.customer.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.db.customer.create({ data });
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.db.customer.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Customer> {
    return this.db.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countReferences(id: string): Promise<number> {
    return this.db.quotation
      .count({ where: { customerId: id } })
      .then(async (qCount) => qCount + (await this.db.invoice.count({ where: { customerId: id } })));
  }
}
