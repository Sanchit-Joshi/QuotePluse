import type { Browser } from "playwright";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-size:8px;color:#666;text-align:center;padding:0 36px;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>
`;

/**
 * Generates PDFs by having Playwright navigate to the app's own in-app
 * preview route and printing that live page — rather than rendering HTML
 * out-of-band via react-dom/server, which Next.js's App Router disallows
 * for code reachable from a Route Handler ("You're importing a component
 * that imports react-dom/server..."). This also guarantees true WYSIWYG:
 * the PDF is a print of the exact page the user already previewed
 * (FR-6.1/FR-6.3). The preview layout hides all app chrome (sidebar,
 * header, toolbar) under `print:hidden` so only DocumentTemplate renders.
 */
export class PdfService {
  async generateQuotationPdf(id: string): Promise<Buffer> {
    return this.generate("QUOTATION", id, `/quotations/${id}/preview`);
  }

  async generateInvoicePdf(id: string): Promise<Buffer> {
    return this.generate("INVOICE", id, `/invoices/${id}/preview`);
  }

  private async generate(
    documentType: "QUOTATION" | "INVOICE",
    id: string,
    path: string,
  ): Promise<Buffer> {
    const start = Date.now();
    try {
      const buffer = await this.renderPdf(path);
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

  private async renderPdf(path: string): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${appUrl()}${path}`, { waitUntil: "networkidle" });
      if (response?.status() === 404) {
        throw new NotFoundError("Document", path);
      }
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "14mm", left: "0mm", right: "0mm" },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: FOOTER_TEMPLATE,
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }
}

export const pdfService = new PdfService();
