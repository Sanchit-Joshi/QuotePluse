# Deployment

All deployment targets share the same three requirements:
1. A reachable PostgreSQL 16 database.
2. The environment variables in `.env.example` (`DATABASE_URL`, `APP_URL`, `PDF_STORAGE_DIR`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_UPLOADS_BUCKET`).
3. Enough memory/CPU to run headless Chromium for PDF generation (Playwright) alongside the Next.js server — budget at least 512MB RAM; 1GB+ recommended.

`APP_URL` **must** point at the URL the running server can reach itself at (see [ADR-007](decision-log.md)) — Playwright navigates to `${APP_URL}/quotations/:id/preview` to render PDFs. In every target below, this is `http://localhost:<port>` because Playwright always runs inside the same process/container as the server.

## Vercel
Vercel is a serverless platform: there's no `docker compose`-style always-on container, so several parts of the stack need a different approach than everywhere else in this document — see ADR-010 and, importantly, **ADR-015** in [decision-log.md](decision-log.md), which covers four separate real bugs found and fixed by verifying an actual live deployment (`quotepluse.vercel.app`) end-to-end. Read it before touching any of this configuration — several of these settings look redundant or wrong in isolation but each one is fixing a specific, confirmed failure.

- **Build command is pinned via `vercel.json`, not Vercel's auto-detection.** `next build`'s default bundler doesn't fully trace `playwright-core`'s/`@sparticuz/chromium`'s non-code asset files for serverless deployment; `vercel.json`'s `"buildCommand": "next build --webpack"` opts back into the more mature webpack-based tracing. **Editing `package.json`'s `build` script has no effect on Vercel** — its Next.js framework preset always runs its own literal `next build`, ignoring `npm run build` entirely. `vercel.json` is the only thing Vercel actually reads for this.
- **`output: "standalone"` is automatically skipped when building on Vercel** (`next.config.ts` checks `process.env.VERCEL`) — that setting is only for the Docker image and actively breaks Vercel's own per-route function packaging.
- **PDF generation**: `PdfService` automatically detects `process.env.VERCEL` and switches from the full `playwright` package (used everywhere else) to `playwright-core` + `@sparticuz/chromium`. `next.config.ts` also explicitly externalizes `@sparticuz/chromium` in webpack and force-includes both packages' full directories via `outputFileTracingIncludes` for the two PDF routes — all three are required, not optional (ADR-015).
- **Database**: Vercel doesn't provide Postgres itself. Provision one of: **Neon** (recommended — serverless Postgres, generous free tier, native Vercel integration), **Supabase** (what this project's own deployment actually uses), or **Vercel Postgres** (also Neon-backed). Use the **pooled** connection string if offered (often a `-pooler` hostname) — serverless functions open many short-lived connections, and an unpooled connection string can exhaust a small Postgres instance's connection limit quickly.
- **File uploads (logo/signature)**: `/api/uploads` uploads to a Supabase Storage bucket (`SUPABASE_UPLOADS_BUCKET`, public-read) rather than local disk, so uploaded files persist across deploys and cold starts on Vercel (and everywhere else) — see [ADR-011](decision-log.md). Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (the **secret** key, never the publishable/anon key) as Environment Variables in the Vercel project. **Confirmed missing entirely on the first real deploy** (ADR-015) — don't assume these carried over from local `.env`; they must be added to Vercel separately.
- **Cold-start timeout risk (known, accepted trade-off):** the first PDF request after a function has been idle can exceed the 60s `maxDuration` ceiling while Chromium extracts/launches for the first time, returning `FUNCTION_INVOCATION_TIMEOUT` — a retry against the now-warm function succeeds in ~10s. `vercel.json` requests the max available function memory (1769 MB) for both PDF routes to shorten this window (more memory also means more CPU on Vercel), but a first-request failure is still possible on Hobby's 60s ceiling. Raising `maxDuration` further requires a paid plan.

### Steps
1. **This agent cannot complete this step for you**: sign in to [vercel.com](https://vercel.com) and click "Add New Project" → import the GitHub repo (`https://github.com/Sanchit-Joshi/QuotePluse`). Signing in and authorizing the GitHub connection is an OAuth flow only you can complete.
2. Vercel auto-detects Next.js and will show `next build` as the build command — this repo's `vercel.json` overrides that to `next build --webpack` automatically; you don't need to change anything in the dashboard.
3. Before the first deploy, add these Environment Variables in the Vercel project's Settings (Production, and Preview if you use preview deployments):
   - `DATABASE_URL` — your Neon/Supabase connection string (pooled, with `?sslmode=require`).
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_UPLOADS_BUCKET` — required for logo/signature uploads (ADR-011); easy to forget since they're separate from `DATABASE_URL`.
   - `APP_URL` — **do not set this.** `pdf.service.ts` falls back to `https://${VERCEL_URL}` automatically, which is more robust (self-correct per-deployment). Setting it to a placeholder like `http://localhost:3000` — e.g. copied verbatim from `.env.example` — silently breaks every PDF generation with `ERR_CONNECTION_REFUSED` (ADR-015). Only set it explicitly if you attach a custom domain and specifically want PDFs rendered against that domain.
4. Run the initial migration against the new database **once**, from your local machine, pointed at the production `DATABASE_URL`:
   ```bash
   DATABASE_URL="<your Neon connection string>" npx prisma migrate deploy
   ```
   (Vercel's build step does not run migrations automatically — there's no reliable single "this is the first deploy" hook. Run `prisma migrate deploy` locally against the target database after adding new migrations, before or right after each deploy that includes schema changes.)
5. Deploy. Test PDF generation specifically after deploying — it's the one part of the stack that doesn't fail loudly at build time (see ADR-015's whole diagnosis story). `GET /api/health` includes a `commit` field (the deployed git SHA) — useful for confirming a fix actually rolled out before re-testing.
**Rollback:** Vercel keeps every deployment; use "Promote to Production" on a previous deployment from the dashboard, or `vercel redeploy <deployment-url> --target production` from the CLI.
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
4. Set `PDF_STORAGE_DIR` to a path on a Railway volume if you want generated PDFs cached across redeploys (Railway's default filesystem is ephemeral). Logo/signature uploads already persist regardless, via Supabase Storage — set `SUPABASE_URL`/`SUPABASE_SECRET_KEY`/`SUPABASE_UPLOADS_BUCKET`.
5. Railway builds/deploys on every push to the connected branch by default — pin this to your release branch.
**Rollback:** Railway keeps prior deployments; use "Redeploy" on the last-known-good deployment from the dashboard.

## Render
1. Create a **PostgreSQL** instance (Render manages backups automatically on paid tiers).
2. Create a **Web Service** from this repo: build command `npm ci && npx prisma generate && npm run build`, start command `npx prisma migrate deploy && npm run start`.
3. Add environment variables (`DATABASE_URL` from the Postgres instance's "Internal Database URL", `APP_URL=http://localhost:10000` if Render's default port is 10000 — confirm via `PORT` env var Render injects).
4. Attach a **persistent disk** mounted at `/app/storage` if generated-PDF caching across deploys matters (Render's default disk is ephemeral on the free tier). Logo/signature uploads already persist regardless, via Supabase Storage — set `SUPABASE_URL`/`SUPABASE_SECRET_KEY`/`SUPABASE_UPLOADS_BUCKET`.
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
