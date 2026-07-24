# Deployment

All deployment targets share the same three requirements:
1. A reachable PostgreSQL 16 database.
2. The environment variables in `.env.example` (`DATABASE_URL`, `APP_URL`, `PDF_STORAGE_DIR`, `UPLOAD_STORAGE_DIR`).
3. Enough memory/CPU to run headless Chromium for PDF generation (Playwright) alongside the Next.js server — budget at least 512MB RAM; 1GB+ recommended.

`APP_URL` **must** point at the URL the running server can reach itself at (see [ADR-007](decision-log.md)) — Playwright navigates to `${APP_URL}/quotations/:id/preview` to render PDFs. In every target below, this is `http://localhost:<port>` because Playwright always runs inside the same process/container as the server.

## Vercel
Vercel is a serverless platform: there's no `docker compose`-style always-on container, so two parts of the stack need a different approach than everywhere else in this document — see ADR-010 in [decision-log.md](decision-log.md) for the full reasoning.

- **PDF generation**: `PdfService` automatically detects `process.env.VERCEL` and switches from the full `playwright` package (used everywhere else) to `playwright-core` + `@sparticuz/chromium` — a Chromium binary built to fit inside a serverless function. No configuration needed; this is already wired up in `src/services/pdf/pdf.service.ts`.
- **Database**: Vercel doesn't provide Postgres itself. Provision one of: **Neon** (recommended — serverless Postgres, generous free tier, native Vercel integration), **Supabase**, or **Vercel Postgres** (also Neon-backed). Use the **pooled** connection string if offered (often a `-pooler` hostname) — serverless functions open many short-lived connections, and an unpooled connection string can exhaust a small Postgres instance's connection limit quickly.
- **File uploads (logo/signature)**: `/api/uploads` currently writes to local disk (`public/uploads/`), which is **ephemeral on Vercel** — an uploaded file may not survive the next deployment or even the next cold start on a different instance. This works fine on every other target in this document (Docker, EC2, a Droplet) but is a known gap on Vercel specifically until cloud object storage (Vercel Blob / S3) is wired in — see [future-roadmap.md](future-roadmap.md). Until then, re-upload the logo/signature if they disappear after a deploy.

