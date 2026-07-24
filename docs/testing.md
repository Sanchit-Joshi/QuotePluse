# Testing

## Strategy
Per [non-functional-requirements.md](non-functional-requirements.md), coverage is concentrated on **business logic** — the totals/tax calculator, the numbering allocator, and the Quotation/Invoice state machines — rather than spread evenly across every file. A rounding bug in the GST engine or a duplicate invoice number is a severe, silent failure mode; a missed CSS class is not.

## Test Types

### Unit tests (Vitest)
Pure, no I/O — mocked collaborators where a dependency exists.
- `src/services/totals/__tests__/totals-calculator.test.ts` — CGST/SGST vs IGST split, per-line and document-level discounts, integer-only arithmetic, rounding-adjustment reconciliation, empty-cart edge case. **This is the single most important test file in the repo.**
- `src/lib/__tests__/money.test.ts` — rupee/paise conversion, Indian-numbering (lakh/crore) amount-in-words.
- `src/lib/__tests__/rate-limit.test.ts` — per-IP token bucket behavior.
- `src/services/numbering/__tests__/numbering.service.test.ts` — sequential allocation, YEARLY/FINANCIAL_YEAR reset boundaries, label formatting — with a hand-rolled fake `$queryRaw`/`update` transaction client (no real DB needed).
- `src/validators/__tests__/*.schema.test.ts` — Zod schema boundary cases (GSTIN/IFSC format, negative/zero quantities, percent ranges) for customer, item, document, and company schemas.

### Integration tests (Vitest, against the real local PostgreSQL)
Exercise a service class directly against the actual Prisma client and the dev database (the same one `docker-compose` or local Postgres provides), not mocks — because the behavior under test (transactional numbering, immutability after CANCELLED, version snapshots) only means something with a real transactional database underneath.
- `src/services/quotation/__tests__/quotation.service.test.ts` — full DRAFT → SENT → APPROVED/CANCELLED/CONVERTED lifecycle, number allocation, version snapshots, immutability after cancel, duplicate, convert-to-invoice.
- `src/services/invoice/__tests__/invoice.service.test.ts` — DRAFT → PENDING → PAID/CANCELLED lifecycle, paidDate requirement, duplicate, version snapshots on edit.
- `src/services/customer/__tests__/customer.service.test.ts`, `src/services/item/__tests__/item.service.test.ts` — CRUD, empty-string-to-null normalization, archive-not-hard-delete.
- `src/services/company/__tests__/company.service.test.ts` — singleton company creation, numbering-sequence seeding.
- `src/services/dashboard/__tests__/dashboard.service.test.ts` — status aggregation and recent-documents ordering.

Each integration test file creates its own throwaway `Customer`/`Quotation`/`Invoice` rows and deletes them in `afterAll` — tests do not depend on or leave behind fixture data.

### End-to-end tests (Playwright)
`e2e/quotation-golden-path.spec.ts` drives the actual running app in a real browser: create a customer via the API, fill the quotation form in the UI (customer combobox, line item, live totals), save & finalize, then verify the `/api/quotations/:id/pdf` endpoint returns real, well-formed PDF bytes and the preview route renders. This is the one test that exercises the full stack unit/integration tests can't reach: the Base UI combobox interaction, the React Hook Form line-item editor, the Next.js route handlers, and the actual Playwright-driven PDF render.

Run with `npm run test:e2e` (starts/reuses the dev server per `playwright.config.ts`).

### Component tests
Not present as a separate suite in this pass — the E2E test above already exercises the highest-value interactive component (the line-item editor + totals preview) against real user input. Adding React Testing Library component tests for presentational-only components (badges, empty states) was judged lower value than the integration/E2E coverage given the time budget; see [known-limitations.md](known-limitations.md).

## Running Tests
```bash
npm run test            # vitest, single run
npm run test:watch      # vitest, watch mode
npm run test:coverage   # vitest with v8 coverage report (text + html + lcov)
npm run test:e2e        # playwright end-to-end suite
```

## Coverage (last measured)
```
Statements   : 73.86%
Branches     : 52.61%
Functions    : 74.28%
Lines        : 75.99%
```
Business-logic-critical files are near or above the 90% target:
- `totals-calculator.ts` — fully covered by design-of-experiment style cases (intra/inter-state, discounts, rounding, empty cart).
- `numbering.service.ts` — 92.85%.
- `quotation.service.ts` — 89.41%, 98.66% line coverage.
- `invoice.service.ts` — 82.66%.

**Known gaps, and why they're accepted for this MVP pass:**
- `services/pdf/*` (0%) — requires a real Playwright browser + a running Next.js server; covered instead by the E2E test's assertion on real PDF bytes, which is a stronger guarantee than a mocked unit test would provide.
- `lib/api-client.ts`, `lib/api-response.ts` (0%) — thin, framework-adjacent plumbing (fetch wrapper, error-mapping middleware) exercised indirectly by every integration/E2E test that hits a route; not independently unit-tested this pass.
- `lib/utils.ts` (`cn()` helper) — a one-line `clsx`/`tailwind-merge` wrapper, not worth a dedicated test.

## Manual Test Checklist
Performed via live browser testing during development (see also [known-limitations.md](known-limitations.md)):
- [x] Create customer → appears in list, editable, archivable.
- [x] Create product/item → appears in catalog, usable in line-item picker.
- [x] Create quotation, add catalog + ad-hoc line items, live totals update correctly (CGST/SGST for intra-state, IGST for inter-state).
- [x] Save as draft (no number), reload, edit again.
- [x] Finalize quotation → number allocated (`QTN-YYYY-NNNN`), status SENT.
- [x] Preview renders the exact same content as the PDF.
- [x] Download PDF → valid `%PDF-` binary, correct content-type.
- [x] Approve quotation → convert to invoice → new draft invoice with identical line items and totals.
- [x] Finalize invoice → number allocated (`INV-YYYY-NNNN`), status PENDING.
- [x] Mark invoice PAID with a paid date → status PAID.
- [x] Dashboard reflects correct counts/amounts and recent-documents list after all of the above.
- [x] Settings: company profile + bank details save and are reflected in the PDF; numbering prefix/reset-rule editable.
- [x] Dark/light theme toggle persists across reload.
- [x] Mobile viewport: sidebar collapses into a Sheet, forms remain usable.

## Regression Checklist (run before every release)
1. `npm run lint` — zero errors.
2. `npm run typecheck` — zero errors.
3. `npm run test` — all unit/integration tests pass.
4. `npm run test:e2e` — golden path passes.
5. `npm run build` — production build succeeds with no bundler warnings about `react-dom/server` (see ADR-007) or missing environment variables.
6. Manually verify one quotation and one invoice PDF against the current template — layout regressions are the failure mode automated tests are least likely to catch.
