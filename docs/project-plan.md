# Project Plan

## Features List (MVP)
- Customer CRUD + search
- Product/Item catalog CRUD
- Quotation create/edit/draft/duplicate/version-history/convert-to-invoice
- Invoice create/edit/draft/duplicate/status management
- Automatic GST-aware totals engine (CGST/SGST/IGST, per-line + document discount)
- Auto-numbering (configurable prefix + counter) per document type
- PDF preview, download, print from a fixed HTML/CSS template
- Dashboard (status summary cards, recent documents)
- Settings (company profile, bank details, numbering config, default terms)
- Dark/light theme, responsive layout, keyboard accessible
- Structured logging + audit log for create/update/delete/PDF-generate
- Docker Compose local deployment

## MVP Scope
Everything in Features List above. Explicitly: single user, no login, India GST only, local deployment, default PDF template (client template pending).

## Future Scope
See [future-roadmap.md](future-roadmap.md).

## Risk Analysis
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Client's real PDF template differs significantly from default, requiring template rework | High | Medium | Data model kept independent of layout (ADR-005); template is a swappable HTML/CSS component. |
| Floating-point rounding errors in GST/totals | Medium | High (financial correctness) | All money stored/computed as integer paise (FR-5.5), tested with dedicated calculation unit tests. |
| Numbering collisions under concurrent use | Low (single-user MVP) | High (duplicate legal document numbers) | Transactional counter allocation (ADR-006); revisit locking strategy if multi-user ships. |
| Scope creep from the very large feature wishlist in the brief | High | Medium | Strict MVP cut enforced here; everything else tracked in future-roadmap.md, not built speculatively. |
| No auth means anything reachable on the network has full access | Medium (if machine is shared/exposed) | High | Documented in known-limitations.md; architecture is auth-ready; must not be exposed to public internet as-is. |
| 90% coverage target slows delivery if pursued on every file | Medium | Low | Coverage focused on business logic (calculators, services, API) per non-functional-requirements.md, not enforced blindly on presentational components. |

## Assumptions
- Business operates in India, single GSTIN, single state of operation (place-of-supply logic assumes one company state).
- Currency is INR throughout.
- Client will supply the real PDF/Excel template during development; MVP's default template is a placeholder built to the same data contract.
- "Single user" means one person operates the app; no need for simultaneous multi-editor conflict resolution in MVP.
- Local network only for MVP; not exposed to the public internet.

## Milestones
1. **M1 — Planning complete**: all `/docs` phase 1-6 documents written and internally consistent (this milestone).
2. **M2 — Core scaffold**: Next.js/TS/Tailwind/shadcn/Prisma/Postgres running in Docker, base layout, theme toggle, health check.
3. **M3 — Customers & Items**: full CRUD, validation, tests.
4. **M4 — Quotations**: creation, totals engine, numbering, draft/duplicate/version history, tests.
5. **M5 — Invoices**: creation, status flow, quotation-to-invoice conversion, tests.
6. **M6 — PDF engine**: template, preview/download/print, generation logging, tests.
7. **M7 — Dashboard & Settings**: summary cards, company/bank/numbering settings.
8. **M8 — Test hardening**: coverage report ≥90% on business logic, E2E happy-path + regression checklist.
9. **M9 — Docker & CI/CD**: dev+prod Dockerfiles, compose, GitHub Actions pipeline green.
10. **M10 — Production readiness review**: Definition of Done checklist passed, docs finalized.

## Timeline (indicative, single engineer-equivalent effort)
| Milestone | Est. effort |
|---|---|
| M1 Planning | 0.5 day |
| M2 Scaffold | 0.5 day |
| M3 Customers/Items | 1 day |
| M4 Quotations | 1.5 days |
| M5 Invoices | 1 day |
| M6 PDF engine | 1.5 days |
| M7 Dashboard/Settings | 1 day |
| M8 Test hardening | 1 day |
| M9 Docker/CI/CD | 0.5 day |
| M10 Readiness review | 0.5 day |
| **Total** | **~9 days** |

Diagrams (architecture, data flow, user flow) are in [architecture.md](architecture.md).
