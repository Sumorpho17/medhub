// ═══════════════════════════════════════════════════════════
// MEDHUB — Connection Health Check Script
// Run: pnpm run check:connections
// Exits 0 if all services reachable, exits 1 on any failure.
// Run this before running prisma migrate dev.
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { env } from '../config/env.js';

const TIMEOUT_MS = 5_000;

async function checkPostgres(): Promise<void> {
    const prisma = new PrismaClient();
    try {
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS),
            ),
        ]);
        console.log('✅ PostgreSQL (Supabase)  — connected');
    } finally {
        await prisma.$disconnect();
    }
}

async function checkRedis(): Promise<void> {
    const redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        connectTimeout: TIMEOUT_MS,
    });

    try {
        await Promise.race([
            redis.ping(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS),
            ),
        ]);
        console.log('✅ Redis (Upstash)        — connected');

        // BullMQ Lua script compatibility check
        const luaResult = await redis.eval('return 1', 0);
        if (luaResult === 1) {
            console.log('✅ Redis Lua (BullMQ)     — EVAL supported');
        } else {
            console.warn('⚠️  Redis Lua (BullMQ)     — EVAL returned unexpected result, BullMQ may fail');
        }
    } finally {
        redis.disconnect();
    }
}

async function checkCouchDb(): Promise<void> {
    const url = `${env.COUCHDB_URL}/_up`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${env.COUCHDB_ADMIN_USER}:${env.COUCHDB_ADMIN_PASS}`).toString('base64')}`,
            },
            signal: controller.signal,
        });

        if (res.ok) {
            console.log('✅ CouchDB (IBM Cloudant) — connected');
        } else {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
    } finally {
        clearTimeout(timer);
    }
}

async function main(): Promise<void> {
    console.log('\n🔍 MEDHUB — Checking cloud service connections...\n');

    const results = await Promise.allSettled([
        checkPostgres(),
        checkRedis(),
        checkCouchDb(),
    ]);

    const failed = results.filter((r) => r.status === 'rejected');

    if (failed.length > 0) {
        console.error('\n❌ Connection checks failed:');
        for (const f of failed) {
            if (f.status === 'rejected') {
                console.error('  ', f.reason instanceof Error ? f.reason.message : f.reason);
            }
        }
        console.error('\nFix the above issues, then re-run: pnpm run check:connections\n');
        process.exit(1);
    }

    console.log('\n✅ All services connected. Safe to run: pnpm prisma migrate dev\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
