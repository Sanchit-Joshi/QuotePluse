# Product Requirements Document (PRD)

## 1. Problem Statement
The client currently manages quotations and invoices in Excel: manually editing a spreadsheet per customer, recalculating totals, exporting to PDF, and repeating the entire process for every revision. This is slow, error-prone (formula breakage, manual totals), and has no history, search, or numbering discipline.

## 2. Goal
Replace the Excel workflow with a web application where the client fills a structured form and the system instantly generates a professional, pixel-consistent PDF (quotation or invoice) — with the same layout every time, only the content changing.

## 3. Primary Persona
- **Business Owner / Office Admin (single user, MVP)** — not technical, needs the fastest possible path from "new customer + items" to "PDF in hand / sent." Works from a desktop primarily, occasionally tablet.

## 4. Success Criteria (MVP)
1. Creating a quotation/invoice and producing a PDF takes under 2 minutes for a typical 5-line-item document.
2. Generated PDF matches the approved template exactly (see [functional-requirements.md](functional-requirements.md) §PDF).
3. Zero manual arithmetic — all totals, GST, and discounts are computed by the system.
4. Every quotation/invoice is numbered automatically, sequential, and never collides.
5. A quotation can be converted to an invoice in one action, preserving line items.
6. All historical documents are searchable and re-downloadable as PDF at any time.

## 5. Scope Boundaries
- MVP is **single-user, no login** (see [decision-log.md](decision-log.md) ADR-003). Architecture must not preclude adding auth later.
- MVP targets **India GST** tax rules (CGST/SGST/IGST, GSTIN, HSN/SAC). Generic/multi-region tax is future scope.
- MVP runs **locally via Docker Compose**. Cloud deployment guides are written but not exercised against a live host in this phase.
- PDF layout is **pending the client's actual Excel/PDF template** — see [known-limitations.md](known-limitations.md). A professional default layout will be built first and swapped/adjusted once the reference file is supplied, without changing the underlying data model.

## 6. Out of Scope for MVP (see future-roadmap.md)
Inventory, purchase orders, payment tracking automation, GST filing reports, email/WhatsApp/SMS sending, analytics dashboards, multi-company, multi-user/RBAC, cloud storage, AI document extraction, mobile app, public API.

## 7. Core Modules (MVP)
Dashboard, Customer Management, Product/Item Management, Quotation Management, Invoice Management, PDF Preview/Download/Print, Settings (Company Info, Bank Details, Numbering, Terms/Notes defaults).

## 8. Definition of Done
See root instructions — every feature must be requirements-implemented, tested, type-safe, responsive, accessible, documented, Docker-compatible, and pass production build/lint/type/test checks with no TODOs before merge.
