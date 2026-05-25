// ═══════════════════════════════════════════════════════════
// MEDHUB — JWT Authentication Middleware
// Verifies access token, checks jti blocklist, populates req.user
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isJtiBlocked } from '../lib/redis.js';
import { AppError } from './errorHandler.js';
import type { Role } from '@medhub/shared';
import { hasPermission, hasAnyPermission, type Permission } from '@medhub/shared';

export interface AuthPayload {
    sub: string;       // userId
    clinicId: string;
    role: Role;
    jti: string;
    iat: number;
    exp: number;
}

// Augment Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header');
        }

        const token = authHeader.slice(7);
        let payload: AuthPayload;

        try {
            payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
            }
            throw new AppError(401, 'UNAUTHORIZED', 'Invalid access token');
        }

        // Check jti blocklist — catches logged-out tokens that haven't expired yet
        if (await isJtiBlocked(payload.jti)) {
            throw new AppError(401, 'TOKEN_REVOKED', 'Token has been revoked');
        }

        req.user = payload;
        next();
    } catch (err) {
        next(err);
    }
}

// ─── Permission Guards ────────────────────────────────────────────────────────

export function requirePermission(permission: Permission) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
            return;
        }
        if (!hasPermission(req.user.role, permission)) {
            next(new AppError(403, 'FORBIDDEN', `Missing permission: ${permission}`));
            return;
        }
        next();
    };
}

export function requireAnyPermission(permissions: Permission[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
            return;
        }
        if (!hasAnyPermission(req.user.role, permissions)) {
            next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
            return;
        }
        next();
    };
}

export function requireRole(...roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new AppError(403, 'FORBIDDEN', 'Insufficient role'));
            return;
        }
        next();
    };
}
