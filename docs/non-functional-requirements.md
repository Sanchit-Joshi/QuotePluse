# Non-Functional Requirements

## Performance
- List views (customers, items, quotations, invoices) return in <300ms for up to 10,000 rows via server-side pagination + indexed queries.
- PDF generation completes in <2s for a document with up to 50 line items.
- Frontend route transitions use skeleton loaders; no blank white-screen states.

## Availability & Reliability
- Local/Docker deployment target; no formal SLA for MVP. Health check endpoint (`/api/health`) required for container orchestration.
- Database writes for document creation/numbering are transactional — a failure must not consume a number without persisting the document (no gaps only guaranteed within a single successful transaction; a rolled-back transaction may still burn a number, which is acceptable per [decision-log.md](decision-log.md) ADR-006).

## Security
See [security.md](security.md) for full detail. Summary: input sanitization, parameterized queries via Prisma (SQL injection not applicable), output encoding (XSS), CSRF protection on mutating routes, rate limiting on API routes, secrets only via environment variables, structured audit logging of create/update/delete/PDF-generate actions.

## Scalability
- Architecture must not block adding: auth (multi-user/RBAC), multi-company, cloud object storage, background job queue for PDF generation, and a public API — see [future-roadmap.md](future-roadmap.md).
- Repository/service layering (Clean Architecture) isolates business logic from Next.js route handlers so it is portable to a standalone Express/worker process later if load requires it.

## Usability / Accessibility
- WCAG 2.1 AA target: color contrast ≥4.5:1, all interactive elements keyboard-reachable, ARIA labels on icon-only controls, visible focus states.
- Responsive breakpoints: mobile (< 640px, functional but desktop-first), tablet (640–1024px, full CRUD), desktop (>1024px, primary target — data-dense tables, side-by-side form+preview).
- Dark mode and light mode both fully styled, following system preference by default with manual override.

## Maintainability
- No file >400 lines, no function >50 lines (barring justified exceptions, documented inline with a one-line reason).
- Strict TypeScript, `noImplicitAny`, no `any`, no dead/commented-out code, no `console.log` in production builds (enforced via ESLint rule).
- Feature-based folder structure (see [frontend-architecture.md](frontend-architecture.md), [backend-architecture.md](backend-architecture.md)).

## Testability
- Target 90% statement coverage on business logic (services, calculators, validators). UI components covered by component tests for interactive behavior, not raw JSX rendering.
- Deterministic PDF tests: assert on extracted text/structure, not byte-for-byte binary diff (binaries vary by generation timestamp/fonts).

## Observability
- Structured JSON logs (request, error, audit, PDF-generation categories) — see [security.md](security.md).
- No PII (customer GSTIN, bank details) in logs beyond IDs.

## Compliance / Data Integrity
- Finalized (non-draft) quotations/invoices are immutable in their numbered form; edits create new versions (FR-3.7) — protects audit trail for a financial document.
- Monetary values stored as integers (paise) — see FR-5.5.
