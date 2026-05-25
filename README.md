# MEDHUB — Clinical Hospital Management System

> **"Your clinic. Always on. Always secure."**
> 
> A premium, clinical-grade, offline-first Hospital Management System (HMS) tailored for private clinics in Nigeria and sub-Saharan Africa. Engineered as a secure, multi-tenant monorepo that ensures continuous operation even during grid outages or network instability.

---

## 🚀 Phase 0 Foundation: Fully Built & Verified

The core multi-tenant offline-first foundation (Phase 0) is fully operational. The backend services, cloud databases, frontend React app, local encrypted databases, and service worker caching are completely wired and verified.

### Core Architectural Features Built

1. **Strict Monorepo Architecture**: Integrated `pnpm` workspaces separating concerns into `/client`, `/server`, and `/shared`.
2. **Multi-Tenant Relational Schema (PostgreSQL via Supabase)**: Row-Level Security (RLS) policies implemented at the database layer. Database calls are encapsulated in clinic-scoped transactions using `withClinicScope(clinicId, tx => ...)` to isolate tenant records securely.
3. **Robust Security & Session Management**:
   - **JWT Authentication**: Short-lived (15 min) access tokens + secure, HttpOnly, SameSite=Strict cookies.
   - **Token Rotation & Revocation**: Refresh tokens managed in a live Upstash Redis store with rotation and fast revocation checks.
   - **LSK Encryption Derivation**: Computes a Local Storage Key (LSK) from the user session using PBKDF2 Web Crypto key derivation in the browser. The key encrypts local PouchDB databases using AES-256-GCM.
   - **Brute-Force & Password Safety**: Implements account lockouts after 5 consecutive failures, HaveIBeenPwned password safety checks, and 5-minute inactivity auto-locks.
4. **Append-Only Auditing**: Custom HMAC-SHA256 signature-verified logging queued asynchronously using Redis BullMQ workers (`AuditWorker`) to prevent tampering.
5. **Bidirectional Sync Engine**: Replicates local PouchDB instances with Railway CouchDB databases (`db_clinic_{id}`) over continuous online modes, queueing writes during offline gaps.
6. **Progressive Web App (PWA)**: Fully active service worker (via `vite-plugin-pwa`) managing assets precaching, offline fallback pages, and installation.

---

## 📂 Project Structure

```
medhub/
├── client/             # React 18 + Vite + TypeScript (PWA & Offline UI)
│   ├── src/
│   │   ├── hooks/      # Offline state, hooks, and session guards
│   │   ├── lib/        # API client and local PouchDB setup
│   │   ├── pages/      # Styled Login, Registration, and Dashboard Shell
│   │   ├── services/   # Auth state helper wrapper
│   │   └── stores/     # Zustand stores (Auth & UI state)
│   ├── postcss.config.js # Tailwind CSS compilation configuration
│   └── tailwind.config.js # Theme tokens, color palettes, and fonts
├── server/             # Express + TypeScript API Server
│   ├── prisma/         # Prisma schemas, migrations, and seed scripts
│   └── src/
│       ├── middleware/ # Security, CORS, and rate limiters
│       ├── routes/     # Auth and validation routers
│       ├── workers/    # BullMQ Audit Log Queue Worker
│       └── index.ts    # API Entry point
└── shared/             # Shared validation schemas & utility types
    └── src/
        ├── schemas/    # Zod schemas (Login, Register, MFA, Password)
        └── types/      # Common roles, permissions, and audit types
```

---

## 🛠️ Infrastructure Requirements (Cloud Dev)

To run the application, configure accounts with the following cloud service providers:

| Service | Provider | Purpose | Source |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | [Supabase](https://supabase.com) | Relational database + custom tenant RLS policies | PostgreSQL settings |
| **Redis** | [Upstash](https://upstash.com) | Refresh token tracking, lockout lists, rate limit, BullMQ queues | Native Redis Connection Protocol (`rediss://`) |
| **CouchDB** | [Railway / IBM Cloudant](https://railway.app) | Per-clinic patient records replication target | Cloud CouchDB URL |

---

## ⚙️ Local Setup & Startup

### 1. Monorepo Installation & Environment Configuration
Clone the repository and install dependencies from the root directory:
```bash
pnpm install
```

Create a `.env` file in both the **root** folder and **`server/`** folder following the structure in `.env.example`:
* Set `DATABASE_URL` to your Supabase Session Pooler (port `5432`).
* Set `REDIS_URL` to your Upstash Redis protocol string (`rediss://...`).
* Set `COUCHDB_URL` to your CouchDB/Railway instance URL.

### 2. Verify Cloud Connections
Run the connection check utility to verify that all cloud backends are online and accessible:
```bash
pnpm --filter server run check:connections
```
_Expected Output:_
```
🔍 MEDHUB — Checking cloud service connections...

✅ Redis (Upstash)        — connected
✅ CouchDB (Railway)      — connected
✅ Redis Lua (BullMQ)     — EVAL supported
✅ PostgreSQL (Supabase)  — connected

✅ All services connected.
```

### 3. Deploy Databases & Seed Test Users
Deploy your Prisma migrations and seed the database with development tenants and roles:
```bash
# Apply RLS and table definitions to Supabase
pnpm --filter server prisma migrate deploy

# Seed clinics and admin credentials
pnpm --filter server prisma db seed
```

### 4. Run Development Servers
Start both the API backend and the React app concurrently:
```bash
# Terminal 1: Starts Express server on http://localhost:3000
npm run dev:server

# Terminal 2: Starts Vite client on http://localhost:5173
npm run dev:client
```

---

## 🔍 Verification Flow & Test Accounts

Once the development servers are up, open **`http://localhost:5173/`** in your browser. The application will redirect you to `/login`.

### Seeded Credentials
Use these pre-seeded clinic accounts to log in and test multi-tenancy:
* **Lagos Premier Clinic (Clinic 1)**
  - **Clinic Admin**: `admin@lagospremier.test` / `TestPass!123`
  - **Doctor**: `doctor@lagospremier.test` / `TestPass!123`
* **Abuja Medical Centre (Clinic 2)**
  - **Clinic Admin**: `admin@abujamed.test` / `TestPass!456`

### Testing Offline Features & Sync
1. Log in as `admin@lagospremier.test`.
2. Observe the green pulsing dot badge in the top right displaying **"Online"** / **"Syncing Active"**, confirming that your local PouchDB has successfully completed key derivation and started replicating with CouchDB.
3. Use the browser's address bar to click the **Install App** icon to run MEDHUB as a standalone PWA.
4. Toggle your browser devtools to **Offline** mode. The status dot will update to reflect the disconnected state. You can continue navigating, and all local records will store securely using browser IndexedDB.
5. Restore the network connection. Re-replication begins automatically, shipping queued writes and signed logs.

---

## 💡 Key Resolutions Implemented during Verification

* **CSS Compilation Fix**: Added `client/postcss.config.js` to process and compile Tailwind directives under Vite.
* **Form Validation Fix**: Resolved a Zod validation mismatch in [LoginPage.tsx](file:///C:/Users/HP%20650%20G4/.gemini/antigravity/scratch/medhub/client/src/pages/LoginPage.tsx) where an empty `deviceFingerprint` string blocked submissions silently.
* **Vite Node Polyfills**: Integrated `vite-plugin-node-polyfills` to resolve missing browser-level node builtins (`Buffer`, `global`, `process`) required by PouchDB crypto.
* **Prisma configuration dynamic RLS**: Resolved string interpolation errors in Prisma transaction parameters by using `executeRawUnsafe` for RLS configuration bindings.
