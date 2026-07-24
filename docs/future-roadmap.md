# Future Roadmap

Ordered roughly by expected value vs. effort, not a committed schedule.

## Near-term (post-MVP hardening)
- **Authentication (Better Auth)** — add login, keep single-tenant data model, gate all mutating routes.
- **Email delivery** — send quotation/invoice PDF directly to customer email from within the app (SMTP or transactional email provider).
- **Cloud object storage** — move logo/signature/generated-PDF storage from local disk to S3-compatible storage (architecture already isolates storage behind a repository interface, see [backend-architecture.md](backend-architecture.md)).
- **Payment tracking** — record partial payments against an invoice, auto-compute balance due, auto-flip status to PAID when balance reaches zero.

## Mid-term
- **Multi-user + Role-Based Access Control** — owner/staff roles, per-user activity attribution (audit log already tracks actor field, currently defaulted to a single system user).
- **Multi-company** — company becomes a top-level tenant entity; all data scoped by `companyId`.
- **GST reports** — GSTR-1-style summary exports (CSV/Excel) aggregating tax collected per period.
- **Inventory** — stock quantity tracking tied to catalog items, deducted on invoice finalization.
- **Purchase orders** — vendor-side counterpart to quotations.

## Long-term
- **WhatsApp/SMS notifications** — send/share document links via WhatsApp Business API or SMS gateway.
- **Analytics dashboard** — revenue trends, top customers/items, aging receivables.
- **AI document extraction** — parse an incoming vendor bill/PO photo or PDF into structured line items.
- **Public API** — authenticated REST/GraphQL API for third-party integrations (accounting software, e-commerce).
- **Mobile app** — React Native or PWA wrapper reusing the existing API layer.

## Explicitly deferred generic-tax support
A configurable generic single-rate tax mode (for non-India use) is deferred; the tax engine is designed with a `TaxStrategy` interface (see [backend-architecture.md](backend-architecture.md)) so a second strategy can be added without touching quotation/invoice logic.
