// ═══════════════════════════════════════════════════════════
// MEDHUB — Shared Constants
// Single source of truth for all timing, security, and
// business logic constants used across client and server.
// ═══════════════════════════════════════════════════════════

// ─── Session & Auth ──────────────────────────────────────────────────────────

/** 72 hours in milliseconds — max offline session duration */
export const SESSION_MAX_OFFLINE_MS = 72 * 60 * 60 * 1_000;

/** 5 minutes of inactivity triggers session auto-lock on shared devices */
export const SESSION_INACTIVITY_LOCK_MS = 5 * 60 * 1_000;

/** Failed login attempts before account lockout */
export const LOCKOUT_ATTEMPTS = 5;

/** Account lockout duration: 15 minutes */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1_000;

/** Offline session expiry check interval: 30 minutes */
export const OFFLINE_EXPIRY_CHECK_INTERVAL_MS = 30 * 60 * 1_000;

// ─── Tokens ──────────────────────────────────────────────────────────────────

/** Access token lifetime in seconds (15 minutes) */
export const JWT_ACCESS_EXPIRY_SECONDS = 15 * 60;

/** Refresh token lifetime in days (7 days) */
export const JWT_REFRESH_EXPIRY_DAYS = 7;

// ─── Password Policy ─────────────────────────────────────────────────────────

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_REQUIREMENTS = {
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
} as const;

// ─── Sync ─────────────────────────────────────────────────────────────────────

/** CouchDB database name prefix for per-clinic databases */
export const COUCHDB_DB_PREFIX = 'db_clinic_';

/** CouchDB username prefix for per-clinic service accounts */
export const COUCHDB_USER_PREFIX = 'clinic_';

/** Constructs the per-clinic CouchDB database name */
export const getClinicDbName = (clinicId: string): string =>
    `${COUCHDB_DB_PREFIX}${clinicId}`;

/** Constructs the per-clinic CouchDB service account username */
export const getClinicDbUser = (clinicId: string): string =>
    `${COUCHDB_USER_PREFIX}${clinicId}`;

// ─── Subscription Tiers ──────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
    STARTER: {
        name: 'Starter',
        maxStaff: 3,
        maxDevices: 1,
        priceNGN: 65_000,
        modules: ['PATIENT_MANAGEMENT', 'BILLING'],
    },
    PROFESSIONAL: {
        name: 'Professional',
        maxStaff: 15,
        maxDevices: 5,
        priceNGN: 200_000,
        modules: ['PATIENT_MANAGEMENT', 'BILLING', 'PHARMACY', 'LABORATORY', 'APPOINTMENTS'],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        maxStaff: Infinity,
        maxDevices: Infinity,
        priceNGN: null, // Custom pricing
        modules: ['ALL'],
    },
} as const;

// ─── UI ───────────────────────────────────────────────────────────────────────

/** PBKDF2 iterations for PouchDB encryption key derivation (Web Crypto) */
export const PBKDF2_ITERATIONS = 600_000;
