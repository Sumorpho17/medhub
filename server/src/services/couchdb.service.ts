// ═══════════════════════════════════════════════════════════
// MEDHUB — CouchDB Provisioning Service (Step 9)
// ⚠ READ BEFORE MODIFYING:
//   Test Cloudant _users API manually before enabling this service.
//   See README.md for the curl test command.
//   If Cloudant returns a permission error on _users writes,
//   switch to the Cloudant API key model instead of _users.
// ═══════════════════════════════════════════════════════════

import crypto from 'crypto';
import https from 'https';
import fetch from 'node-fetch';
import { env } from '../config/env.js';
import prisma from '../lib/prismaClinicScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { getClinicDbName, getClinicDbUser } from '@medhub/shared';

const httpsAgent = new https.Agent({
    rejectUnauthorized: true,
    keepAlive: true,
});

const COUCH_BASE_URL = env.COUCHDB_URL;
const COUCH_AUTH = `Basic ${Buffer.from(
    `${env.COUCHDB_ADMIN_USER}:${env.COUCHDB_ADMIN_PASS}`,
).toString('base64')}`;

async function couchRequest(
    method: string,
    path: string,
    body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
    const options: RequestInit = {
        method,
        headers: {
            Authorization: COUCH_AUTH,
            'Content-Type': 'application/json',
        },
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    const isHttps = COUCH_BASE_URL.startsWith('https://');
    const res = await fetch(`${COUCH_BASE_URL}${path}`, {
        ...options,
        agent: isHttps ? httpsAgent : undefined,
    } as any);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

// ─── Encrypt CouchDB Password ─────────────────────────────────────────────────

function decryptCouchPassword(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    if (!ivHex || !dataHex) throw new Error('Invalid encrypted CouchDB password');
    const key = Buffer.from(env.COUCHDB_CREDENTIAL_ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

function encryptCouchPassword(password: string): string {
    const key = Buffer.from(env.COUCHDB_CREDENTIAL_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Provisions a per-clinic CouchDB database + user.
 * Called during clinic registration as part of a compensating transaction:
 *   1. Postgres clinic record created first
 *   2. This function called second
 *   3. On failure: Postgres record is rolled back by calling deleteClinic(clinicId)
 *
 * ⚠ If Cloudant Lite restricts _users writes, implement the API key fallback
 *   and set couchdbUser + couchdbPasswordEncrypted to the API key details instead.
 */
export { decryptCouchPassword };

export async function provisionClinicDatabase(clinicId: string): Promise<void> {
    const dbName = getClinicDbName(clinicId);
    const dbUser = getClinicDbUser(clinicId);
    const dbPassword = crypto.randomBytes(24).toString('base64url');

    // Step 1: Create the per-clinic database
    const createDb = await couchRequest('PUT', `/${dbName}`);
    if (!createDb.ok && createDb.status !== 412) {
        // 412 = already exists (idempotent)
        throw new AppError(
            500,
            'COUCHDB_DB_CREATE_FAILED',
            `Failed to create CouchDB database for clinic ${clinicId}: HTTP ${createDb.status}`,
        );
    }

    // Step 2: Create the per-clinic service account in _users
    const userDoc = {
        name: dbUser,
        password: dbPassword,
        roles: [],
        type: 'user',
    };

    const createUser = await couchRequest(
        'PUT',
        `/_users/org.couchdb.user:${dbUser}`,
        userDoc,
    );

    if (!createUser.ok && createUser.status !== 412) {
        // Compensating: delete the database we just created
        await couchRequest('DELETE', `/${dbName}`).catch(() => null);
        throw new AppError(
            500,
            'COUCHDB_USER_CREATE_FAILED',
            `Failed to create CouchDB user for clinic ${clinicId}: HTTP ${createUser.status}`,
        );
    }

    // Step 3: Add a security document to restrict the database to this user only
    const securityDoc = {
        members: {
            names: [dbUser],
            roles: [],
        },
        admins: {
            names: [],
            roles: ['_admin'],
        },
    };

    const setSecurity = await couchRequest('PUT', `/${dbName}/_security`, securityDoc);
    if (!setSecurity.ok) {
        console.warn(
            `[CouchDB] Failed to set security on ${dbName}: HTTP ${setSecurity.status}`,
        );
    }

    // Step 4: Add validate_doc_update function to enforce clinicId integrity
    const designDoc = {
        _id: '_design/clinic_guard',
        validate_doc_update: `function(newDoc, oldDoc, userCtx) {
      if (newDoc._deleted) return;
      if (newDoc.clinicId !== '${clinicId}') {
        throw({ forbidden: 'Document clinicId does not match database clinicId' });
      }
      if (!userCtx.name) {
        throw({ unauthorized: 'Authentication required' });
      }
    }`,
    };

    await couchRequest('PUT', `/${dbName}/_design/clinic_guard`, designDoc);

    // Step 5: Persist credentials in Postgres (encrypted)
    await prisma.clinic.update({
        where: { id: clinicId },
        data: {
            couchdbDatabaseName: dbName,
            couchdbUser: dbUser,
            couchdbPasswordEncrypted: encryptCouchPassword(dbPassword),
        },
    });

    console.log(`[CouchDB] Provisioned database and user for clinic ${clinicId}`);
}

/**
 * Deprovisions a clinic's CouchDB database (used in compensating transactions).
 * Does not throw — logs and continues.
 */
export async function deprovisionClinicDatabase(clinicId: string): Promise<void> {
    const dbName = getClinicDbName(clinicId);
    const dbUser = getClinicDbUser(clinicId);

    await Promise.allSettled([
        couchRequest('DELETE', `/${dbName}`),
        couchRequest('DELETE', `/_users/org.couchdb.user:${dbUser}`),
    ]);

    console.log(`[CouchDB] Deprovisioned database/user for clinic ${clinicId}`);
}
