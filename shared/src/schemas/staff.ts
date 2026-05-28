import { z } from 'zod';
import { Role } from '../types/roles.js';

export const InviteStaffSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    role: z.nativeEnum(Role).refine((r) => r !== Role.SUPER_ADMIN, {
        message: 'SUPER_ADMIN cannot be assigned via this endpoint',
    }),
    sendEmail: z.boolean().default(true),
});

export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

export const UpdateStaffSchema = z.object({
    firstName: z.string().min(1).max(60).optional(),
    lastName: z.string().min(1).max(60).optional(),
    role: z.nativeEnum(Role).refine((r) => r !== Role.SUPER_ADMIN, {
        message: 'SUPER_ADMIN cannot be assigned via this endpoint',
    }).optional(),
    isActive: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;

export const StaffListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    role: z.nativeEnum(Role).optional(),
    search: z.string().max(100).optional(),
});

export type StaffListQueryInput = z.infer<typeof StaffListQuerySchema>;
