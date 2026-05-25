// ═══════════════════════════════════════════════════════════
// MEDHUB — HaveIBeenPwned Service
// Checks passwords against known breaches using k-Anonymity.
// NEVER sends the full password — only first 5 chars of SHA-1.
// Gracefully degrades if HIBP_API_KEY is missing.
// ═══════════════════════════════════════════════════════════

import crypto from 'crypto';
import { env } from '../config/env.js';

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';

/**
 * Returns the number of times a password has been seen in known breaches.
 * Returns 0 if HIBP API is unavailable (graceful degradation).
 * Returns 0 if HIBP_API_KEY is not configured.
 */
export async function checkPasswordBreach(password: string): Promise<number> {
    // If no API key configured, skip the check and allow the password
    if (!env.HIBP_API_KEY) {
        console.warn('[HIBP] API key not configured — skipping breach check');
        return 0;
    }

    try {
        const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
        const prefix = sha1.slice(0, 5);
        const suffix = sha1.slice(5);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3_000);

        const res = await fetch(`${HIBP_API_URL}${prefix}`, {
            headers: {
                'hibp-api-key': env.HIBP_API_KEY,
                'Add-Padding': 'true', // Prevents traffic analysis
            },
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            console.warn(`[HIBP] API returned ${res.status} — skipping breach check`);
            return 0;
        }

        const body = await res.text();
        const match = body
            .split('\n')
            .find((line) => line.startsWith(suffix));

        if (!match) return 0;

        const count = parseInt(match.split(':')[1] ?? '0', 10);
        return count;
    } catch (err) {
        // Network failure, timeout, or any other error — degrade gracefully
        console.warn('[HIBP] Check failed (network/timeout) — allowing password:', err);
        return 0;
    }
}

/**
 * Throws AppError if the password has appeared in known breaches.
 */
export async function assertPasswordNotBreached(password: string): Promise<void> {
    const { AppError } = await import('../middleware/errorHandler.js');
    const breachCount = await checkPasswordBreach(password);
    if (breachCount > 0) {
        throw new AppError(
            400,
            'PASSWORD_BREACHED',
            `This password has appeared in ${breachCount.toLocaleString()} data breaches. Please choose a different password.`,
        );
    }
}
