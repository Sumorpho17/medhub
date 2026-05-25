// ═══════════════════════════════════════════════════════════
// MEDHUB — Auth Service (Step 7)
// Handles: register clinic, login, MFA setup/verify, 
//          token refresh, logout, device registration.
// All operations are audited. All clinic writes use withClinicScope.
// ═══════════════════════════════════════════════════════════

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import prisma, { withClinicScope } from '../lib/prismaClinicScope.js';
import { env } from '../config/env.js';
import { auditLog } from './audit.service.js';
import { assertPasswordNotBreached } from './hibp.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { blockJti } from '../lib/redis.js';
import {
    AuditAction,
    Role,
    ROLE_PERMISSIONS,
    LOCKOUT_ATTEMPTS,
    LOCKOUT_DURATION_MS,
    type RegisterClinicInput,
    type LoginInput,
} from '@medhub/shared';
import type { AuthPayload } from '../middleware/authenticate.js';

// ─── Token Generation ─────────────────────────────────────────────────────────

function generateAccessToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
}

function generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
}

// ─── LSK Encryption / Decryption ─────────────────────────────────────────────

function encryptLsk(plaintextLsk: string): string {
    const key = Buffer.from(env.LSK_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintextLsk, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptLsk(encryptedLsk: string): string {
    const [ivHex, dataHex] = encryptedLsk.split(':');
    if (!ivHex || !dataHex) throw new Error('Invalid LSK format');
    const key = Buffer.from(env.LSK_ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

// ─── Register Clinic  ─────────────────────────────────────────────────────────

export async function registerClinic(
    input: RegisterClinicInput,
    ipAddress: string,
): Promise<{ clinicId: string; userId: string }> {
    // Check password breach before hashing
    await assertPasswordNotBreached(input.password);

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    // Create clinic + admin user in a single transaction
    const clinic = await prisma.clinic.create({
        data: {
            name: input.clinicName,
            address: input.clinicAddress,
            phone: input.clinicPhone,
            registrationNumber: input.clinicRegistrationNumber ?? null,
            users: {
                create: {
                    email: input.email.toLowerCase(),
                    firstName: input.firstName,
                    lastName: input.lastName,
                    role: Role.CLINIC_ADMIN,
                    passwordHash,
                },
            },
        },
        include: { users: true },
    });

    const adminUser = clinic.users[0]!;

    await auditLog({
        userId: adminUser.id,
        role: Role.CLINIC_ADMIN,
        deviceId: null,
        clinicId: clinic.id,
        action: AuditAction.CLINIC_REGISTERED,
        resourceType: 'Clinic',
        resourceId: clinic.id,
        result: 'SUCCESS',
        ipAddress,
        userAgent: null,
        timestamp: new Date().toISOString(),
    });

    // Step 9 (CouchDB provisioning) calls provisionClinicDatabase(clinic.id) here
    // Kept separate to allow compensating transaction pattern

    return { clinicId: clinic.id, userId: adminUser.id };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
    input: LoginInput,
    ipAddress: string,
    userAgent: string | null,
): Promise<{
    accessToken: string;
    user: { id: string; email: string; firstName: string; lastName: string; role: Role; clinicId: string; mfaEnabled: boolean };
    permissions: string[];
    lsk: string;
    requiresMfa?: boolean;
}> {
    // Find user by email (no RLS needed — email is unique across all tenants)
    const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        include: { clinic: true },
    });

    const baseAuditFields = {
        userId: user?.id ?? null,
        role: (user?.role as unknown as Role) ?? null,
        deviceId: null,
        clinicId: user?.clinicId ?? null,
        resourceType: 'User',
        resourceId: user?.id ?? null,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
    };

    // Account lockout check
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
        const unlockInMs = user.lockedUntil.getTime() - Date.now();
        const unlockInMin = Math.ceil(unlockInMs / 60_000);
        await auditLog({ ...baseAuditFields, action: AuditAction.ACCOUNT_LOCKED, result: 'DENIED' });
        throw new AppError(
            423,
            'ACCOUNT_LOCKED',
            `Account is locked. Try again in ${unlockInMin} minute${unlockInMin !== 1 ? 's' : ''}.`,
        );
    }

    // Constant-time password check (prevents timing attacks)
    const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000';
    const passwordMatch = await bcrypt.compare(
        input.password,
        user?.passwordHash ?? dummyHash,
    );

    if (!user || !passwordMatch || !user.isActive) {
        if (user) {
            // Increment failed attempts
            const newAttempts = user.failedLoginAttempts + 1;
            const shouldLock = newAttempts >= LOCKOUT_ATTEMPTS;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newAttempts,
                    lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
                },
            });
            if (shouldLock) {
                await auditLog({ ...baseAuditFields, action: AuditAction.ACCOUNT_LOCKED, result: 'FAILURE' });
            }
        }
        await auditLog({ ...baseAuditFields, action: AuditAction.LOGIN_FAILED, result: 'FAILURE' });
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Reset failed attempts on successful password check (before MFA)
    await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // MFA check — if enabled, return requiresMfa flag (client must verify TOTP next)
    if (user.mfaEnabled) {
        await auditLog({ ...baseAuditFields, action: AuditAction.LOGIN_SUCCESS, result: 'SUCCESS' });
        return {
            accessToken: '',
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role as Role, clinicId: user.clinicId, mfaEnabled: true },
            permissions: [],
            lsk: '',
            requiresMfa: true,
        };
    }

    // Ensure device record + LSK exist
    const { lsk, deviceId } = await ensureDeviceLsk(user.id, user.clinicId, input);

    // Issue JWT
    const jti = uuidv4();
    const accessToken = generateAccessToken({
        sub: user.id,
        clinicId: user.clinicId,
        role: user.role as Role,
        jti,
    });

    // Issue refresh token — stored as bcrypt hash
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    await withClinicScope(user.clinicId, (tx) =>
        tx.refreshToken.create({
            data: {
                tokenHash,
                userId: user.id,
                clinicId: user.clinicId,
                deviceId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
            },
        }),
    );

    await auditLog({
        ...baseAuditFields,
        deviceId,
        action: AuditAction.LOGIN_SUCCESS,
        result: 'SUCCESS',
    });

    return {
        accessToken,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role as Role,
            clinicId: user.clinicId,
            mfaEnabled: user.mfaEnabled,
        },
        permissions: ROLE_PERMISSIONS[user.role as Role] as unknown as string[],
        lsk,
    };
}

