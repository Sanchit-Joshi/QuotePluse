import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DocumentType } from "@/generated/prisma/enums";

export type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: { bankDetail: true; numberingSequences: true };
}>;

const DEFAULT_COMPANY_NAME = "Your Company";

/**
 * Company is a singleton in MVP (ADR-003/future-roadmap multi-company).
 * getOrCreateSingleton guarantees callers always have a Company row to
 * attach numbering sequences / bank details to, without a separate
 * onboarding-wizard step blocking quotation creation.
 */
export class CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  async getOrCreateSingleton(): Promise<CompanyWithRelations> {
    const existing = await this.db.company.findFirst({
      include: { bankDetail: true, numberingSequences: true },
    });
    if (existing) return existing;

    return this.db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: DEFAULT_COMPANY_NAME,
          addressLine1: "Add your company address in Settings",
          state: "State",
        },
      });
      await tx.numberingSequence.createMany({
        data: [
          { companyId: company.id, documentType: DocumentType.QUOTATION, prefix: "QTN" },
          { companyId: company.id, documentType: DocumentType.INVOICE, prefix: "INV" },
        ],
      });
      const withRelations = await tx.company.findUniqueOrThrow({
        where: { id: company.id },
        include: { bankDetail: true, numberingSequences: true },
      });
      return withRelations;
    });
  }

  async update(
    id: string,
    data: Prisma.CompanyUpdateInput & { bankDetail?: Prisma.BankDetailUncheckedCreateWithoutCompanyInput },
  ): Promise<CompanyWithRelations> {
    const { bankDetail, ...companyData } = data;
    return this.db.$transaction(async (tx) => {
      await tx.company.update({ where: { id }, data: companyData });
      if (bankDetail) {
        await tx.bankDetail.upsert({
          where: { companyId: id },
          create: { companyId: id, ...bankDetail },
          update: bankDetail,
        });
      }
      return tx.company.findUniqueOrThrow({
        where: { id },
        include: { bankDetail: true, numberingSequences: true },
      });
    });
  }
}
