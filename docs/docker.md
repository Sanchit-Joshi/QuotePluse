# Docker

## Images

### `Dockerfile` (production)
Two stages:
1. **builder** (`node:22-slim`) — `npm ci`, `prisma generate`, `next build`.
2. **runner** (`mcr.microsoft.com/playwright:v1.61.1-noble`) — the official Playwright image, which already ships Chromium plus every system library it needs (see [ADR-007](decision-log.md), PDF generation requires a real browser). Copies over `node_modules`, `.next`, `public`, `prisma/` (schema + migrations), and `package.json` from the builder stage, then runs as the image's existing non-root `pwuser` (uid/gid 1001) — reused rather than creating a new user, since `pwuser` already has the permissions Chromium's sandbox expects.

**Design tradeoff:** the runner stage keeps the *full* `node_modules` (not a pruned `standalone` output) so the container can run `prisma migrate deploy` with the real Prisma CLI at startup, using the same image that serves the app. `next.config.ts` still sets `output: "standalone"` for a future optimization (a slimmer image that doesn't need the CLI, once migrations are run as a separate deploy step) — see [future-roadmap.md](future-roadmap.md).

The container entrypoint (`docker/entrypoint.sh`) runs `prisma migrate deploy` before starting `next start`, so migrations apply automatically on every deploy/restart.

### `Dockerfile.dev` (development)
Single stage on the same Playwright base image, full `npm ci` (including devDependencies), source mounted as a volume by `docker-compose.dev.yml` for hot reload via `next dev`. No migration step — run `npx prisma migrate dev` manually as you change the schema, same as local (non-Docker) development.

## docker-compose

### `docker-compose.yml` (default — production-like)
- `db`: `postgres:16-alpine`, named volume `postgres_data`, healthcheck via `pg_isready`.
- `app`: builds `Dockerfile`, waits for `db`'s healthcheck, runs migrations then starts the server, healthcheck via `/api/health`. Named volumes `app_storage` (generated PDFs, if persisted to disk in the future) and `app_uploads` (logo/signature files — see FR-7.1) survive container recreation.

```bash
docker compose up --build
```

### `docker-compose.dev.yml` (development override)
Adds source-code volume mounts and switches the `app` service to `Dockerfile.dev` / `next dev`.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Environment Variables
See `.env.example`. When running via docker-compose, `DATABASE_URL` and `APP_URL` are constructed automatically from the compose file's own variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `APP_PORT`) — you don't need to hand-write a `.env` for the containers themselves, only if you want to override the defaults (create a `.env` file next to `docker-compose.yml`; Compose reads it automatically for `${VAR}` substitution).

## Healthchecks
- `db`: `pg_isready`.
- `app`: `GET /api/health` (checks the app can reach Postgres via `SELECT 1`), matching the Docker `HEALTHCHECK` instruction in the Dockerfile itself (used when running the image outside Compose, e.g. directly with `docker run`).

## Volumes
| Volume | Purpose | Persisted across `docker compose down` (no `-v`) |
|---|---|---|
| `postgres_data` | PostgreSQL data directory | Yes |
| `app_storage` | Reserved for future on-disk PDF caching | Yes |
| `app_uploads` | Company logo/signature uploads (`public/uploads`) | Yes |

Run `docker compose down -v` to also delete volumes (irreversible — drops the database).

## Common Commands
```bash
# Build and start everything (production-like)
docker compose up --build -d

# Follow app logs
docker compose logs -f app

# Run a one-off Prisma command inside the running app container
docker compose exec app npx prisma studio

# Tear down (keep data)
docker compose down

# Tear down and delete all data
docker compose down -v
```
