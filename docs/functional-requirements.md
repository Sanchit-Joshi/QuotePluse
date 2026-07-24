# Functional Requirements

## FR-1 Customer Management
- FR-1.1 Create, read, update, soft-delete customers.
- FR-1.2 Fields: name, billing address, shipping address (optional, copy-from-billing), GSTIN (optional, validated format), phone, email, notes.
- FR-1.3 Search customers by name/GSTIN/phone; list is paginated and sortable.
- FR-1.4 A customer cannot be hard-deleted if referenced by any quotation/invoice (soft delete / archive instead).

## FR-2 Product/Item Management
- FR-2.1 Create, read, update, soft-delete catalog items.
- FR-2.2 Fields: name, description, HSN/SAC code, unit (pcs/kg/hr/etc.), default unit price, default GST rate.
- FR-2.3 Items are reusable across quotations/invoices as line-item templates; line items can still be freely edited per-document without altering the catalog item.

## FR-3 Quotation Management
- FR-3.1 Create a quotation: select/create customer, add line items (item, qty, unit price, discount %, GST rate), set quotation date, validity/expiry date, notes, terms.
- FR-3.2 Auto-generate quotation number on creation using a configurable prefix + sequential counter (e.g., `QTN-2026-0001`), gapless and collision-free under concurrent creation.
- FR-3.3 Statuses: `DRAFT`, `SENT` (renders as "Approved" pending client wording — see decision-log), `APPROVED`, `CANCELLED`. A quotation starts as `DRAFT` until explicitly finalized.
- FR-3.4 Save as Draft at any point without validation of completeness (except required customer).
- FR-3.5 Duplicate an existing quotation into a new DRAFT with a fresh number.
- FR-3.6 Convert an APPROVED (or any non-cancelled) quotation into a new DRAFT invoice, copying customer + line items 1:1; the source quotation is marked `CONVERTED` and linked to the resulting invoice.
- FR-3.7 Version history: every edit to a finalized (non-draft) quotation creates an immutable snapshot; prior versions are viewable and their PDFs regeneratable.
- FR-3.8 Preview renders the exact PDF layout in-browser before download.

## FR-4 Invoice Management
- FR-4.1 Same CRUD/line-item mechanics as quotations, with its own numbering sequence (e.g., `INV-2026-0001`).
- FR-4.2 Statuses: `DRAFT`, `PENDING`, `PAID`, `CANCELLED`.
- FR-4.3 Invoices may optionally reference a source quotation (`convertedFromQuotationId`).
- FR-4.4 Duplicate an existing invoice into a new DRAFT with a fresh number.
- FR-4.5 Marking `PAID` records a paid date (manual entry, no payment gateway in MVP).

## FR-5 Totals & Tax Computation
- FR-5.1 Per line: `lineTotal = qty * unitPrice * (1 - discountPct/100)`.
- FR-5.2 Per line GST: split into CGST+SGST (intra-state) or IGST (inter-state), determined by comparing company state to customer billing state.
- FR-5.3 Document totals: subtotal, total discount, total taxable value, total CGST, total SGST, total IGST, grand total, and grand total in words.
- FR-5.4 Optional document-level discount (flat or %) applied before tax, in addition to per-line discounts.
- FR-5.5 All monetary math performed in integer paise (never floating point) to avoid rounding drift; rounding to nearest rupee only at final display per applicable rounding rule, with the rounding adjustment shown as its own line.

## FR-6 PDF Generation
- FR-6.1 Generate a PDF from an HTML/CSS template using stored document data; layout is fixed, content is dynamic (see [api-spec.md](api-spec.md) and template contract in [frontend-architecture.md](frontend-architecture.md)).
- FR-6.2 Dynamic regions: company logo, company info/bank details, customer info, document number/date, line items table (paginated across multiple pages if needed), tax breakdown, totals, amount in words, notes, terms & conditions, signature image, page numbers ("Page X of Y").
- FR-6.3 PDF is downloadable, previewable inline, and printable directly from the browser.
- FR-6.4 PDF generation is logged (document id, timestamp, duration, success/failure) — see [security.md](security.md) Logging.

## FR-7 Settings
- FR-7.1 Company profile: name, address, state (for GST place-of-supply logic), GSTIN, logo upload, bank details (account name/number/IFSC/bank name/branch), authorized signatory name + signature image.
- FR-7.2 Numbering configuration: prefix, next-number counter, reset rule (never / yearly / financial-year) per document type.
- FR-7.3 Default terms & conditions / notes text, editable, pre-filled into new documents.

## FR-8 Search, Filter, Sort
- FR-8.1 Quotations/invoices list: filter by status, date range, customer; search by number or customer name; sort by date/number/amount/status.
- FR-8.2 All list views paginated server-side.

## FR-9 Dashboard
- FR-9.1 Summary cards: counts/amounts by status (draft, pending, paid, approved, cancelled) for the current month/quarter.
- FR-9.2 Recent quotations/invoices list with quick actions (view, duplicate, convert, download).

## FR-10 Validation Rules
- FR-10.1 A document cannot be finalized (leave DRAFT) without: a customer, ≥1 line item, and a non-negative computed total.
- FR-10.2 GSTIN, if provided, must match the 15-character Indian GSTIN pattern.
- FR-10.3 Quantities and unit prices must be positive numbers; discount percentages within 0–100.
- FR-10.4 All validation is enforced identically client-side (immediate feedback) and server-side (source of truth).
