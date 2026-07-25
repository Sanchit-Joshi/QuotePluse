import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
import { CategoryRepository } from "@/repositories/category.repository";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import type { CategoryInput } from "@/validators/category.schema";

const repo = new CategoryRepository(prisma);

export class CategoryService {
  list() {
    return repo.list();
  }

  async create(input: CategoryInput) {
    const existing = await repo.findByName(input.name);
    if (existing) {
      throw new ConflictError(`A category named "${input.name}" already exists`);
    }
    const category = await repo.create(input.name);
    await auditService.record(prisma, {
      entityType: AuditEntityType.CATEGORY,
      entityId: category.id,
      action: AuditAction.CREATE,
      metadata: { name: category.name },
    });
    return category;
  }
}

export const categoryService = new CategoryService();
