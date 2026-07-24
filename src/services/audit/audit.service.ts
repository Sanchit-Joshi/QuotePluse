import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import { logger } from "@/lib/logger";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Persists audit events to the AuditLog table (security.md §Logging) and
 * mirrors them to the structured logger. Single-user MVP always records
 * actor "system" — swap in the authenticated user id once auth ships.
 */
export class AuditService {
  async record(
    db: Db,
    entry: {
      entityType: AuditEntityType;
      entityId: string;
      action: AuditAction;
      metadata?: Record<string, unknown>;
      actor?: string;
    },
  ): Promise<void> {
    await db.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        actor: entry.actor ?? "system",
      },
    });
    logger.audit({ ...entry });
  }
}

export const auditService = new AuditService();
