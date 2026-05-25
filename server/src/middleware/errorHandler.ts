// ═══════════════════════════════════════════════════════════
// MEDHUB — Global Error Handler
// All unhandled errors route here via next(err).
// Never expose stack traces or internal detail in production.
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
        public readonly isOperational = true,
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler: ErrorRequestHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
): void => {
    // Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            ...(env.NODE_ENV === 'development' && {
                fields: err.flatten().fieldErrors,
            }),
        });
        return;
    }

    // Operational errors (thrown intentionally)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
        return;
    }

    // Unknown errors — log full error, return generic 500
    console.error('[Unhandled Error]', err);

    res.status(500).json({
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
        ...(env.NODE_ENV === 'development' && {
            detail: err instanceof Error ? err.message : String(err),
        }),
    });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
    res.status(404).json({
        error: 'Route not found',
        code: 'NOT_FOUND',
    });
};
