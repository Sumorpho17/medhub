// ═══════════════════════════════════════════════════════════
// MEDHUB — Environment Configuration
// Validates ALL env vars at startup — fails fast if any missing.
// This is the only place process.env is read in application code.
// Use the exported `env` object everywhere else.
// ═══════════════════════════════════════════════════════════

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from workspace root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { z } from 'zod';

const EnvSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CLIENT_URL: z.string().url(),

    DATABASE_URL: z.string().url().refine(
        (url) => {
            if (url.includes('pooler.supabase.com')) {
                // Session Pooler (port 5432) is RLS-safe because it maintains dedicated connections;
                // Transaction Pooler (port 6543) breaks SET LOCAL transaction isolation.
                return url.includes(':5432/');
            }
            return true;
        },
        'DATABASE_URL must be a direct Postgres connection or use the Session Pooler (port 5432) — Transaction Pooler (port 6543) breaks RLS transaction isolation',
    ),

    // Redis — must be Redis protocol (not REST)
    REDIS_URL: z.string().refine(
        (url) => url.startsWith('rediss://') || url.startsWith('redis://'),
        'REDIS_URL must use Redis protocol (rediss:// or redis://), not the REST API URL',
    ),

    // CouchDB
    COUCHDB_URL: z.string().url(),
    COUCHDB_ADMIN_USER: z.string().min(1),
    COUCHDB_ADMIN_PASS: z.string().min(1),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(64),
    JWT_REFRESH_SECRET: z.string().min(64),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

    // HMAC
    AUDIT_HMAC_SECRET: z.string().min(64),
    SYNC_HMAC_SECRET: z.string().min(64),

    // MFA
    MFA_ISSUER: z.string().min(1).default('MEDHUB'),

    // ExternalAPIs
    HIBP_API_KEY: z.string().optional(), // Nullable — degrades gracefully if absent

    // Encryption keys — deliberately separate
    COUCHDB_CREDENTIAL_ENCRYPTION_KEY: z.string().length(64, 'Must be a 32-byte hex string (64 hex chars)'),
    LSK_ENCRYPTION_KEY: z.string().length(64, 'Must be a 32-byte hex string (64 hex chars)'),
});

function validateEnv() {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Server startup failed — invalid environment configuration:');
        console.error(result.error.format());
        process.exit(1);
    }
    return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof EnvSchema>;
