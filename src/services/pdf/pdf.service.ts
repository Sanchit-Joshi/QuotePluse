import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auditService } from "@/services/audit/audit.service";
import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";

/**
 * Narrow structural interface covering only what PdfService actually calls.
 * `playwright` (full, used locally/Docker) and `playwright-core` (used on
 * Vercel, paired with @sparticuz/chromium's serverless binary) ship their
 * own nominally-incompatible `Browser`/`Page` types even though both are
 * structurally identical for this surface — this local type sidesteps that
 * clash instead of forcing one runtime's types onto the other.
 */
interface PdfBrowser {
  newPage(): Promise<PdfPage>;
}
interface PdfPage {
  goto(url: string, opts: { waitUntil: "networkidle" }): Promise<{ status(): number } | null>;
  pdf(opts: {
    format: string;
    printBackground: boolean;
    margin: { top: string; bottom: string; left: string; right: string };
    displayHeaderFooter: boolean;
    headerTemplate: string;
    footerTemplate: string;
  }): Promise<Uint8Array>;
  close(): Promise<void>;
}

let browserPromise: Promise<PdfBrowser> | null = null;

/**
 * Two Chromium sources, chosen at runtime:
 * - Serverless (Vercel, or any environment with VERCEL set): `@sparticuz/chromium`
 *   ships a Lambda/serverless-optimized Chromium binary and `playwright-core`
 *   (no bundled browser), keeping the function bundle within Vercel's size
 *   limits — the full `playwright` package's Chromium download does not fit.
 * - Everything else (local dev, Docker — see docs/docker.md): the full
 *   `playwright` package with its own downloaded Chromium, which is what
 *   `docker compose up --build` was actually verified against (ADR-008).
 *   `playwright-core` alone cannot find that browser (its own version
 *   resolves a different Chromium revision than the one bundled inside
 *   `playwright`), so the two paths are kept fully separate.
 */
async function getBrowser(): Promise<PdfBrowser> {
  if (!browserPromise) {
    browserPromise = process.env.VERCEL
      ? (async () => {
          const chromium = (await import("@sparticuz/chromium")).default;
          const { chromium: playwrightCore } = await import("playwright-core");
          return playwrightCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          }) as unknown as Promise<PdfBrowser>;
        })()
      : (async () => {
          const { chromium } = await import("playwright");
          return chromium.launch({ headless: true }) as unknown as Promise<PdfBrowser>;
        })();
  }
  return browserPromise;
}

function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  // VERCEL_URL is the per-deployment hash URL (e.g.
  // quotepluse-8mbn2kny4-xxx.vercel.app) — Vercel's Deployment Protection
  // gates *that* URL behind an SSO login wall even for production
  // deployments, which Playwright's own internal navigation hit directly
  // (confirmed via `vercel logs`: it landed on vercel.com/login). Only the
  // stable production alias is exempt from that wall, and
  // VERCEL_PROJECT_PRODUCTION_URL is the env var that always points there
  // regardless of which specific deployment is running — see ADR-016.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
