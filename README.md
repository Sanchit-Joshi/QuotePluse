# QuotePro — Quotation & Invoice Management

A web application that replaces an Excel-based quotation/invoice workflow: fill in a form, get an instant, pixel-consistent PDF. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

Full requirements, architecture, and design decisions live in [`/docs`](docs/) — start with [product-requirements.md](docs/product-requirements.md) and [architecture.md](docs/architecture.md).

## Features
Customer & product management, quotations with GST-aware totals (CGST/SGST/IGST), draft/finalize/duplicate/convert-to-invoice, invoices with payment status, auto-numbering, PDF preview/download/print, dashboard, company/bank/numbering settings, dark/light theme. See [functional-requirements.md](docs/functional-requirements.md) for the full list and [future-roadmap.md](docs/future-roadmap.md) for what's intentionally out of scope for this MVP.

## Tech Stack
Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS + shadcn/ui (Base UI) · React Hook Form + Zod · TanStack Query · Prisma 7 (driver adapters) · PostgreSQL 16 · Playwright (PDF generation) · Vitest + Playwright Test.

## Getting Started (local, no Docker)

Prerequisites: Node.js 22+, a local PostgreSQL 16 instance (or run `docker run -d -p 5432:5432 -e POSTGRES_USER=quotation -e POSTGRES_PASSWORD=quotation_dev_password -e POSTGRES_DB=quotation postgres:16-alpine`).

```bash
npm install
cp .env.example .env          # edit DATABASE_URL if your Postgres differs
npx prisma migrate dev        # creates tables
npx playwright install chromium
npm run dev
```

Open http://localhost:3000.

## Getting Started (Docker)

```bash
docker compose up --build
```
This starts PostgreSQL and the app together, running migrations automatically. See [docker.md](docs/docker.md) for the dev-mode override and [deployment.md](docs/deployment.md) for cloud deployment guides (Railway, Render, DigitalOcean, AWS, Azure).

## Scripts
```bash
npm run dev             # start dev server
npm run build            # production build
npm run start            # start production server (after build)
npm run lint              # ESLint
npm run typecheck          # tsc --noEmit
npm run test               # vitest (unit + integration)
npm run test:coverage       # vitest with coverage report
npm run test:e2e             # Playwright end-to-end tests
npm run prisma:migrate        # prisma migrate dev
npm run prisma:studio          # Prisma Studio (browse the DB)
```

## Documentation Index
| Doc | Purpose |
|---|---|
| [product-requirements.md](docs/product-requirements.md) | Problem, goal, success criteria, scope |
| [functional-requirements.md](docs/functional-requirements.md) | Detailed FRs per module |
| [non-functional-requirements.md](docs/non-functional-requirements.md) | Performance, security, accessibility, maintainability |
| [architecture.md](docs/architecture.md) | System/data-flow/user-flow diagrams, tech stack rationale |
| [database-design.md](docs/database-design.md) | ER diagram, schema rationale |
| [api-spec.md](docs/api-spec.md) | REST endpoint reference |
| [frontend-architecture.md](docs/frontend-architecture.md) / [backend-architecture.md](docs/backend-architecture.md) | Layering, folder structure |
| [security.md](docs/security.md) | Threat model, OWASP checklist |
| [testing.md](docs/testing.md) | Test strategy, coverage, manual checklist |
| [docker.md](docs/docker.md) / [deployment.md](docs/deployment.md) | Containerization and cloud deployment |
| [known-limitations.md](docs/known-limitations.md) / [future-roadmap.md](docs/future-roadmap.md) | What's deliberately not done yet |
| [decision-log.md](docs/decision-log.md) | ADRs — why things are built the way they are |

## License
Proprietary — internal business tool.
