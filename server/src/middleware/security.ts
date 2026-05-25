// ═══════════════════════════════════════════════════════════
// MEDHUB — Security Middleware
// Helmet with strict CSP tuned for a clinical PWA.
// ═══════════════════════════════════════════════════════════

import helmet from 'helmet';
import type { RequestHandler } from 'express';

export const securityMiddleware: RequestHandler[] = [
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires this
                imgSrc: ["'self'", 'data:', 'blob:'],     // Local image previews
                connectSrc: ["'self'", 'wss:'],           // WebSocket for sync
                mediaSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],               // Clickjacking protection
                upgradeInsecureRequests: [],
            },
        },
        hsts: {
            maxAge: 63_072_000, // 2 years
            includeSubDomains: true,
            preload: true,
        },
        crossOriginEmbedderPolicy: false, // Required for PouchDB IndexedDB access
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
];
