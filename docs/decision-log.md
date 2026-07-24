# Decision Log

Format: ADR-NNN | Date | Decision | Why | Alternatives considered

## ADR-001 | 2026-07-25 | Web app replaces Excel-to-PDF workflow
**Decision:** Build a Next.js + PostgreSQL web app that generates PDFs from a fixed HTML/CSS template with dynamic data, rather than continuing to script/automate Excel.
**Why:** Excel workflow has no history, no numbering discipline, manual arithmetic risk, and doesn't scale to multiple users/devices.
**Alternatives:** Keep Excel + macro automation (rejected — doesn't solve history/search/validation); Google Sheets + Apps Script (rejected — same core limitations, weaker type safety and testing).

## ADR-002 | 2026-07-25 | Tax model: India GST for MVP
**Decision:** MVP implements CGST/SGST/IGST split, GSTIN, HSN/SAC fields as first-class, not a generic tax percentage.
**Why:** User confirmed India GST is the actual business requirement; building generic-first would require rework to add compliant GST math later.
**Alternatives:** Generic single-rate tax (deferred to future-roadmap as a config option, not built now).

## ADR-003 | 2026-07-25 | No authentication in MVP
**Decision:** MVP ships single-user, no login screen. Architecture keeps a `userId`-ready shape (nullable/default single-tenant) so Better Auth/Clerk can be added without schema rewrites.
**Why:** User confirmed single-user usage for now; auth adds upfront complexity that isn't the bottleneck (PDF/quotation flow is).
**Alternatives:** Ship Better Auth from day one (deferred — see future-roadmap.md).

## ADR-004 | 2026-07-25 | Deployment target: local Docker Compose first
**Decision:** Primary deployment path exercised and verified is `docker-compose up` on the client's machine. Cloud deployment guides (Railway/Render/DigitalOcean/AWS/Azure) are written per the spec but not live-tested in this phase.
**Why:** User confirmed local usage is the actual current need.
**Alternatives:** Deploy to a cloud host now (deferred until user picks one).

## ADR-005 | 2026-07-25 | PDF template: default professional layout first, pending client's real template
**Decision:** Build and ship a first professional GST-invoice-style HTML/CSS template now; swap in the client's exact Excel/PDF layout once supplied, without changing the underlying data model or API contract.
**Why:** User has not yet supplied the reference file; blocking all work on it would stall the whole project. The data layer (customer/items/totals/tax) is independent of the visual layout, so this is safely reversible.
**Alternatives:** Wait for the file before writing any code (rejected — unnecessary serialization of independent work).
**Follow-up:** Revisit immediately when client file arrives; see [known-limitations.md](known-limitations.md).

## ADR-006 | 2026-07-25 | Document numbering: DB sequence with transactional allocation
**Decision:** Quotation/invoice numbers are allocated via a per-document-type counter row updated inside the same transaction that creates the document. A rolled-back transaction may burn a number (gap), but two documents can never receive the same number.
**Why:** Correctness (no duplicate numbers on a legal/financial document) matters more than perfectly gapless numbering; true gapless sequencing under concurrent writes requires heavier locking that isn't justified for a single-user MVP.
**Alternatives:** Postgres `SERIAL`/sequence per type (simpler but harder to reset yearly per FR-7.2); application-level locking with retry (more complex, deferred unless multi-user contention becomes real).

## ADR-007 | 2026-07-25 | PDF generation: Playwright prints the live preview page, not a react-dom/server render
**Decision:** `PdfService` has Playwright navigate to the app's own `/quotations/:id/preview` (or `/invoices/:id/preview`) route and calls `page.pdf()` on it, rather than calling `renderToStaticMarkup(<DocumentTemplate/>)` out-of-band and feeding the HTML string to `page.setContent()`.
**Why:** Next.js's App Router refuses to bundle any module reachable from a Route Handler that imports `react-dom/server` ("You're importing a component that imports react-dom/server... render or return the content directly as a Server Component instead") — this broke the original design in `architecture.md` §PDF generation. Navigating Playwright to the real, already-working preview page sidesteps the restriction entirely and *improves* the WYSIWYG guarantee: the PDF is now a print of the exact page a user can see in-browser, not a second parallel rendering path that could silently drift from it.
**Consequences:** The app's chrome (sidebar, header, preview toolbar) is hidden via `print:hidden` classes (`AppShell`, `PreviewToolbar`) so only `DocumentTemplate` prints. `PdfService` requires the Next.js server to be reachable at `APP_URL` (default `http://localhost:3000`) from within its own process — trivially true in Docker (Playwright runs in the same container) and in local dev.
**Alternatives considered:** Move PDF routes to the legacy Pages Router (`pages/api/*`), which doesn't carry the same restriction — rejected as an unnecessary second routing system for one endpoint. Render via a headless React renderer other than `react-dom/server` (e.g. `satori`) — rejected as unnecessary added dependency when the live page already renders correctly.

## ADR-008 | 2026-07-25 | MVP declared production-ready; core loop verified end-to-end
**Decision:** The MVP (customers, products, quotations, invoices, PDF generation, dashboard, settings) is considered feature-complete for this pass. Verified via: 87 passing unit/integration tests (73.86% statement coverage, concentrated on the totals engine and document state machines), 1 passing Playwright E2E test, `npm run lint`/`npm run typecheck`/`npm run build` all clean, and a manual full-lifecycle test run **inside the actual production Docker image** (`docker compose up --build`) — created a customer, created and finalized a quotation, downloaded a real PDF (verified `%PDF-` header and valid page count via `file`), confirmed structured JSON logs (request/audit/pdf categories) appeared correctly, and confirmed Postgres migrations applied automatically via `docker/entrypoint.sh`.
**Why:** A Docker build succeeding is not the same as the containerized app actually working — Playwright/Chromium in particular has a history of breaking in slimmed-down containers (missing shared libraries). Running the golden path against the real container (not just `docker build`) is the only way to be confident PDF generation works in the deployed artifact, not just in local dev.
**Follow-up:** See [known-limitations.md](known-limitations.md) for what's explicitly deferred, and [future-roadmap.md](future-roadmap.md) for what's next.
