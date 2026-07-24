import type { NumberingSequence, PrismaClient } from "@/generated/prisma/client";
import type { DocumentType, NumberingResetRule } from "@/generated/prisma/enums";

export class NumberingSequenceRepository {
  constructor(private readonly db: PrismaClient) {}

  list(companyId: string): Promise<NumberingSequence[]> {
    return this.db.numberingSequence.findMany({ where: { companyId } });
  }

  update(
    companyId: string,
    documentType: DocumentType,
    data: { prefix?: string; nextNumber?: number; resetRule?: NumberingResetRule },
  ): Promise<NumberingSequence> {
    return this.db.numberingSequence.update({
      where: { companyId_documentType: { companyId, documentType } },
      data,
    });
  }
}
