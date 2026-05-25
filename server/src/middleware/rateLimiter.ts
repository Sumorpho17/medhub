// ═══════════════════════════════════════════════════════════
// MEDHUB — Rate Limiter Middleware
// Tiered limits: strict on auth endpoints, more relaxed elsewhere.
// Uses Redis-backed store for consistent limits across instances.
// ═══════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { RedisReply } from 'rate-limit-redis';
import { RedisStore } from 'rate-limit-redis';
import redis from '../lib/redis.js';

const store = new RedisStore({
    sendCommand: (...args: string[]) =>
        redis.call(args[0]!, ...args.slice(1) as (string | number | Buffer)[]) as Promise<RedisReply>,
});

/** Auth endpoints: 5 attempts per 15 minutes */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: {
        error: 'Too many login attempts. Please wait 15 minutes before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

/** Slow down before hard limit on auth: adds 500ms delay after 3 attempts */
export const authSlowDown = slowDown({
    windowMs: 15 * 60 * 1_000,
    delayAfter: 3,
    delayMs: (hits) => (hits - 3) * 500,
});

/** General API endpoints: 100 requests per minute */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: {
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

/** Registration: 3 per hour — clinic registration is rate-limited heavily */
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: {
        error: 'Too many registration attempts.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});
