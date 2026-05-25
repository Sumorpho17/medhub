// ═══════════════════════════════════════════════════════════
// MEDHUB — Redis Client (Upstash / ioredis)
// Shared singleton for sessions, rate limiting, jti blocklist,
// and BullMQ job queues.
// ═══════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { env } from '../config/env.js';

const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
});

redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
    console.log('[Redis] Connected');
});

export default redis;

// ─── jti Blocklist (logout / immediate invalidation) ─────────────────────────

const JTI_PREFIX = 'jti:blocked:';

/**
 * Block a JWT by its jti claim.
 * TTL is set to the access token remaining lifetime so Redis auto-expires the key.
 * This prevents the blocklist from growing unboundedly.
 */
export async function blockJti(jti: string, ttlSeconds: number): Promise<void> {
    await redis.set(`${JTI_PREFIX}${jti}`, '1', 'EX', ttlSeconds);
}

/**
 * Returns true if the jti has been revoked (user logged out).
 */
export async function isJtiBlocked(jti: string): Promise<boolean> {
    const result = await redis.get(`${JTI_PREFIX}${jti}`);
    return result === '1';
}

// ─── Rate Limit Helpers ───────────────────────────────────────────────────────

export async function incrementRateLimit(
    key: string,
    windowSeconds: number,
): Promise<number> {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();
    return (results?.[0]?.[1] as number) ?? 0;
}
