import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DocumentType, NumberingResetRule } from "@/generated/prisma/enums";
import { NotFoundError } from "@/lib/errors";

type Db = PrismaClient | Prisma.TransactionClient;

interface SequenceRow {
  id: string;
  prefix: string;
  nextNumber: number;
  resetRule: NumberingResetRule;
  lastResetYear: number | null;
}

/** India's financial year runs Apr 1 - Mar 31; FY "label year" is the starting calendar year. */
function financialYearOf(date: Date): number {
  return date.getMonth() >= 3 /* April = index 3 */ ? date.getFullYear() : date.getFullYear() - 1;
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * Allocates the next document number transactionally (ADR-006): the row is
 * locked with SELECT ... FOR UPDATE so two concurrent finalize calls can
 * never receive the same number. If the surrounding transaction later rolls
 * back, the allocated number is simply never used again (an acceptable gap,
 * not a duplicate).
 *
 * MUST be called with a transaction client so number allocation and the
 * document write that consumes it commit or roll back together.
 */
export class NumberingService {
  async nextNumber(
    tx: Db,
    companyId: string,
    documentType: DocumentType,
    now: Date = new Date(),
  ): Promise<string> {
    const rows = await tx.$queryRaw<SequenceRow[]>`
      SELECT id, prefix, "nextNumber", "resetRule", "lastResetYear"
      FROM numbering_sequences
      WHERE "companyId" = ${companyId} AND "documentType" = ${documentType}::"DocumentType"
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundError("NumberingSequence", `${companyId}:${documentType}`);
    }

    const currentPeriod =
      row.resetRule === NumberingResetRule.FINANCIAL_YEAR ? financialYearOf(now) : now.getFullYear();

    const needsReset =
      row.resetRule !== NumberingResetRule.NEVER &&
      row.lastResetYear !== null &&
      row.lastResetYear !== currentPeriod;
    const isFirstRun = row.lastResetYear === null && row.resetRule !== NumberingResetRule.NEVER;

    const allocated = needsReset || isFirstRun ? 1 : row.nextNumber;

    await tx.numberingSequence.update({
      where: { id: row.id },
      data: {
        nextNumber: allocated + 1,
        lastResetYear: row.resetRule === NumberingResetRule.NEVER ? null : currentPeriod,
      },
    });

    const yearLabel =
      row.resetRule === NumberingResetRule.FINANCIAL_YEAR
        ? `${currentPeriod}-${(currentPeriod + 1).toString().slice(-2)}`
        : String(currentPeriod);

    return `${row.prefix}-${yearLabel}-${pad(allocated)}`;
  }
}

export const numberingService = new NumberingService();
export { DocumentType };
