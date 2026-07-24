import { prisma } from "@/lib/prisma";

/**
 * Aggregates dashboard summary data (FR-9): status counts/amounts for the
 * requested period plus the most recently touched documents. Reads directly
 * via Prisma group-by rather than a repository since this is a read-only
 * cross-entity aggregation, not part of either entity's own lifecycle.
 */
export class DashboardService {
  async summary(period: "month" | "quarter") {
    const now = new Date();
    const monthsBack = period === "quarter" ? 3 : 1;
    const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    const [quotationGroups, invoiceGroups, recentQuotations, recentInvoices] = await Promise.all([
      prisma.quotation.groupBy({
        by: ["status"],
        where: { issueDate: { gte: periodStart } },
        _count: { _all: true },
        _sum: { grandTotalPaise: true },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { issueDate: { gte: periodStart } },
        _count: { _all: true },
        _sum: { grandTotalPaise: true },
      }),
      prisma.quotation.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { customer: true },
      }),
      prisma.invoice.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { customer: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    const amounts: Record<string, number> = {};
    for (const g of [...quotationGroups, ...invoiceGroups]) {
      counts[g.status] = (counts[g.status] ?? 0) + g._count._all;
      amounts[g.status] = (amounts[g.status] ?? 0) + (g._sum.grandTotalPaise ?? 0);
    }

    const recent = [
      ...recentQuotations.map((q) => ({ type: "QUOTATION" as const, ...q })),
      ...recentInvoices.map((i) => ({ type: "INVOICE" as const, ...i })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 8);

    return { counts, amounts, recent };
  }
}

export const dashboardService = new DashboardService();