// ─── MFA Setup ────────────────────────────────────────────────────────────────

export async function initiateMfaSetup(
    userId: string,
    clinicId: string,
): Promise<{ otpAuthUrl: string; base32Secret: string }> {
    const user = (await withClinicScope(clinicId, (tx) =>
        tx.user.findUniqueOrThrow({ where: { id: userId } }),
    )) as any;

    const secret = speakeasy.generateSecret({
        name: `MEDHUB (${user.email})`,
        issuer: env.MFA_ISSUER,
        length: 32,
    });

    // Store encrypted secret (not yet enabled — enabled after first verify)
    const encryptedSecret = encryptLsk(secret.base32); // Reuse AES helper
    await withClinicScope(clinicId, (tx) =>
        tx.user.update({
            where: { id: userId },
            data: { mfaSecret: encryptedSecret },
        }),
    );

    return {
        otpAuthUrl: secret.otpauth_url ?? '',
        base32Secret: secret.base32,
    };
}

export async function enableMfa(
    userId: string,
    clinicId: string,
    totpToken: string,
    ipAddress: string,
): Promise<void> {
    const user = (await withClinicScope(clinicId, (tx) =>
        tx.user.findUniqueOrThrow({ where: { id: userId } }),
    )) as any;

    if (!user.mfaSecret) {
        throw new AppError(400, 'MFA_NOT_INITIATED', 'MFA setup not started');
    }

    const base32Secret = decryptLsk(user.mfaSecret);
    const isValid = speakeasy.totp.verify({
        secret: base32Secret,
        encoding: 'base32',
        token: totpToken,
        window: 1,
    });

    if (!isValid) {
        await auditLog({
            userId, role: user.role, deviceId: null, clinicId,
            action: AuditAction.MFA_VERIFY_FAILED, resourceType: 'User', resourceId: userId,
            result: 'FAILURE', ipAddress, userAgent: null, timestamp: new Date().toISOString(),
        });
        throw new AppError(400, 'INVALID_MFA_TOKEN', 'Invalid MFA code');
    }

    await withClinicScope(clinicId, (tx) =>
        tx.user.update({ where: { id: userId }, data: { mfaEnabled: true } }),
    );

    await auditLog({
        userId, role: user.role, deviceId: null, clinicId,
        action: AuditAction.MFA_ENABLED, resourceType: 'User', resourceId: userId,
        result: 'SUCCESS', ipAddress, userAgent: null, timestamp: new Date().toISOString(),
    });
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshAccessToken(
    rawRefreshToken: string,
    deviceFingerprint: string,
    clinicId: string,
): Promise<{ accessToken: string; lsk: string }> {
    // Find device to validate fingerprint
    const device = (await withClinicScope(clinicId, (tx) =>
        tx.device.findFirst({ where: { fingerprint: deviceFingerprint, isRevoked: false } }),
    )) as any;

    if (!device) {
        throw new AppError(401, 'DEVICE_NOT_REGISTERED', 'Device not recognised');
    }

    // Find active refresh tokens for this device and verify hash
    const tokens = (await withClinicScope(clinicId, (tx) =>
        tx.refreshToken.findMany({
            where: { deviceId: device.id, isRevoked: false, expiresAt: { gt: new Date() } },
            include: { user: true },
        }),
    )) as any[];

    let matchedToken: any = null;
    for (const t of tokens) {
        if (await bcrypt.compare(rawRefreshToken, t.tokenHash)) {
            matchedToken = t;
            break;
        }
    }

    if (!matchedToken) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    // Rotate refresh token — revoke old, issue new
    await withClinicScope(clinicId, (tx) =>
        tx.refreshToken.update({ where: { id: matchedToken!.id }, data: { isRevoked: true } }),
    );

    const newRawToken = generateRefreshToken();
    const tokenHash = await bcrypt.hash(newRawToken, 10);
    await withClinicScope(clinicId, (tx) =>
        tx.refreshToken.create({
            data: {
                tokenHash,
                userId: matchedToken!.userId,
                clinicId,
                deviceId: device.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
            },
        }),
    );

    // Decrypt and return LSK — client needs it to open PouchDB after token refresh
    const lsk = decryptLsk(device.encryptedLsk);

    const jti = uuidv4();
    const accessToken = generateAccessToken({
        sub: matchedToken.userId,
        clinicId,
        role: matchedToken.user.role,
        jti,
    });

    return { accessToken, lsk };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(
    jti: string,
    jtiTtlSeconds: number,
    userId: string,
    clinicId: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<void> {
    // Block jti until natural expiry
    await blockJti(jti, jtiTtlSeconds);

    await auditLog({
        userId, role: null, deviceId: null, clinicId,
        action: AuditAction.LOGOUT, resourceType: 'User', resourceId: userId,
        result: 'SUCCESS', ipAddress, userAgent, timestamp: new Date().toISOString(),
    });
}

// ─── Device / LSK Helpers ─────────────────────────────────────────────────────

async function ensureDeviceLsk(
    userId: string,
    clinicId: string,
    input: LoginInput,
): Promise<{ lsk: string; deviceId: string }> {
    const existing = (await withClinicScope(clinicId, (tx) =>
        tx.device.findFirst({
            where: { fingerprint: input.deviceFingerprint, userId, isRevoked: false },
        }),
    )) as any;

    if (existing) {
        return { lsk: decryptLsk(existing.encryptedLsk), deviceId: existing.id };
    }

    // First login from this device — generate a new LSK
    const rawLsk = crypto.randomBytes(32).toString('hex');
    const encryptedLsk = encryptLsk(rawLsk);

    const device = (await withClinicScope(clinicId, (tx) =>
        tx.device.create({
            data: {
                name: input.deviceName ?? 'Unknown Device',
                fingerprint: input.deviceFingerprint,
                encryptedLsk,
                userId,
                clinicId,
                isRegistered: true,
            },
        }),
    )) as any;

    await auditLog({
        userId, role: null, deviceId: device.id, clinicId,
        action: AuditAction.DEVICE_REGISTERED, resourceType: 'Device', resourceId: device.id,
        result: 'SUCCESS', ipAddress: '', userAgent: null, timestamp: new Date().toISOString(),
    });

    return { lsk: rawLsk, deviceId: device.id };
}
