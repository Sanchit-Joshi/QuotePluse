# Security

## Threat Model Summary
Single-user, locally-deployed MVP (no auth). Primary risks are: (1) accidental exposure to an untrusted network, (2) injection/XSS from stored customer/item text later rendered into PDFs or the UI, (3) resource exhaustion (repeated PDF generation), (4) secret leakage via repo/logs.

## Input Handling
- **SQL Injection**: not applicable in practice — all queries go through Prisma's parameterized query builder; raw SQL (`$queryRaw`) is disallowed by lint rule unless explicitly reviewed, and none is used in MVP.
- **XSS**: React escapes all interpolated content by default; `dangerouslySetInnerHTML` is banned repo-wide except inside the PDF template's controlled, non-user-sourced static markup. Any user-supplied text placed into the PDF template (customer name, notes, terms) goes through the same React escaping — never string-concatenated into raw HTML.
- **Input sanitization**: Zod schemas enforce type/length/format (e.g., GSTIN pattern, phone format, max lengths on free-text fields) at the API boundary before anything reaches a service or the DB.
- **File uploads (logo/signature)**: MIME-type allowlist (`image/png`, `image/jpeg`, `image/svg+xml` sanitized or disallowed), max file size enforced server-side, stored under a generated filename (never the user-supplied original name) to prevent path traversal.

## CSRF
Next.js Route Handlers use `SameSite=Lax` session-independent requests in MVP (no session cookie exists without auth), but all mutating routes (`POST`/`PATCH`/`DELETE`) still verify a custom header (`X-Requested-With`) is present to reject naive cross-site form submissions, and are documented as the first thing to wire to a proper CSRF token once auth (and cookies) are added.

## Rate Limiting
Lightweight in-memory token-bucket limiter on mutating routes and the PDF-generation endpoint (e.g., 30 req/min/IP) to prevent accidental/malicious resource exhaustion from repeated Playwright PDF renders — documented as needing an upgrade to a shared store (Redis) if/when deployed beyond a single instance.

## Secrets & Configuration
- All secrets (`DATABASE_URL`, future auth secrets) via environment variables only, loaded from `.env` (git-ignored) — `.env.example` committed with placeholder values and inline comments.
- No secret is ever logged; the structured logger has a field-name denylist (`password`, `secret`, `token`, `key`) that redacts values automatically as a defense-in-depth measure.

## Authentication / Authorization (future-ready, not active in MVP)
- No login in MVP (ADR-003) — this must not be deployed to a public/untrusted network as-is (see [known-limitations.md](known-limitations.md)).
- Data model and route-handler middleware pattern are structured so Better Auth session middleware can wrap all `/api/**` routes later without restructuring; a `requireAuth()` no-op placeholder marks every mutating route today.

## Logging (see also [testing.md](testing.md) for how logs are asserted in tests)
Structured JSON logs, four categories:
1. **Request logs** — method, path, status, durationMs (no bodies with PII by default).
2. **Error logs** — error code, message, stack (server-only), correlating request id.
3. **Audit logs** — entity type/id, action, actor, timestamp, persisted to the `AuditLog` table (not just stdout) for CREATE/UPDATE/DELETE/STATUS_CHANGE on Customer/Item/Quotation/Invoice/Settings.
4. **PDF generation logs** — document id, durationMs, success/failure, persisted alongside audit logs.

## Dependency & Build Security
- `npm audit` (or equivalent) run in CI (see [deployment.md](deployment.md) CI/CD section); build fails on high/critical vulnerabilities in production dependencies.
- Docker images built `FROM node:XX-slim` with a non-root user; multi-stage build so dev dependencies and source maps are not shipped in the production image.

## OWASP Top 10 Coverage Checklist
| Risk | Mitigation |
|---|---|
| Broken Access Control | No public exposure in MVP; auth-ready middleware seams documented above. |
| Cryptographic Failures | No sensitive data stored beyond business data (GSTIN/bank details are business-public info, not secrets); TLS termination is the deploying host's responsibility per [deployment.md](deployment.md). |
| Injection | Prisma parameterized queries; Zod validation at every boundary. |
| Insecure Design | Immutable finalized documents + version history (FR-3.7) prevents silent tampering with financial records. |
| Security Misconfiguration | `.env.example` with safe defaults; no debug endpoints in production build. |
| Vulnerable Components | CI dependency audit. |
| Auth Failures | N/A in MVP by design; flagged in known-limitations.md. |
| Software/Data Integrity | Transactional writes (ADR-006); audit log. |
| Logging/Monitoring Failures | Four-category structured logging above. |
| SSRF | No server-side fetch of user-supplied URLs anywhere in the app. |
