import { prisma } from "@/lib/prisma";
import { CompanyRepository } from "@/repositories/company.repository";
import { NumberingSequenceRepository } from "@/repositories/numbering-sequence.repository";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType, type DocumentType } from "@/generated/prisma/enums";
import type { CompanyInput, NumberingUpdateInput } from "@/validators/company.schema";

const companyRepo = new CompanyRepository(prisma);
const numberingRepo = new NumberingSequenceRepository(prisma);

export class CompanyService {
  getProfile() {
    return companyRepo.getOrCreateSingleton();
  }

  async updateProfile(input: CompanyInput & { logoUrl?: string; signatureUrl?: string }) {
    const company = await companyRepo.getOrCreateSingleton();
    const updated = await companyRepo.update(company.id, {
      name: input.name,
      gstin: input.gstin,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      state: input.state,
      signatoryName: input.signatoryName,
      logoUrl: input.logoUrl,
      signatureUrl: input.signatureUrl,
      bankDetail: input.bankDetail,
    });
    await auditService.record(prisma, {
      entityType: AuditEntityType.SETTINGS,
      entityId: company.id,
      action: AuditAction.UPDATE,
      metadata: { section: "company" },
    });
    return updated;
  }

  async listNumbering() {
    const company = await companyRepo.getOrCreateSingleton();
    return numberingRepo.list(company.id);
  }

  async updateNumbering(documentType: DocumentType, input: NumberingUpdateInput) {
    const company = await companyRepo.getOrCreateSingleton();
    const updated = await numberingRepo.update(company.id, documentType, input);
    await auditService.record(prisma, {
      entityType: AuditEntityType.SETTINGS,
      entityId: company.id,
      action: AuditAction.UPDATE,
      metadata: { section: "numbering", documentType },
    });
    return updated;
  }
}

export const companyService = new CompanyService();
