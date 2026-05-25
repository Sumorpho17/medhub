// ═══════════════════════════════════════════════════════════
// MEDHUB — User Zod Schemas
// ═══════════════════════════════════════════════════════════

import { z } from 'zod';
import { Role } from '../types/roles.js';

export const SubscriptionTierSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const SubscriptionStatusSchema = z.enum([
    'ACTIVE',
    'TRIAL',
    'GRACE_PERIOD',
    'SUSPENDED',
    'CANCELLED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const UserPublicSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.nativeEnum(Role),
    clinicId: z.string().uuid(),
    isActive: z.boolean(),
    mfaEnabled: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type UserPublic = z.infer<typeof UserPublicSchema>;

export const CreateStaffSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    role: z.nativeEnum(Role).refine((r) => r !== Role.SUPER_ADMIN, {
        message: 'SUPER_ADMIN cannot be assigned via this endpoint',
    }),
});

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffRoleSchema = z.object({
    role: z.nativeEnum(Role).refine((r) => r !== Role.SUPER_ADMIN, {
        message: 'SUPER_ADMIN cannot be assigned via this endpoint',
    }),
});

export type UpdateStaffRoleInput = z.infer<typeof UpdateStaffRoleSchema>;

export const ClinicPublicSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    registrationNumber: z.string().nullable(),
    logo: z.string().nullable(),
    subscriptionTier: SubscriptionTierSchema,
    subscriptionStatus: SubscriptionStatusSchema,
    createdAt: z.string().datetime(),
});

export type ClinicPublic = z.infer<typeof ClinicPublicSchema>;
