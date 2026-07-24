# Frontend Architecture

## Rendering Strategy
- **Server Components by default** for data-heavy list/detail pages (customers, items, quotations, invoices, dashboard) — data fetched directly in the component via the service layer, avoiding client-side waterfalls.
- **Client Components** only where interactivity requires it: forms (React Hook Form), the line-item editor table, PDF preview iframe, theme toggle, toast triggers.
- **Route Handlers** (`app/api/**/route.ts`) back all mutations and are also called by client components via TanStack Query for optimistic UX (e.g., instant draft autosave feedback).

## Feature-Based Folder Structure
```
src/features/quotations/
  components/
    QuotationForm.tsx          # <400 lines; composes smaller pieces below
    LineItemsTable.tsx
    TotalsSummary.tsx
    QuotationStatusBadge.tsx
  hooks/
    useQuotationForm.ts         # RHF + Zod resolver wiring
    useQuotations.ts            # TanStack Query hooks (list/detail/mutations)
  validators/
    quotation.schema.ts         # Zod schema shared with API route
  types/
    quotation.types.ts
  index.ts                      # public exports only
```
Each feature folder is self-contained; cross-feature reuse (e.g., a customer picker used inside the quotation form) goes through `src/components/` (shared, feature-agnostic UI) or is imported explicitly from the other feature's `index.ts` — never reaching into another feature's internal files.

## Design System
- **shadcn/ui** components (Button, Input, Table, Dialog, Sheet, Toast, Skeleton, Command) as the base primitive layer, themed via Tailwind CSS variables in `globals.css` for light/dark.
- Typography scale and spacing defined once in `tailwind.config.ts`; no ad-hoc pixel values in components.
- Icons: `lucide-react` (tree-shakeable, matches shadcn defaults).

## State Management
- **Server state** (customers, items, quotations, invoices, settings): TanStack Query exclusively — no Redux/Zustand duplication of server data.
- **Form state**: React Hook Form, scoped to each form component; line-item arrays via `useFieldArray`.
- **UI-only state** (theme, sidebar collapsed, active dialog): React Context + `useState`, persisted to `localStorage` where it should survive reload (theme).

## Loading / Empty / Error States (required for every list/detail view)
- **Loading**: shadcn `Skeleton` matching the real layout's shape (not a spinner) for lists and detail panels.
- **Empty**: dedicated empty-state component with icon, one-line explanation, and a primary CTA ("Create your first customer").
- **Error**: inline error state component with retry action; unexpected render errors caught by a route-level `error.tsx` React Error Boundary with a "Something went wrong" fallback and a reload action.
- **Toasts**: shadcn `Toast`/`sonner` for mutation success/failure feedback (e.g., "Quotation QTN-2026-0001 created").

## Forms & Validation
- Every form's Zod schema lives in `features/<feature>/validators/` and is imported by **both** the client form resolver and the server route handler — one schema, two enforcement points (NFR: validation parity).
- Field-level errors render inline under each field; a form-level summary is not shown unless submission fails for a non-field reason (e.g., network error).

## PDF Preview
- `/quotations/:id/preview` renders the PDF template as an actual HTML page (same template the PDF service uses — see [api-spec.md](api-spec.md) §PDF) inside the app's layout, with Download/Print buttons. This guarantees WYSIWYG: what's previewed is exactly what gets printed to PDF, because both consume the identical template component server-side.

## Accessibility
- All icon-only buttons have `aria-label`.
- Dialogs/Sheets trap focus and restore focus to the trigger on close (shadcn/Radix default — do not override).
- Color is never the sole status indicator (status badges pair color with text/icon).
- Minimum touch target 44x44px on mobile/tablet breakpoints.

## Responsive Breakpoints
| Breakpoint | Layout behavior |
|---|---|
| `< 640px` (mobile) | Single column, line-items render as stacked cards not a table, bottom sheet for actions. |
| `640–1024px` (tablet) | Two-column forms, scrollable line-items table. |
| `> 1024px` (desktop, primary) | Full data-dense tables, side panel for PDF preview alongside the form. |

## Performance
- Route-level code splitting (Next.js default); heavy PDF-preview iframe and Playwright-triggered generation are lazy-loaded, not part of the initial bundle for list pages.
- Images (logo/signature) via `next/image` with explicit dimensions.
- List views paginated server-side (never fetch full table client-side).
- TanStack Query cache (`staleTime`) tuned per entity: customers/items (rarely change, longer staleTime), quotations/invoices (shorter, since status changes matter).
