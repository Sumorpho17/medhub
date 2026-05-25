// ═══════════════════════════════════════════════════════════
// MEDHUB — PouchDB Local Database Engine (Step 11)
// 
// Architecture:
//   - LSK (Local Storage Key) is returned by server on login/refresh
//   - LSK is NEVER stored on disk — kept in memory only (Zustand store)
//   - Encryption key is derived from LSK using Web Crypto API (PBKDF2)
//   - clinicId is used as the PBKDF2 salt for domain separation
//   - crypto-pouch applies AES-256-GCM encryption transparently to IndexedDB
//
// Key lifecycle:
//   Login → Server returns LSK → derive key → open encrypted DB
//   Token refresh → Server returns LSK again → re-open DB (same key)
//   Logout → wipe LSK from memory → DB closes → data remains encrypted at rest
//
// ⚠ pouchdb@7.3.1 is intentionally pinned — crypto-pouch 4.x is incompatible
//   with PouchDB 8.x. Do NOT upgrade pouchdb without testing crypto-pouch.
// ═══════════════════════════════════════════════════════════

import PouchDB from 'pouchdb-browser';
import cryptoPouch from 'crypto-pouch';
import { PBKDF2_ITERATIONS, getClinicDbName } from '@medhub/shared';

PouchDB.plugin(cryptoPouch);

// ─── Key Derivation (Web Crypto — browser safe) ───────────────────────────────

/**
 * Derives a 256-bit AES key from the LSK using PBKDF2-SHA256.
 * clinicId is used as the salt to ensure domain separation between clinics.
 * Returns the key as a hex string (crypto-pouch expects hex).
 */
export async function deriveDbKey(lsk: string, clinicId: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(lsk),
        { name: 'PBKDF2' },
        false,
        ['deriveBits'],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(clinicId),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256,
    );

    return Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ─── DB Instance Management ───────────────────────────────────────────────────

let localDb: PouchDB.Database | null = null;
let remoteDb: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<object> | null = null;

/**
 * Initialises and opens the encrypted local PouchDB for a clinic.
 * Called after successful login or token refresh (when LSK is available).
 */
export async function initDb(
    clinicId: string,
    lsk: string,
    couchDbUrl: string,
    couchDbUser: string,
    couchDbPassword: string,
): Promise<PouchDB.Database> {
    const key = await deriveDbKey(lsk, clinicId);
    const dbName = getClinicDbName(clinicId);

    // Close existing DB if open (e.g. re-login or token refresh)
    await closeDb();

    localDb = new PouchDB(dbName);

    // Apply AES-256-GCM encryption via crypto-pouch
    // All documents written to IndexedDB are encrypted transparently
    await (localDb as any).crypto(key);

    // Start bidirectional sync to CouchDB (Cloudant)
    remoteDb = new PouchDB(
        `${couchDbUrl}/${dbName}`,
        {
            auth: { username: couchDbUser, password: couchDbPassword },
            skip_setup: true,
        } as PouchDB.Configuration.RemoteDatabaseConfiguration,
    );

    syncHandler = localDb.sync(remoteDb, {
        live: true,
        retry: true,
    });

    syncHandler
        .on('change', (info) => console.debug('[PouchDB] Sync change:', info.direction))
        .on('error', (err) => console.warn('[PouchDB] Sync error:', err))
        .on('paused', () => console.debug('[PouchDB] Sync paused (offline or idle)'));

    return localDb;
}

/**
 * Returns the active local database instance.
 * Throws if the database has not been initialised (user not logged in).
 */
export function getDb(): PouchDB.Database {
    if (!localDb) {
        throw new Error('Local database not initialised. User must be logged in.');
    }
    return localDb;
}

/**
 * Closes the local database and cancels sync.
 * Called on logout — the encrypted data remains in IndexedDB at rest.
 * The LSK is wiped from memory by the auth store on logout.
 */
export async function closeDb(): Promise<void> {
    if (syncHandler) {
        syncHandler.cancel();
        syncHandler = null;
    }
    if (localDb) {
        await localDb.close();
        localDb = null;
    }
    remoteDb = null;
}

/**
 * Checks if the local database is currently open and syncing.
 */
export function isDbOpen(): boolean {
    return localDb !== null;
}
