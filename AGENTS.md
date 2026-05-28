# MEDHUB — Agent Guide

## Workspace

- **pnpm 9+ monorepo** with 3 workspaces: `client/`, `server/`, `shared/`
- `shared` has no build step — imported directly via `@medhub/shared` path alias in both client and server tsconfigs; its barrel export is at `shared/src/index.ts`

## Commands

| Command | What |
|---|---|
| `pnpm install` | Install all deps |
| `pnpm --filter server dev` | Dev server (tsx watch) on `:3000` |
| `pnpm --filter client dev` | Vite dev on `:5173` |
| `pnpm run dev:server` / `pnpm run dev:client` | Shorthand wrappers from root |
| `pnpm run build` | Order: `shared` → `server` → `client` |
| `pnpm run typecheck` | Order: `shared` → `server` → `client` |
| `pnpm --filter server run check:connections` | Verify cloud services connectivity |
| `pnpm --filter server prisma migrate deploy` | Apply Prisma migrations |
| `pnpm --filter server run prisma:seed` | Seed dev clinics/users |
| `pnpm --filter server test` | Vitest (no tests exist yet) |

## Architecture

- **Server**: Express + `tsx watch` (dev) / `tsc` (build). ESM (`"type": "module"`).
- **Client**: Vite 5 + React 18 + Tailwind + PWA. Dev proxy: `/api` → `localhost:3000`.
- **Shared**: Zod schemas, types, roles/permissions, constants. No runtime build — consumed via tsconfig `paths` + Vite alias.
- **`withClinicScope(clinicId, tx => …)`** is mandatory for all tenant-scoped Prisma queries. Uses `SET LOCAL app.clinic_id` in a transaction. Never call Prisma models directly for multi-tenant data — only super-admin internal ops use raw `prisma.*`.
- **Env loading** (`server/src/config/env.ts`): loads `.env` from both root and `server/`. Validates all vars via Zod at startup — process exits on missing/invalid config.

## Environment gotchas

- `DATABASE_URL`: must be **direct Postgres** or **Session Pooler (:5432)**. The Transaction Pooler (:6543) breaks `SET LOCAL` for RLS.
- `REDIS_URL`: must use `rediss://` or `redis://` Redis protocol. The REST API URL does not support BullMQ Lua scripting.
- Three separate **32-byte hex** encryption keys: `COUCHDB_CREDENTIAL_ENCRYPTION_KEY`, `LSK_ENCRYPTION_KEY`, `MFA_ENCRYPTION_KEY`.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: 64+ hex chars.
- `AUDIT_HMAC_SECRET` / `SYNC_HMAC_SECRET`: 64+ hex chars.
- Generation command: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` (32 for encryption keys).

## Notable

- `docker-compose.yml` is for **production/CI reference only** — local dev uses Supabase + Upstash + IBM Cloudant cloud tiers. Do not rely on it for local dev.
- **No tests exist** — Vitest is installed as a server devDependency but there are no test files, no vitest config, and no test suites.
- **No CI/CD** — no `.github/` directory, no workflow files.
- Refresh token is sent as an HttpOnly cookie (`path: '/api/v1/auth/refresh'`), not in the response body. The `POST /refresh` endpoint reads it from `req.cookies`.
- PWA service worker is enabled in dev mode (`devOptions.enabled: true` in vite config) — expect SW behavior in local dev.
- Server `tsconfig.json` excludes `prisma/seed.ts` — seed is run via `tsx` directly.
- Audit logs are append-only, HMAC-SHA256 signed, queued via BullMQ workers (started automatically in dev mode).