### Steps
1. **This agent cannot complete this step for you**: sign in to [vercel.com](https://vercel.com) and click "Add New Project" → import the GitHub repo (`https://github.com/Sanchit-Joshi/QuotePluse` once pushed). Signing in and authorizing the GitHub connection is an OAuth flow only you can complete.
2. Vercel auto-detects Next.js; leave the build command as `npm run build` (this project's `postinstall` script already runs `prisma generate` automatically after `npm install`).
3. Before the first deploy, add these Environment Variables in the Vercel project's Settings:
   - `DATABASE_URL` — your Neon/Supabase connection string (pooled, with `?sslmode=require`).
   - `APP_URL` — leave unset; `pdf.service.ts` falls back to `https://${VERCEL_URL}` automatically. Only set this explicitly if you attach a custom domain and want PDFs rendered against that domain instead of the auto-generated `*.vercel.app` one.
4. Run the initial migration against the new database **once**, from your local machine, pointed at the production `DATABASE_URL`:
   ```bash
   DATABASE_URL="<your Neon connection string>" npx prisma migrate deploy
   ```
   (Vercel's build step does not run migrations automatically — there's no reliable single "this is the first deploy" hook. Run `prisma migrate deploy` locally against the target database after adding new migrations, before or right after each deploy that includes schema changes.)
5. Deploy. First PDF request after a deploy will be slower (cold Chromium download/launch inside the function); subsequent requests reuse the warm instance.
**Rollback:** Vercel keeps every deployment; use "Promote to Production" on a previous deployment from the dashboard.
**Backup:** whatever your Postgres provider offers (Neon has point-in-time restore on paid tiers).

## Docker (any host)
See [docker.md](docker.md) for the full reference.
```bash
docker compose up --build -d
```
Migrations run automatically via `docker/entrypoint.sh` on container start.

**Rollback:** `docker compose down`, then re-deploy the previous image tag (`docker compose up -d` with the old tag pinned) — migrations are additive/backward-compatible by convention in this project (see Migration Steps below), so rolling back the app image without rolling back the database is safe for the schema history to date.
**Backup:** `docker compose exec db pg_dump -U quotation quotation > backup.sql` (or mount `postgres_data` and snapshot the volume directly).

## Railway
1. Create a new Railway project, add a **PostgreSQL** plugin (Railway provisions `DATABASE_URL` automatically — rename/alias it to match this project's expected `DATABASE_URL` env var if Railway's variable name differs).
2. Add this repo as a service, build command `npm ci && npx prisma generate && npm run build`, start command `npx prisma migrate deploy && npm run start`.
3. Set `APP_URL` to the Railway-assigned public domain (`https://<service>.up.railway.app`) — the app still calls itself at `http://localhost:$PORT` for the Playwright navigation internally, but confirm `PORT` is read (`next start -p $PORT`) if Railway injects a non-3000 port.
4. Set `PDF_STORAGE_DIR`/`UPLOAD_STORAGE_DIR` to a path on a Railway volume if you want uploads to survive redeploys (Railway's default filesystem is ephemeral).
5. Railway builds/deploys on every push to the connected branch by default — pin this to your release branch.
**Rollback:** Railway keeps prior deployments; use "Redeploy" on the last-known-good deployment from the dashboard.

## Render
1. Create a **PostgreSQL** instance (Render manages backups automatically on paid tiers).
2. Create a **Web Service** from this repo: build command `npm ci && npx prisma generate && npm run build`, start command `npx prisma migrate deploy && npm run start`.
3. Add environment variables (`DATABASE_URL` from the Postgres instance's "Internal Database URL", `APP_URL=http://localhost:10000` if Render's default port is 10000 — confirm via `PORT` env var Render injects).
4. Attach a **persistent disk** mounted at `/app/storage` and `/app/public/uploads` if upload persistence across deploys matters (Render's default disk is ephemeral on the free tier).
**Rollback:** Render dashboard → Deploys → "Rollback" to a previous successful deploy.

## DigitalOcean (App Platform or Droplet)
**App Platform:** same build/start commands as Render; attach a Managed PostgreSQL database from the same account and use its connection string for `DATABASE_URL`.
**Droplet (self-managed):** install Docker, `git clone` this repo, run `docker compose up --build -d`. Put a reverse proxy (Caddy/Nginx) in front for TLS termination; `APP_URL` stays `http://localhost:3000` regardless of the public-facing domain, since Playwright always talks to the app over loopback.
**Backup (Droplet):** cron a nightly `pg_dump` to DigitalOcean Spaces (S3-compatible) or snapshot the Droplet.

## AWS EC2
1. Launch an EC2 instance (t3.small or larger — Chromium needs headroom), install Docker + Docker Compose.
2. `git clone` the repo, copy `.env.example` to `.env` and fill in real values, `docker compose up --build -d`.
3. Point an Application Load Balancer or Elastic IP + Route53 record at the instance; terminate TLS at the ALB.
4. For a managed database instead of the compose `db` service, provision RDS PostgreSQL 16 and point `DATABASE_URL` at it (skip the `db` service in compose, or comment it out).
**Backup:** RDS automated snapshots (if using RDS), or cron `pg_dump` to S3 (if using the compose `db` service on the instance itself).
**Rollback:** keep the previous Docker image tag available locally or in ECR; `docker compose up -d` after re-tagging rolls back instantly since the container just restarts against the same (unmodified) database.

## Azure (App Service or Container Instances)
**App Service (Web App for Containers):** push the built image to Azure Container Registry, point an App Service (Linux, container) at it. Provision **Azure Database for PostgreSQL Flexible Server** and set `DATABASE_URL`. App Service injects `PORT`; ensure the start command respects it (`next start -p $PORT`, or set `PORT=3000` and map App Service's port to 3000).
**Container Instances:** simpler for a single always-on container; same environment variables, no auto-scaling.
**Backup:** Azure Database for PostgreSQL's built-in automated backups (point-in-time restore).
**Rollback:** App Service deployment slots — deploy to a staging slot, swap; swapping back is the rollback.

## Migration Steps (all targets)
Run once per deploy, before starting the app (or automatically via `docker/entrypoint.sh` in the Docker path):
```bash
npx prisma migrate deploy
```
This applies any pending migrations in `prisma/migrations/` and never prompts (unlike `prisma migrate dev`). Never run `prisma migrate dev` or `prisma db push` against a production database.

## Build Commands (non-Docker targets)
```bash
npm ci
npx prisma generate
npm run build
```

## Rollback Strategy (general)
This project has not yet needed a destructive/backward-incompatible migration (see [decision-log.md](decision-log.md) for schema history) — every migration to date only adds columns/tables. Under that convention, rolling back the **application code** to a previous version is always safe without touching the database. If a future migration ever renames or drops a column, write it as two deploys (add-then-backfill, then remove-in-a-later-release) specifically so this rollback property is preserved — see [future-roadmap.md](future-roadmap.md) for tracking this as a standing engineering practice.

## Backup Strategy (general)
At minimum, a nightly `pg_dump` retained for 7–30 days, stored off the same host/instance as the database. Prefer your host's managed automated-backup feature (RDS, Azure Flexible Server, Render/Railway managed Postgres) over a hand-rolled cron job where available.
