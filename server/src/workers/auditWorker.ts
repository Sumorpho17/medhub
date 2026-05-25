// ═══════════════════════════════════════════════════════════
// MEDHUB — BullMQ Audit Worker (Step 8)
// Processes the 'audit-logs' queue asynchronously.
// Run as a separate process in production.
// In development, imported at server startup for convenience.
// ═══════════════════════════════════════════════════════════

import { Worker } from 'bullmq';
import crypto from 'crypto';
import redis from '../lib/redis.js';
import prisma from '../lib/prismaClinicScope.js';
import { env } from '../config/env.js';
import type { AuditEventInput } from '@medhub/shared';

export function startAuditWorker(): Worker {
    const worker = new Worker<AuditEventInput>(
        'audit-logs',
        async (job) => {
            const event = job.data;

            const payload = [
                event.userId ?? '',
                event.action,
                event.resourceId ?? '',
                event.clinicId ?? '',
                event.timestamp,
            ].join('|');

            const hmacSignature = crypto
                .createHmac('sha256', env.AUDIT_HMAC_SECRET)
                .update(payload)
                .digest('hex');

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
                    // deviceId is stored by audit.service — not part of AuditEventInput yet
                    syncedAt: new Date(),
                },
            });
        },
        {
            connection: redis,
            concurrency: 5,
        },
    );

    worker.on('completed', (job) => {
        if (process.env['NODE_ENV'] === 'development') {
            console.log(`[AuditWorker] Job ${job.id} completed — action: ${job.data.action}`);
        }
    });

    worker.on('failed', (job, err) => {
        console.error(`[AuditWorker] Job ${job?.id} failed:`, err.message);
    });

    console.log('[AuditWorker] Started');
    return worker;
}
