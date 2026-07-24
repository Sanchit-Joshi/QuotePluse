import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { QuotationStatus } from "@/generated/prisma/enums";
import { paginationToSkipTake, type PageParams, type PageResult } from "@/lib/pagination";

export const quotationDetailInclude = {
  customer: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.QuotationInclude;

export type QuotationDetail = Prisma.QuotationGetPayload<{ include: typeof quotationDetailInclude }>;
export type QuotationListRow = Prisma.QuotationGetPayload<{ include: { customer: true } }>;

export interface QuotationListFilters extends PageParams {
  status?: QuotationStatus;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class QuotationRepository {
  constructor(private readonly db: PrismaClient) {}

  private buildWhere(filters: QuotationListFilters): Prisma.QuotationWhereInput {
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

  async list(filters: QuotationListFilters): Promise<PageResult<QuotationListRow>> {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.db.quotation.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(filters),
      }),
      this.db.quotation.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  findById(id: string): Promise<QuotationDetail | null> {
    return this.db.quotation.findUnique({ where: { id }, include: quotationDetailInclude });
  }

  findByIdOrThrow(id: string): Promise<QuotationDetail> {
    return this.db.quotation.findUniqueOrThrow({ where: { id }, include: quotationDetailInclude });
  }

  versions(quotationId: string) {
    return this.db.quotationVersion.findMany({
      where: { quotationId },
      orderBy: { versionNumber: "desc" },
    });
  }
}
