# Database Design

PostgreSQL via Prisma ORM. All monetary columns are `Int` (paise) per FR-5.5. All primary keys are `cuid()`. All tables have `createdAt`/`updatedAt`; mutable business entities have `deletedAt` (soft delete).

## Entity-Relationship Diagram
```mermaid
erDiagram
    Company ||--o{ Customer : "owns (single-tenant, companyId FK reserved)"
    Company ||--|| BankDetail : "has"
    Company ||--o{ NumberingSequence : "configures"
    Customer ||--o{ Quotation : "receives"
    Customer ||--o{ Invoice : "receives"
    Item ||--o{ QuotationLineItem : "templates"
    Item ||--o{ InvoiceLineItem : "templates"
    Quotation ||--o{ QuotationLineItem : "contains"
    Quotation ||--o{ QuotationVersion : "snapshots"
    Quotation |o--o| Invoice : "converted to"
    Invoice ||--o{ InvoiceLineItem : "contains"
    Invoice ||--o{ InvoiceVersion : "snapshots"
    AuditLog }o--|| Quotation : "references (polymorphic)"
    AuditLog }o--|| Invoice : "references (polymorphic)"

    Company {
        string id PK
        string name
        string gstin
        string addressLine1
        string addressLine2
        string state
        string logoUrl
        string signatoryName
        string signatureUrl
        datetime createdAt
        datetime updatedAt
    }
    BankDetail {
        string id PK
        string companyId FK
        string accountName
        string accountNumber
        string ifsc
        string bankName
        string branch
    }
    NumberingSequence {
        string id PK
        string companyId FK
        string documentType "QUOTATION | INVOICE"
        string prefix
        int nextNumber
        string resetRule "NEVER | YEARLY | FINANCIAL_YEAR"
        int lastResetYear
    }
    Customer {
        string id PK
        string name
        string gstin
        string billingAddress
        string shippingAddress
        string state
        string phone
        string email
        string referenceCode "vendor/reference code THIS customer assigned to us, ADR-009"
        string notes
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }
    Item {
        string id PK
        string name
        string description
        string hsnSac
        string unit
        int defaultUnitPricePaise
        decimal defaultGstRate
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }
    Quotation {
        string id PK
        string number "nullable until finalized"
        string customerId FK
        string status "DRAFT|SENT|APPROVED|CANCELLED|CONVERTED"
        date issueDate
        date validUntil
        int subtotalPaise
        int discountPaise
        int cgstPaise
        int sgstPaise
        int igstPaise
        int grandTotalPaise
        string notes
        string terms
        string convertedToInvoiceId FK
        int version
        datetime createdAt
        datetime updatedAt
    }
    QuotationLineItem {
        string id PK
        string quotationId FK
        string itemId FK "nullable, ad-hoc lines allowed"
        string description
        string hsnSac "captured per line, not just via Item, ADR-009"
        decimal quantity
        int unitPricePaise
        decimal discountPct
        decimal gstRate
        int lineTotalPaise
        int sortOrder
    }
    QuotationVersion {
        string id PK
        string quotationId FK
        int versionNumber
        json snapshot
        datetime createdAt
    }
    Invoice {
        string id PK
        string number "nullable until finalized"
        string customerId FK
        string convertedFromQuotationId FK
        string status "DRAFT|PENDING|PAID|CANCELLED"
        date issueDate
        date dueDate
        date paidDate
        int subtotalPaise
        int discountPaise
        int cgstPaise
        int sgstPaise
        int igstPaise
        int grandTotalPaise
        string notes
        string terms
        int version
        datetime createdAt
        datetime updatedAt
    }
    InvoiceLineItem {
        string id PK
        string invoiceId FK
        string itemId FK
        string description
        string hsnSac
        decimal quantity
        int unitPricePaise
        decimal discountPct
        decimal gstRate
        int lineTotalPaise
        int sortOrder
    }
    InvoiceVersion {
        string id PK
        string invoiceId FK
        int versionNumber
        json snapshot
        datetime createdAt
    }
    AuditLog {
        string id PK
        string entityType "QUOTATION|INVOICE|CUSTOMER|ITEM|SETTINGS"
        string entityId
        string action "CREATE|UPDATE|DELETE|PDF_GENERATE|STATUS_CHANGE"
        json metadata
        string actor "single-user MVP: 'system'"
        datetime createdAt
    }
```

## Key Design Decisions
- **Money as integer paise** (FR-5.5): eliminates float rounding; `grandTotalPaise / 100` only at display time, using banker's-rounding-free integer math throughout the calculation pipeline.
- **`number` is nullable on Quotation/Invoice**: a `DRAFT` has no number yet; numbers are only allocated on finalize (transition out of `DRAFT`), inside the transaction that also flips status (ADR-006), via `NumberingSequence` row locked with `SELECT ... FOR UPDATE`.
- **Version snapshots as JSON**: `QuotationVersion`/`InvoiceVersion` store a full JSON snapshot of the document + line items at each finalized edit (FR-3.7), rather than a normalized history table, because the snapshot is read-only/append-only and never queried relationally — JSON keeps it simple and avoids schema churn as the document shape evolves.
- **Soft delete on Customer/Item only**: Quotations/Invoices are never deleted (financial records); Customers/Items can be archived (`deletedAt`) but not hard-deleted if referenced (enforced at the service layer, not a DB constraint, so the error message can be user-friendly).
- **`companyId` reserved but Company is a singleton in MVP**: schema includes `Company`/`BankDetail`/`NumberingSequence` scoped to a company row from day one so multi-company (future-roadmap) only requires adding a `companyId` FK to Customer/Item/Quotation/Invoice, not a schema redesign.
- **Indexes**: `Customer(name)`, `Customer(gstin)`, `Item(name)`, `Quotation(status, issueDate)`, `Quotation(customerId)`, `Invoice(status, issueDate)`, `Invoice(customerId)`, `Quotation(number)` unique, `Invoice(number)` unique — supports FR-8 search/filter/sort without full scans.
- **`AuditLog` is polymorphic by `entityType`+`entityId`** (no FK constraint) since it spans multiple entity tables and must survive even if the referenced row's lifecycle differs; queried by `(entityType, entityId)` composite index.

Prisma schema implementing this design lives at `prisma/schema.prisma` (Phase 7).
