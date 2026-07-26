import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PurchaseOrderStatus } from "@/generated/prisma/enums";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export const purchaseOrderDetailInclude = {
  vendor: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderDetail = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderDetailInclude;
}>;
export type PurchaseOrderListRow = Prisma.PurchaseOrderGetPayload<{ include: { vendor: true } }>;

export interface PurchaseOrderListFilters extends PageParams {
  status?: PurchaseOrderStatus;
  vendorId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class PurchaseOrderRepository {
  constructor(private readonly db: PrismaClient) {}

  private buildWhere(filters: PurchaseOrderListFilters): Prisma.PurchaseOrderWhereInput {
    return {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            issueDate: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { number: { contains: filters.search, mode: "insensitive" } },
              { vendor: { name: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  async list(filters: PurchaseOrderListFilters): Promise<PageResult<PurchaseOrderListRow>> {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.db.purchaseOrder.findMany({
        where,
        include: { vendor: true },
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(filters),
      }),
      this.db.purchaseOrder.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<PurchaseOrderDetail | null> {
    return this.db.purchaseOrder.findUnique({ where: { id }, include: purchaseOrderDetailInclude });
  }

  findByIdOrThrow(id: string): Promise<PurchaseOrderDetail> {
    return this.db.purchaseOrder.findUniqueOrThrow({ where: { id }, include: purchaseOrderDetailInclude });
  }

  versions(purchaseOrderId: string) {
    return this.db.purchaseOrderVersion.findMany({
      where: { purchaseOrderId },
      orderBy: { versionNumber: "desc" },
    });
  }
}
