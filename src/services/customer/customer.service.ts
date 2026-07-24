import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { emptyToUndefined } from "@/lib/normalize";
import { CustomerRepository, type CustomerListFilters } from "@/repositories/customer.repository";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import type { CustomerInput, CustomerUpdateInput } from "@/validators/customer.schema";

const repo = new CustomerRepository(prisma);
const OPTIONAL_TEXT_FIELDS = [
  "gstin",
  "shippingAddress",
  "phone",
  "email",
  "referenceCode",
  "notes",
] as const;

export class CustomerService {
  list(filters: CustomerListFilters) {
    return repo.list(filters);
  }

  async getOrThrow(id: string) {
    const customer = await repo.findById(id);
    if (!customer) throw new NotFoundError("Customer", id);
    return customer;
  }

  async create(input: CustomerInput) {
    const customer = await repo.create(emptyToUndefined(input, OPTIONAL_TEXT_FIELDS));
    await auditService.record(prisma, {
      entityType: AuditEntityType.CUSTOMER,
      entityId: customer.id,
      action: AuditAction.CREATE,
      metadata: { name: customer.name },
    });
    return customer;
  }

  async update(id: string, input: CustomerUpdateInput) {
    await this.getOrThrow(id);
    const customer = await repo.update(id, emptyToUndefined(input, OPTIONAL_TEXT_FIELDS));
    await auditService.record(prisma, {
      entityType: AuditEntityType.CUSTOMER,
      entityId: id,
      action: AuditAction.UPDATE,
    });
    return customer;
  }

  /**
   * Customers are never hard-deleted (FR-1.4) — archiving is always allowed,
   * even when referenced by quotations/invoices, since those documents keep
   * their own denormalized snapshot data and don't depend on the live
   * Customer row remaining active.
   */
  async archive(id: string) {
    await this.getOrThrow(id);
    const customer = await repo.softDelete(id);
    await auditService.record(prisma, {
      entityType: AuditEntityType.CUSTOMER,
      entityId: id,
      action: AuditAction.DELETE,
    });
    return customer;
  }
}

export const customerService = new CustomerService();
