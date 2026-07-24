import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { ItemRepository, type ItemListFilters } from "@/repositories/item.repository";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import type { ItemInput, ItemUpdateInput } from "@/validators/item.schema";

const repo = new ItemRepository(prisma);

export class ItemService {
  list(filters: ItemListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string) {
    const item = await repo.findById(id);
    if (!item) throw new NotFoundError("Item", id);
    return item;
  }

  async create(input: ItemInput) {
    const item = await repo.create(input);
    await auditService.record(prisma, {
      entityType: AuditEntityType.ITEM,
      entityId: item.id,
      action: AuditAction.CREATE,
      metadata: { name: item.name },
    });
    return item;
  }

  async update(id: string, input: ItemUpdateInput) {
    await this.getOrThrow(id);
    const item = await repo.update(id, input);
    await auditService.record(prisma, {
      entityType: AuditEntityType.ITEM,
      entityId: id,
      action: AuditAction.UPDATE,
    });
    return item;
  }

  async archive(id: string) {
    await this.getOrThrow(id);
    const item = await repo.softDelete(id);
    await auditService.record(prisma, {
      entityType: AuditEntityType.ITEM,
      entityId: id,
      action: AuditAction.DELETE,
    });
    return item;
  }
}

export const itemService = new ItemService();
