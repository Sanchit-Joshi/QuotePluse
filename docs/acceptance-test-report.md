# Acceptance Test Report

**Date:** 2026-07-25
**Method:** Full walkthrough of the running app exactly as the client would use it — no shortcuts, no seeded fixtures, no direct database writes. Company profile, customer, product, quotation, and invoice were all created through the actual UI forms.

## Scenario
Replicate the client's real day-one workflow using their actual business details (from the two sample invoices they supplied):
1. Configure company profile (name, GSTIN, address, bank details) in Settings.
2. Add a customer (State Bank of India, Betawad branch) with GSTIN and vendor/reference code.
3. Add a catalog product (Fire Resistant Filing Cabinet, HSN 8303, ₹61,100/unit, 18% GST).
4. Create a quotation for 2 units, save as draft, review live totals, finalize.
5. Preview and download the quotation PDF.
6. Approve the quotation, convert it to an invoice.
7. Finalize the invoice, mark it paid.
8. Preview and download the invoice PDF.
9. Confirm the dashboard reflects the activity.
10. Spot-check mobile viewport and light/dark theme.

## Results

| Step | Result |
|---|---|
| Company profile save | ✅ Saved correctly (`PATCH /api/settings/company` → 200) |
| Customer creation | ✅ Saved after one validation catch (see Finding 1) |
| Product creation | ✅ Saved correctly |
| Quotation live totals (before saving) | ✅ Subtotal ₹1,22,200.00, CGST ₹10,998.00, SGST ₹10,998.00, Total ₹1,44,196.00 — **matches the client's real SBI BETAWAD invoice exactly** |
| Quotation finalize | ✅ Numbered `QTN-2026-0001`, status → SENT |
| Quotation PDF | ✅ Valid PDF, layout matches the client's reference invoice format |
| Approve → Convert to Invoice | ✅ New draft invoice created with identical line items and totals |
| Invoice finalize | ✅ Numbered `INV-2026-0001`, status → PENDING |
| Mark invoice paid | ✅ Status → PAID with paid date recorded |
| Invoice PDF | ✅ Valid PDF |
| Dashboard | ✅ Shows 1 PAID (₹1,44,196.00) and 1 CONVERTED (₹1,44,196.00), both documents listed under Recent |
| Mobile viewport (375px) | ✅ Sidebar collapses to a hamburger menu, dashboard cards stack, fully usable |
| Light/dark theme toggle | ✅ Both render cleanly |
| Server logs across the entire run | ✅ Every request returned 200/201 — zero errors, zero warnings |

## Findings

**Finding 1 — GSTIN validation correctly caught a likely typo in the client's own records (not a bug).**
The client's real Excel invoice lists the customer's GSTIN as `27AAACS8577K20` — only 14 characters, one short of a valid 15-character Indian GSTIN. When entering this value verbatim into the Customer form, the app correctly rejected it ("Invalid GSTIN format") per FR-10.2. This is very likely a transcription slip in the client's historical spreadsheet (State Bank of India's actual GSTIN in this jurisdiction follows the pattern `27AAACS8577K1Z2`), not a defect in the app. **Recommendation:** when onboarding real customers, double-check GSTINs against the customer's GST certificate rather than copying from old invoices, since this validation will reject anything that isn't a well-formed 15-character GSTIN.

No other issues found. No console errors, no failed requests, no incorrect totals, no layout breakage at any point in the walkthrough.

## Artifacts
Two PDFs generated during this test were sent to the user directly for visual review:
- `QTN-2026-0001` (quotation)
- `INV-2026-0001` (invoice, marked paid)

## Sign-off
This walkthrough exercised the complete golden path (FR-1 through FR-9) end-to-end through the real UI, with data and math verified against the client's actual reference invoices (see [decision-log.md](decision-log.md) ADR-009). No blocking issues found.
