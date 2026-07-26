import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import { mapQuotationToPdfData, mapInvoiceToPdfData } from "@/services/pdf/document-pdf-mapper";
import { mapPurchaseOrderToPdfData } from "@/services/pdf/purchase-order-pdf-mapper";
import { DocumentPdfDocument } from "@/templates/document-pdf-react/DocumentPdfDocument";
import { PurchaseOrderPdfDocument } from "@/templates/purchase-order-pdf-react/PurchaseOrderPdfDocument";

/**
 * Serverless-friendly PDF engine that renders DocumentPdfData directly to a
 * PDF buffer with @react-pdf/renderer — no browser, no Chromium binary, no
 * cold-start extraction cost (the actual cause of PdfService's ~9-10s
 * warm-state render time, see ADR-015's own measurements). Deliberately kept
 * as a separate service/route pair from PdfService rather than merged in:
 * this is a temporary stand-in while hosted on Vercel, and the plan is to
 * revert to PdfService's browser-print path (true WYSIWYG of the live
 * preview page, FR-6.1/FR-6.3) once a non-serverless server is available —
 * see docs/decision-log.md.
 */
export class ReactPdfService {
  async generateQuotationPdf(id: string): Promise<Buffer> {
    return this.generate("QUOTATION", id, mapQuotationToPdfData);
  }

  async generateInvoicePdf(id: string): Promise<Buffer> {
    return this.generate("INVOICE", id, mapInvoiceToPdfData);
  }

  /**
   * Separate from `generate()` below: PurchaseOrderPdfData/PurchaseOrderPdfDocument
   * are a distinct shape from DocumentPdfData/DocumentPdfDocument (see
   * templates/purchase-order-pdf/types.ts), so it doesn't fit that method's
   * mapper-type union without genericizing it for a single caller — not
   * worth the abstraction for three total document types.
   */
  async generatePurchaseOrderPdf(id: string): Promise<Buffer> {
    const start = Date.now();
    try {
      const { data } = await mapPurchaseOrderToPdfData(id);
      const buffer = await renderToBuffer(PurchaseOrderPdfDocument({ data }));
      logger.pdf({ documentType: "PURCHASE_ORDER", id, durationMs: Date.now() - start, success: true });
      await auditService.record(prisma, {
        entityType: AuditEntityType.PURCHASE_ORDER,
        entityId: id,
        action: AuditAction.PDF_GENERATE,
      });
      return buffer;
    } catch (err) {
      logger.pdf({ documentType: "PURCHASE_ORDER", id, durationMs: Date.now() - start, success: false });
      throw err;
    }
  }

  private async generate(
    documentType: "QUOTATION" | "INVOICE",
    id: string,
    mapToPdfData: typeof mapQuotationToPdfData | typeof mapInvoiceToPdfData,
  ): Promise<Buffer> {
    const start = Date.now();
    try {
      const { data } = await mapToPdfData(id);
      const buffer = await renderToBuffer(DocumentPdfDocument({ data }));
      logger.pdf({ documentType, id, durationMs: Date.now() - start, success: true });
      await auditService.record(prisma, {
        entityType: documentType === "QUOTATION" ? AuditEntityType.QUOTATION : AuditEntityType.INVOICE,
        entityId: id,
        action: AuditAction.PDF_GENERATE,
      });
      return buffer;
    } catch (err) {
      logger.pdf({ documentType, id, durationMs: Date.now() - start, success: false });
      throw err;
    }
  }
}

export const reactPdfService = new ReactPdfService();
