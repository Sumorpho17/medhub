// ═══════════════════════════════════════════════════════════
// MEDHUB — CORS Middleware
// Only allows the configured client origin.
// ═══════════════════════════════════════════════════════════

import corsLib from 'cors';
import { env } from '../config/env.js';

export const cors = corsLib({
    origin: env.CLIENT_URL,
    credentials: true, // Allow cookies (refresh token HttpOnly cookie)
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600, // 10 minutes preflight cache
});
