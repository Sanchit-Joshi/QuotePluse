# API Specification

Base path: `/api`. All request/response bodies are JSON unless noted. All mutating routes require header `X-Requested-With: XMLHttpRequest` (see [security.md](security.md) CSRF). Errors follow: `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }`.

## Health
`GET /api/health` → `200 { status: "ok", db: "ok" }` (used by Docker healthcheck).

## Customers
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/customers?search=&page=&pageSize=&sort=` | — | `200 { items: Customer[], total, page, pageSize }` |
| GET | `/api/customers/:id` | — | `200 Customer` / `404` |
| POST | `/api/customers` | `CustomerInput` | `201 Customer` / `422` |
| PATCH | `/api/customers/:id` | `Partial<CustomerInput>` | `200 Customer` / `404` / `422` |
| DELETE | `/api/customers/:id` | — | `204` (soft delete) / `409` if referenced-and-policy-blocks (not blocked in MVP — archive always allowed) |

`CustomerInput`: `{ name: string(1-200), gstin?: string(15, GSTIN pattern), billingAddress: string, shippingAddress?: string, state: string, phone?: string, email?: string(email), referenceCode?: string(<=50, this customer's vendor/reference code for us, ADR-009), notes?: string }`

## Items
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/items?search=&categoryId=&page=&pageSize=` | — | `200 { items: (Item & {category})[], total, page, pageSize }` |
| GET | `/api/items/:id` | — | `200 Item & {category}` / `404` |
| POST | `/api/items` | `ItemInput` | `201 Item` / `422` |
| PATCH | `/api/items/:id` | `Partial<ItemInput>` | `200 Item` |
| DELETE | `/api/items/:id` | — | `204` (soft delete) |

`ItemInput`: `{ name: string, description?: string, hsnSac?: string, unit: string, defaultUnitPricePaise: int(>=0), defaultGstRate: number(0-28), categoryId?: string }`

## Categories
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/categories` | — | `200 Category[]` (all, alphabetical — no pagination, expected to stay small) |
| POST | `/api/categories` | `{ name: string }` | `201 Category` / `409` if the name already exists |

No PATCH/DELETE — categories are only created inline from the product form (ADR-013); renaming/removing isn't needed yet and isn't built.

## Quotations
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/quotations?status=&customerId=&search=&dateFrom=&dateTo=&page=&pageSize=&sort=` | — | `200 { items, total, page, pageSize }` |
| GET | `/api/quotations/:id` | — | `200 QuotationDetail` (includes lineItems, computed totals) |
| POST | `/api/quotations` | `QuotationInput` | `201 QuotationDetail` (status DRAFT, no number) |
| PATCH | `/api/quotations/:id` | `Partial<QuotationInput>` | `200 QuotationDetail`; if not DRAFT, creates a new `QuotationVersion` snapshot before applying (FR-3.7) |
| POST | `/api/quotations/:id/finalize` | — | `200 QuotationDetail` (allocates number, status SENT) / `409` if already finalized |
| POST | `/api/quotations/:id/duplicate` | — | `201 QuotationDetail` (new DRAFT, no number) |
| POST | `/api/quotations/:id/convert` | — | `201 { invoice: InvoiceDetail }` — creates DRAFT invoice from an approved/sent quotation, marks source `CONVERTED` |
| PATCH | `/api/quotations/:id/status` | `{ status: 'APPROVED'\|'CANCELLED' }` | `200 QuotationDetail` — only legal transitions per state machine (see [backend-architecture.md](backend-architecture.md)) |
| GET | `/api/quotations/:id/pdf` | — | `200` `application/pdf` binary stream |
| GET | `/api/quotations/:id/versions` | — | `200 QuotationVersion[]` |

`QuotationInput`: `{ customerId: string, issueDate: date, validUntil?: date, lineItems: LineItemInput[], documentDiscountPct?: number, notes?: string, terms?: string }`
`LineItemInput`: `{ itemId?: string, description: string, hsnSac?: string, quantity: number(>0), unitPricePaise: int(>=0), discountPct?: number(0-100), gstRate: number(0-28) }`

## Invoices
Mirrors Quotations with these differences:
| Method | Path | Notes |
|---|---|---|
| PATCH | `/api/invoices/:id/status` | `{ status: 'PENDING'\|'PAID'\|'CANCELLED', paidDate?: date }` |
| POST | `/api/invoices/:id/duplicate` | new DRAFT invoice |
| GET | `/api/invoices/:id/pdf` | same PDF mechanics as quotation |
| GET | `/api/invoices/:id/versions` | — |

`InvoiceInput`: same shape as `QuotationInput` plus optional `convertedFromQuotationId` (set automatically by the convert flow, not client-settable directly).

## Settings
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/settings/company` | — | `200 CompanyProfile` |
| PATCH | `/api/settings/company` | `CompanyProfileInput` (multipart for logo/signature) | `200 CompanyProfile` |
| GET | `/api/settings/numbering` | — | `200 NumberingSequence[]` |
| PATCH | `/api/settings/numbering/:documentType` | `{ prefix?, nextNumber?, resetRule? }` | `200 NumberingSequence` |

## Dashboard
`GET /api/dashboard/summary?period=month|quarter` → `200 { counts: {status: count}, amounts: {status: paise}, recent: (Quotation|Invoice)[] }`

## Status Codes Convention
`200` success (read/update), `201` created, `204` no content (delete), `400` malformed request, `401` (reserved for future auth), `404` not found, `409` conflict (illegal state transition, duplicate finalize), `422` validation failure (`fields` populated), `429` rate limited, `500` unexpected.

## Pagination Convention
All list endpoints: `page` (1-based, default 1), `pageSize` (default 20, max 100), response always includes `total` for client-side page-count computation.
