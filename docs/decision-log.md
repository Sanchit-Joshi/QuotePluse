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
