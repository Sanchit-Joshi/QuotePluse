import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { emptyToUndefined } from "@/lib/normalize";
import { VendorRepository, type VendorListFilters } from "@/repositories/vendor.repository";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import type { VendorInput, VendorUpdateInput } from "@/validators/vendor.schema";

const repo = new VendorRepository(prisma);
const OPTIONAL_TEXT_FIELDS = ["gstin", "phone", "email", "notes"] as const;

export class VendorService {
  list(filters: VendorListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string) {
    const vendor = await repo.findById(id);
    if (!vendor) throw new NotFoundError("Vendor", id);
    return vendor;
  }

  async create(input: VendorInput) {
    const vendor = await repo.create(emptyToUndefined(input, OPTIONAL_TEXT_FIELDS));
    await auditService.record(prisma, {
      entityType: AuditEntityType.VENDOR,
      entityId: vendor.id,
      action: AuditAction.CREATE,
      metadata: { name: vendor.name },
    });
    return vendor;
  }

  async update(id: string, input: VendorUpdateInput) {
    await this.getOrThrow(id);
    const vendor = await repo.update(id, emptyToUndefined(input, OPTIONAL_TEXT_FIELDS));
    await auditService.record(prisma, {
      entityType: AuditEntityType.VENDOR,
      entityId: id,
      action: AuditAction.UPDATE,
    });
    return vendor;
  }

  /** Vendors are never hard-deleted, mirroring Customer (see CustomerService.archive). */
  async archive(id: string) {
    await this.getOrThrow(id);
    const vendor = await repo.softDelete(id);
    await auditService.record(prisma, {
      entityType: AuditEntityType.VENDOR,
      entityId: id,
      action: AuditAction.DELETE,
    });
    return vendor;
  }
}

export const vendorService = new VendorService();
