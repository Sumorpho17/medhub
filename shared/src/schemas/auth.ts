// ═══════════════════════════════════════════════════════════
// MEDHUB — Auth Zod Schemas
// Shared between client (UX validation) and server (security).
// ═══════════════════════════════════════════════════════════

import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../constants.js';
import { Role } from '../types/roles.js';

// ─── Password ────────────────────────────────────────────────────────────────

export const passwordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ─── Register Clinic ─────────────────────────────────────────────────────────

export const RegisterClinicSchema = z.object({
    // Clinic info
    clinicName: z.string().min(2).max(120),
    clinicAddress: z.string().min(5).max(255),
    clinicPhone: z
        .string()
        .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number format'),
    clinicRegistrationNumber: z.string().max(50).optional(),

    // Admin account
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    email: z.string().email(),
    password: passwordSchema,
});

export type RegisterClinicInput = z.infer<typeof RegisterClinicSchema>;

// ─── Login ───────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceFingerprint: z.string().min(1).max(256),
    deviceName: z.string().min(1).max(100).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ─── MFA ─────────────────────────────────────────────────────────────────────

export const MfaVerifySchema = z.object({
    token: z.string().length(6).regex(/^\d{6}$/, 'MFA token must be 6 digits'),
});

export type MfaVerifyInput = z.infer<typeof MfaVerifySchema>;

// ─── Token Refresh ───────────────────────────────────────────────────────────

export const RefreshSchema = z.object({
    deviceFingerprint: z.string().min(1).max(256),
});

export type RefreshInput = z.infer<typeof RefreshSchema>;

// ─── Change Password ─────────────────────────────────────────────────────────

export const ChangePasswordSchema = z
    .object({
        currentPassword: z.string().min(1),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ─── Auth Response Types ─────────────────────────────────────────────────────

export const AuthUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.nativeEnum(Role),
    clinicId: z.string().uuid(),
    mfaEnabled: z.boolean(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
    user: AuthUserSchema,
    permissions: z.array(z.string()),
    lsk: z.string(), // Plaintext LSK — in-memory only, never persist to localStorage
    requiresMfa: z.boolean().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshResponseSchema = z.object({
    lsk: z.string(), // Always returned on refresh — client needs it to re-open local DB
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
