// ═══════════════════════════════════════════════════════════
// MEDHUB — Audit Log Service (Step 6)
// All audit events pass through this service.
// Logs are HMAC-signed for tamper-evidence.
// Offline events carry their original device timestamp.
// ═══════════════════════════════════════════════════════════

import crypto from 'crypto';
import { Queue } from 'bullmq';
import prisma from '../lib/prismaClinicScope.js';
import redis from '../lib/redis.js';
import { env } from '../config/env.js';
import type { AuditEventInput } from '@medhub/shared';

// BullMQ queue for async audit log persistence
// If Redis is unavailable, falls back to direct write (no retry)
let auditQueue: Queue | null = null;

try {
    auditQueue = new Queue('audit-logs', {
        connection: redis,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1_000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 },
        },
    });
} catch {
    console.warn('[Audit] BullMQ queue unavailable — falling back to direct writes');
}

// ─── HMAC Signing ────────────────────────────────────────────────────────────

function signAuditEvent(event: AuditEventInput): string {
    const payload = [
        event.userId ?? '',
        event.action,
        event.resourceId ?? '',
        event.clinicId ?? '',
        event.timestamp,
    ].join('|');

    return crypto
        .createHmac('sha256', env.AUDIT_HMAC_SECRET)
        .update(payload)
        .digest('hex');
}

// ─── Direct Write ─────────────────────────────────────────────────────────────

async function writeAuditLog(event: AuditEventInput): Promise<void> {
    const hmacSignature = signAuditEvent(event);

    await prisma.auditLog.create({
        data: {
            action: event.action,
            resourceType: event.resourceType,
            resourceId: event.resourceId ?? null,
            result: event.result,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            hmacSignature,
            timestamp: new Date(event.timestamp),
            userId: event.userId ?? null,
            clinicId: event.clinicId ?? null,
            deviceId: event.deviceId ?? null,
            syncedAt: new Date(),
        },
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record an audit event.
 * Queues via BullMQ when available; falls back to direct write.
 * Never throws — audit failures must never break the primary request.
 */
export async function auditLog(event: AuditEventInput): Promise<void> {
    try {
        if (auditQueue) {
            await auditQueue.add('write', event);
        } else {
            await writeAuditLog(event);
        }
    } catch (err) {
        // Audit log failure is logged but never propagated
        console.error('[Audit] Failed to record audit event:', err);
    }
}

/**
 * Verify an audit log entry's HMAC signature.
 * Returns true if the signature matches — entry has not been tampered with.
 */
export function verifyAuditSignature(
    event: AuditEventInput,
    storedSignature: string,
): boolean {
    const expected = signAuditEvent(event);
    return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(storedSignature, 'hex'),
    );
}

// ─── BullMQ Worker (register in separate process for production) ──────────────
// In development, wire this up inline. For production, run as a separate worker.
// See: server/src/workers/auditWorker.ts (added in Step 8)
