import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma, { withClinicScope } from '../lib/prismaClinicScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from './audit.service.js';
import { encryptLsk } from './auth.service.js';
import { env } from '../config/env.js';
import {
    AuditAction,
    Role,
    type InviteStaffInput,
    type UpdateStaffInput,
    type UserPublic,
} from '@medhub/shared';

const INVITE_EXPIRY_HOURS = 72;

export async function inviteStaff(
    input: InviteStaffInput,
    clinicId: string,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<{ inviteUrl: string; expiresAt: string; token: string }> {
    // Check subscription limits
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError(404, 'CLINIC_NOT_FOUND', 'Clinic not found');
    const staffCount = await prisma.user.count({ where: { clinicId, isActive: true, role: { not: Role.CLINIC_ADMIN } } });
    const maxStaff = clinic.subscriptionTier === 'STARTER' ? 3 : clinic.subscriptionTier === 'PROFESSIONAL' ? 15 : Infinity;
    if (staffCount >= maxStaff) {
        throw new AppError(400, 'STAFF_LIMIT_REACHED', `Subscription limit of ${maxStaff} staff reached`);
    }
    // Check if email already exists in this clinic
    const existing = await prisma.user.findFirst({ where: { email: input.email.toLowerCase(), clinicId } });
    if (existing) {
        throw new AppError(409, 'STAFF_ALREADY_EXISTS', 'A user with this email already exists in your clinic');
    }
    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1_000);
    await withClinicScope(clinicId, (tx) =>
        tx.staffInvite.create({
            data: {
                email: input.email.toLowerCase(),
                firstName: input.firstName,
                lastName: input.lastName,
                role: input.role,
                token,
                expiresAt,
                clinicId,
            },
        }),
    );
    const inviteUrl = `${env.CLIENT_URL}/accept-invite?token=${token}`;
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.STAFF_CREATED,
        resourceType: 'StaffInvite', resourceId: null,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return { inviteUrl, expiresAt: expiresAt.toISOString(), token };
}

export async function acceptInvite(
    token: string,
    password: string,
    deviceFingerprint: string,
    deviceName: string | undefined,
    ipAddress: string,
): Promise<{ user: UserPublic; accessToken: string; rawRefreshToken: string; lsk: string }> {
    const invite = await prisma.staffInvite.findUnique({ where: { token } });
    if (!invite || invite.accepted || invite.expiresAt < new Date()) {
        throw new AppError(400, 'INVITE_INVALID', 'This invite link is invalid or has expired');
    }
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    // Create user and mark invite accepted in a transaction
    const result = await withClinicScope(invite.clinicId, async (tx) => {
        const user = await tx.user.create({
            data: {
                email: invite.email,
                firstName: invite.firstName,
                lastName: invite.lastName,
                role: invite.role,
                passwordHash,
                clinicId: invite.clinicId,
            },
        });
        await tx.staffInvite.update({ where: { id: invite.id }, data: { accepted: true } });
        return user;
    });
    // Generate tokens and LSK
    const rawLsk = crypto.randomBytes(32).toString('hex');
    const encryptedLsk = encryptLsk(rawLsk);
    const device = (await withClinicScope(invite.clinicId, (tx) =>
        tx.device.create({
            data: {
                name: deviceName ?? 'Invite Accepted Device',
                fingerprint: deviceFingerprint,
                encryptedLsk,
                userId: result.id,
                clinicId: invite.clinicId,
                isRegistered: true,
            },
        }),
    )) as { id: string };
    const jti = uuidv4();
    const accessToken = jwt.sign(
        { sub: result.id, clinicId: invite.clinicId, role: result.role, jti },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRY as any },
    );
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    await withClinicScope(invite.clinicId, (tx) =>
        tx.refreshToken.create({
            data: {
                tokenHash,
                userId: result.id,
                clinicId: invite.clinicId,
                deviceId: device.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
            },
        }),
    );
    await auditLog({
        userId: result.id, role: (result.role as Role), deviceId: device.id, clinicId: invite.clinicId,
        action: AuditAction.LOGIN_SUCCESS, resourceType: 'User', resourceId: result.id,
        result: 'SUCCESS', ipAddress, userAgent: null,
        timestamp: new Date().toISOString(),
    });
    return {
        user: {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            role: result.role as Role,
            clinicId: result.clinicId,
            isActive: result.isActive,
            mfaEnabled: result.mfaEnabled,
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString(),
        },
        accessToken,
        rawRefreshToken,
        lsk: rawLsk,
    };
}

export async function listStaff(
    clinicId: string,
    page: number,
    limit: number,
    role?: string,
    search?: string,
): Promise<{ staff: UserPublic[]; total: number; page: number; limit: number }> {
    const where: any = { clinicId, role: { not: Role.CLINIC_ADMIN } };
    if (role) where.role = role;
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
        ];
    }
    const [staff, total] = await Promise.all([
        withClinicScope(clinicId, (tx) =>
            tx.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
        ),
        prisma.user.count({ where }),
    ]);
    return {
        staff: (staff as any[]).map((u: any) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            clinicId: u.clinicId,
            isActive: u.isActive,
            mfaEnabled: u.mfaEnabled,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
    };
}

export async function updateStaff(
    staffId: string,
    clinicId: string,
    input: UpdateStaffInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<UserPublic> {
    const staff = await withClinicScope(clinicId, (tx) =>
        tx.user.findFirst({ where: { id: staffId, clinicId } }),
    );
    if (!staff) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    if ((staff as any).role === Role.CLINIC_ADMIN) {
        throw new AppError(400, 'CANNOT_MODIFY_ADMIN', 'Cannot modify clinic admin via staff management');
    }
    const updated = await withClinicScope(clinicId, (tx) =>
        tx.user.update({ where: { id: staffId }, data: input as any }),
    );
    if (input.role) {
        await auditLog({
            userId, role: userRole as any, deviceId: null, clinicId,
            action: AuditAction.ROLE_CHANGED, resourceType: 'User', resourceId: staffId,
            result: 'SUCCESS', ipAddress, userAgent, timestamp: new Date().toISOString(),
        });
    }
    if (input.isActive === false) {
        await auditLog({
            userId, role: userRole as any, deviceId: null, clinicId,
            action: AuditAction.STAFF_DEACTIVATED, resourceType: 'User', resourceId: staffId,
            result: 'SUCCESS', ipAddress, userAgent, timestamp: new Date().toISOString(),
        });
    }
    return {
        id: (updated as any).id,
        email: (updated as any).email,
        firstName: (updated as any).firstName,
        lastName: (updated as any).lastName,
        role: (updated as any).role,
        clinicId: (updated as any).clinicId,
        isActive: (updated as any).isActive,
        mfaEnabled: (updated as any).mfaEnabled,
        createdAt: (updated as any).createdAt.toISOString(),
        updatedAt: (updated as any).updatedAt.toISOString(),
    };
}
