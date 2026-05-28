import prisma, { withClinicScope, withSuperAdminScope } from '../lib/prismaClinicScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from './audit.service.js';
import { AuditAction } from '@medhub/shared';
import type { UpdateClinicSettingsInput, DeviceInfo, DashboardStats } from '@medhub/shared';

export async function getClinicSettings(clinicId: string): Promise<unknown> {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError(404, 'CLINIC_NOT_FOUND', 'Clinic not found');
    return clinic;
}

export async function updateClinicSettings(
    clinicId: string,
    input: UpdateClinicSettingsInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const clinic = await prisma.clinic.update({ where: { id: clinicId }, data: input as any });
    return clinic;
}

export async function listDevices(clinicId: string): Promise<DeviceInfo[]> {
    const devices = await withClinicScope(clinicId, (tx) =>
        tx.device.findMany({ where: {}, orderBy: { createdAt: 'desc' } }),
    );
    return (devices as any[]).map((d: any) => ({
        id: d.id,
        name: d.name,
        fingerprint: d.fingerprint,
        isRegistered: d.isRegistered,
        isRevoked: d.isRevoked,
        lastSyncAt: d.lastSyncAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
    }));
}

export async function revokeDevice(
    deviceId: string,
    clinicId: string,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<void> {
    const device = await withClinicScope(clinicId, (tx) =>
        tx.device.findFirst({ where: { id: deviceId, clinicId } }),
    );
    if (!device) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    await withClinicScope(clinicId, (tx) =>
        tx.device.update({ where: { id: deviceId }, data: { isRevoked: true, isRegistered: false } }),
    );
    await auditLog({
        userId, role: userRole as any, deviceId, clinicId,
        action: AuditAction.DEVICE_REVOKED,
        resourceType: 'Device', resourceId: deviceId,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
}

export async function getAuditLogs(
    clinicId: string,
    page: number,
    limit: number,
    action?: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
): Promise<{ logs: unknown[]; total: number }> {
    const where: any = { clinicId };
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate + 'T23:59:59');
    }
    const [logs, total] = await Promise.all([
        withClinicScope(clinicId, (tx) =>
            tx.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { timestamp: 'desc' } }),
        ) as Promise<unknown[]>,
        prisma.auditLog.count({ where }),
    ]);
    return { logs, total };
}

export async function getDashboardStats(clinicId: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [staffCount, activeDevices] = await Promise.all([
        prisma.user.count({ where: { clinicId, isActive: true } }),
        prisma.device.count({ where: { clinicId, isRevoked: false } }),
    ]);
    // Patient and revenue stats come from CouchDB — return zero for now
    return {
        totalPatients: 0,
        visitsToday: 0,
        revenueToday: 0,
        outstandingBalance: 0,
        staffCount,
        activeDevices,
    };
}
