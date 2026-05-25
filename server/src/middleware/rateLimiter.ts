// ═══════════════════════════════════════════════════════════
// MEDHUB — Rate Limiter Middleware
// Tiered limits: strict on auth endpoints, more relaxed elsewhere.
// Uses in-memory store for development; swap to RedisStore for production.
// ═══════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/** Auth endpoints: 5 attempts per 15 minutes */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. Please wait 15 minutes before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    skipSuccessfulRequests: true, // Only count failed requests
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
    message: {
        error: 'Too many registration attempts.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});
