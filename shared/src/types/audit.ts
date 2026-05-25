// ═══════════════════════════════════════════════════════════
// MEDHUB — Audit Log Types
// All audit events must use these types.
// AuditLog entries are append-only and HMAC-signed.
// ═══════════════════════════════════════════════════════════

import type { Role } from './roles.js';

export enum AuditAction {
    // Auth events
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    MFA_SETUP_INITIATED = 'MFA_SETUP_INITIATED',
    MFA_ENABLED = 'MFA_ENABLED',
    MFA_VERIFY_FAILED = 'MFA_VERIFY_FAILED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    REGISTRATION = 'REGISTRATION',

    // Tenant / clinic events
    CLINIC_REGISTERED = 'CLINIC_REGISTERED',

    // Staff management
    STAFF_CREATED = 'STAFF_CREATED',
    STAFF_DEACTIVATED = 'STAFF_DEACTIVATED',
    ROLE_CHANGED = 'ROLE_CHANGED',

    // Device events
    DEVICE_REGISTERED = 'DEVICE_REGISTERED',
    DEVICE_REVOKED = 'DEVICE_REVOKED',
    REMOTE_WIPE_INITIATED = 'REMOTE_WIPE_INITIATED',

    // Patient record access (Phase 1+)
    PATIENT_RECORD_READ = 'PATIENT_RECORD_READ',
    PATIENT_RECORD_CREATED = 'PATIENT_RECORD_CREATED',
    PATIENT_RECORD_UPDATED = 'PATIENT_RECORD_UPDATED',

    // Sync events
    SYNC_CONFLICT_FLAGGED = 'SYNC_CONFLICT_FLAGGED',

    // Security events
    UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
    RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
}

export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditEventInput {
    userId: string | null;
    role: Role | null;
    deviceId: string | null;
    clinicId: string | null;
    action: AuditAction;
    resourceType: string | null;
    resourceId: string | null;
    result: AuditResult;
    ipAddress: string;
    userAgent: string | null;
    /** ISO 8601 timestamp — always set to original event time (critical for offline events) */
    timestamp: string;
}
