// ═══════════════════════════════════════════════════════════
// MEDHUB — Auth Router (Step 7)
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// POST /api/v1/auth/mfa/setup
// POST /api/v1/auth/mfa/enable
// POST /api/v1/auth/refresh
// POST /api/v1/auth/logout
// ═══════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter, authSlowDown, registrationLimiter } from '../middleware/rateLimiter.js';
import {
    registerClinic,
    login,
    initiateMfaSetup,
    enableMfa,
    refreshAccessToken,
    logout,
    logoutAll,
} from '../services/auth.service.js';
import {
    RegisterClinicSchema,
    LoginSchema,
    MfaVerifySchema,
    RefreshSchema,
} from '@medhub/shared';
import { AppError } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const router = Router();

const getIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

// ─── POST /register ───────────────────────────────────────────────────────────

router.post(
    '/register',
    registrationLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = RegisterClinicSchema.parse(req.body);
            const result = await registerClinic(input, getIp(req));
            res.status(201).json({
                message: 'Clinic registered successfully',
                clinicId: result.clinicId,
            });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post(
    '/login',
    authLimiter,
    authSlowDown,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = LoginSchema.parse(req.body);
            const result = await login(input, getIp(req), req.headers['user-agent'] ?? null);

            if (result.requiresMfa) {
                res.status(200).json({ requiresMfa: true, user: result.user });
                return;
            }

            // Set refresh token as HttpOnly secure cookie
            res.cookie('refreshToken', result.rawRefreshToken, {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1_000, // 7 days in ms
                path: '/api/v1/auth/refresh',
            });

            res.json({
                accessToken: result.accessToken,
                user: result.user,
                permissions: result.permissions,
                lsk: result.lsk,
            });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /mfa/setup ─────────────────────────────────────────────────────────

router.post(
    '/mfa/setup',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { otpAuthUrl } = await initiateMfaSetup(
                req.user!.sub,
                req.user!.clinicId,
            );
            res.json({ otpAuthUrl });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /mfa/enable ────────────────────────────────────────────────────────

router.post(
    '/mfa/enable',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = MfaVerifySchema.parse(req.body);
            await enableMfa(req.user!.sub, req.user!.clinicId, token, getIp(req));
            res.json({ message: 'MFA enabled successfully' });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /refresh ────────────────────────────────────────────────────────────

router.post(
    '/refresh',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { deviceFingerprint } = RefreshSchema.parse(req.body);
            const rawRefreshToken = req.cookies['refreshToken'] as string | undefined;
            const clinicId = req.body.clinicId as string | undefined;

            if (!rawRefreshToken) {
                throw new AppError(401, 'MISSING_REFRESH_TOKEN', 'Refresh token cookie missing');
            }
            if (!clinicId) {
                throw new AppError(400, 'MISSING_CLINIC_ID', 'clinicId is required for refresh');
            }

            const { accessToken, lsk } = await refreshAccessToken(
                rawRefreshToken,
                deviceFingerprint,
                clinicId,
            );

            res.json({ accessToken, lsk });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /logout-all ─────────────────────────────────────────────────────────

router.post(
    '/logout-all',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await logoutAll(
                req.user!.sub,
                req.user!.clinicId,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
            res.json({ message: 'All sessions revoked successfully' });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post(
    '/logout',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { jti, exp } = req.user!;
            const ttl = Math.max(0, Math.floor(exp - Date.now() / 1_000));

            await logout(
                jti,
                ttl,
                req.user!.sub,
                req.user!.clinicId,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );

            res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
            res.json({ message: 'Logged out successfully' });
        } catch (err) {
            next(err);
        }
    },
);

export default router;
