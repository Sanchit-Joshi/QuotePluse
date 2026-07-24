# Deployment

All deployment targets share the same three requirements:
1. A reachable PostgreSQL 16 database.
2. The environment variables in `.env.example` (`DATABASE_URL`, `APP_URL`, `PDF_STORAGE_DIR`, `UPLOAD_STORAGE_DIR`).
3. Enough memory/CPU to run headless Chromium for PDF generation (Playwright) alongside the Next.js server — budget at least 512MB RAM; 1GB+ recommended.

`APP_URL` **must** point at the URL the running server can reach itself at (see [ADR-007](decision-log.md)) — Playwright navigates to `${APP_URL}/quotations/:id/preview` to render PDFs. In every target below, this is `http://localhost:<port>` because Playwright always runs inside the same process/container as the server.

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
