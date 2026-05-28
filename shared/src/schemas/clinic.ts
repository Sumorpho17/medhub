import { z } from 'zod';

export const UpdateClinicSettingsSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    address: z.string().min(5).max(255).optional(),
    phone: z.string().regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number').optional(),
    registrationNumber: z.string().max(50).optional().nullable(),
    logo: z.string().optional().nullable(),
});

export type UpdateClinicSettingsInput = z.infer<typeof UpdateClinicSettingsSchema>;

export const DeviceInfoSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    fingerprint: z.string(),
    isRegistered: z.boolean(),
    isRevoked: z.boolean(),
    lastSyncAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

export const DeviceListSchema = z.array(DeviceInfoSchema);

export const AuditLogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    action: z.string().optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;

export const DashboardStatsSchema = z.object({
    totalPatients: z.number(),
    visitsToday: z.number(),
    revenueToday: z.number(),
    outstandingBalance: z.number(),
    staffCount: z.number(),
    activeDevices: z.number(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
