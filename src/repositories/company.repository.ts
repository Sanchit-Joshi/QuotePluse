import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DocumentType } from "@/generated/prisma/enums";

export type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: { bankDetail: true; numberingSequences: true };
}>;

const DEFAULT_COMPANY_NAME = "Your Company";

const DEFAULT_SEQUENCE_PREFIXES: Record<DocumentType, string> = {
  [DocumentType.QUOTATION]: "QTN",
  [DocumentType.INVOICE]: "INV",
  [DocumentType.PURCHASE_ORDER]: "PO",
};

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
    if (existing) return this.backfillMissingSequences(existing);

    return this.db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: DEFAULT_COMPANY_NAME,
          addressLine1: "Add your company address in Settings",
          state: "State",
        },
      });
      await tx.numberingSequence.createMany({
        data: Object.entries(DEFAULT_SEQUENCE_PREFIXES).map(([documentType, prefix]) => ({
          companyId: company.id,
          documentType: documentType as DocumentType,
          prefix,
        })),
      });
      const withRelations = await tx.company.findUniqueOrThrow({
        where: { id: company.id },
        include: { bankDetail: true, numberingSequences: true },
      });
      return withRelations;
    });
  }

  /**
   * Existing companies only have the numbering sequences that existed when
   * they were created — a document type added later (e.g. PURCHASE_ORDER)
   * never gets seeded for them automatically, and would otherwise 404 the
   * first time `numberingService.nextNumber()` looks for it. Self-heals by
   * creating whatever's missing, rather than requiring a one-off data
   * migration every time a new document type ships.
   */
  private async backfillMissingSequences(company: CompanyWithRelations): Promise<CompanyWithRelations> {
    const present = new Set(company.numberingSequences.map((s) => s.documentType));
    const missing = Object.keys(DEFAULT_SEQUENCE_PREFIXES).filter(
      (documentType) => !present.has(documentType as DocumentType),
    ) as DocumentType[];
    if (missing.length === 0) return company;

    await this.db.numberingSequence.createMany({
      data: missing.map((documentType) => ({
        companyId: company.id,
        documentType,
        prefix: DEFAULT_SEQUENCE_PREFIXES[documentType],
      })),
    });
    return this.db.company.findUniqueOrThrow({
      where: { id: company.id },
      include: { bankDetail: true, numberingSequences: true },
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
