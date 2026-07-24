import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export const invoiceDetailInclude = {
  customer: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceDetail = Prisma.InvoiceGetPayload<{ include: typeof invoiceDetailInclude }>;
export type InvoiceListRow = Prisma.InvoiceGetPayload<{ include: { customer: true } }>;

export interface InvoiceListFilters extends PageParams {
  status?: InvoiceStatus;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class InvoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  private buildWhere(filters: InvoiceListFilters): Prisma.InvoiceWhereInput {
    return {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
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
              { customer: { name: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  async list(filters: InvoiceListFilters): Promise<PageResult<InvoiceListRow>> {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(filters),
      }),
      this.db.invoice.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<InvoiceDetail | null> {
    return this.db.invoice.findUnique({ where: { id }, include: invoiceDetailInclude });
  }

  findByIdOrThrow(id: string): Promise<InvoiceDetail> {
    return this.db.invoice.findUniqueOrThrow({ where: { id }, include: invoiceDetailInclude });
  }

  versions(invoiceId: string) {
    return this.db.invoiceVersion.findMany({
      where: { invoiceId },
      orderBy: { versionNumber: "desc" },
    });
  }
}
