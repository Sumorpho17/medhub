// ═══════════════════════════════════════════════════════════
// MEDHUB — Express Server Entry Point
// ═══════════════════════════════════════════════════════════

// env MUST be imported first — fails fast if any var is missing
import './config/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { securityMiddleware } from './middleware/security.js';
import { cors } from './middleware/cors.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { startAuditWorker } from './workers/auditWorker.js';

// Route imports (added as steps complete)
import authRouter from './routes/auth.js';

const app = express();

// ─── Core Middleware (order matters) ─────────────────────────────────────────
app.use(...securityMiddleware);
app.use(cors);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// General rate limiter on all routes
app.use(generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);

// ─── 404 + Error Handlers (must be last) ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
    console.log(`\n🚀 MEDHUB API running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Client origin: ${env.CLIENT_URL}\n`);

    if (env.NODE_ENV === 'development') {
        startAuditWorker();
    }
});

export default app;
