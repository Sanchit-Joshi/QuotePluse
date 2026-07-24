# Known Limitations

1. **PDF template is a default design, not yet the client's exact reference.** The client has not yet supplied their existing Excel/PDF file. A professional GST-invoice-style layout is being built first (ADR-005); expect a follow-up pass to match the real template pixel-for-pixel once supplied.
2. **No authentication in MVP.** The app is single-user by design (ADR-003). Anyone with network access to the running instance has full access — acceptable only because it runs locally/on a trusted machine. Do not expose this MVP directly to the public internet without adding auth first.
3. **No payment gateway integration.** Marking an invoice "Paid" is a manual status change with a manual paid-date entry; no reconciliation with a bank or payment processor.
4. **Numbering is transactionally unique but not strictly gapless.** A rolled-back transaction can consume a number that is never used (ADR-006). Acceptable for MVP; revisit if strict gapless sequences become a compliance requirement.
5. **Single company, single currency (INR).** Multi-company and multi-currency are future scope.
6. **No email/WhatsApp/SMS sending.** The system produces a PDF; delivering it to the customer is still a manual step (download + attach) in MVP.
7. **No offline mode.** Requires the local server (Docker Compose) to be running; no service-worker/offline-first support in MVP.
8. **Test coverage target (90%) applies to business logic** (services, calculators, validators, API routes), not to every UI pixel/animation — component tests cover interactive behavior, not exhaustive visual regression.
