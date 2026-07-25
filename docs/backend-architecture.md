# Backend Architecture

## Layering (Clean Architecture)
```
route handler (app/api/**/route.ts)
  -> validates input with Zod, maps HTTP <-> DTO
  -> calls a Service (framework-agnostic, pure business logic)
     -> Service depends on Repository INTERFACES, not Prisma directly
        -> Repository implementation (Prisma) depends on the DB
```
Services never import `next/server` or anything Next.js-specific — they take/return plain DTOs/entities, which is what makes them independently unit-testable and portable off Next.js later if needed.

## Directory Layout
```
src/
  services/
    quotation/
      QuotationService.ts        # createDraft, finalize, duplicate, convertToInvoice, addVersion
      TotalsCalculator.ts        # pure function(s): line items -> totals breakdown
    numbering/
      NumberingService.ts        # nextNumber(documentType) — transactional
    pdf/
      PdfService.ts              # render(documentId) -> Buffer, using templates/
  repositories/
    interfaces/
      QuotationRepository.ts     # interface only
      InvoiceRepository.ts
      CustomerRepository.ts
      ItemRepository.ts
    prisma/
      PrismaQuotationRepository.ts   # implements QuotationRepository
      ...
  database/
    prisma/schema.prisma
    seed.ts
  app/api/
    customers/route.ts, [id]/route.ts
    items/route.ts, [id]/route.ts
    categories/route.ts
    quotations/route.ts, [id]/route.ts, [id]/pdf/route.ts, [id]/convert/route.ts
    invoices/route.ts, [id]/route.ts, [id]/pdf/route.ts
    settings/company/route.ts, settings/numbering/route.ts
    health/route.ts
```

## Core Services

### TotalsCalculator (pure, no I/O)
Input: line items (qty, unitPricePaise, discountPct, gstRate), document-level discount, company state, customer state.
Output: `{ subtotalPaise, discountPaise, taxableValuePaise, cgstPaise, sgstPaise, igstPaise, grandTotalPaise, roundingAdjustmentPaise, amountInWords }`.
Logic: intra-state (company.state === customer.state) → CGST+SGST split in half; inter-state → IGST full rate. All arithmetic in integer paise; final rupee rounding produces an explicit `roundingAdjustmentPaise` line rather than silently absorbing the difference (FR-5.5).
100% unit-test coverage target — this is the single most important correctness surface in the app.

### NumberingService
`nextNumber(documentType: 'QUOTATION' | 'INVOICE'): Promise<string>` — runs inside the caller's Prisma transaction: `SELECT ... FOR UPDATE` on the `NumberingSequence` row, increments `nextNumber`, applies `resetRule` (yearly/financial-year resets counter to 1 and bumps `lastResetYear`), returns formatted string (`${prefix}-${year}-${padded(nextNumber)}`). See ADR-006 for the gap-vs-duplicate tradeoff.

### QuotationService / InvoiceService
Encapsulate the state machine (FR-3.3/FR-4.2): which status transitions are legal, when a version snapshot is written (FR-3.7), what `convertToInvoice` copies. Route handlers never mutate status directly — always through a service method that enforces the transition rules.

### PdfService
Uses Playwright (headless Chromium) to navigate to the app's own live preview route (`/quotations/:id/preview` or `/invoices/:id/preview`, rendered server-side by `DocumentTemplate`) and prints that real page to a PDF buffer, with fixed page size (A4) and margins matching the template's CSS. See ADR-007 (decision-log.md): Next.js's App Router disallows `react-dom/server` in code reachable from a Route Handler, so PdfService cannot render the template out-of-band — printing the live page instead also strengthens the WYSIWYG guarantee, since the PDF is a print of the exact page the user already previewed. App chrome (sidebar/header/toolbar) is hidden in print media via `print:hidden`. Logs every generation attempt (id, durationMs, success) to the structured logger (audit + pdf-generation log categories, see [security.md](security.md)).

## Error Handling Contract
- Domain errors are typed (`ValidationError`, `NotFoundError`, `ConflictError`, `ImmutableDocumentError`) thrown by services.
- A shared route-handler wrapper (`withErrorHandling`) catches these and maps to HTTP status codes (400/404/409/422) with a consistent JSON error shape: `{ error: { code, message, fields? } }`. Unexpected errors map to 500 and are logged with full stack server-side but return a generic message to the client (no stack leakage).

## Transactions
Any operation that both allocates a number and persists a document (finalize, duplicate-then-finalize) runs inside a single `prisma.$transaction`. Version snapshot writes happen in the same transaction as the edit they capture.

## Caching
- No server-side response caching for mutable list endpoints (always fresh reads) — correctness over micro-performance for a low-traffic single-user app.
- Static settings (company profile) cached client-side via TanStack Query with manual invalidation on settings mutation.
