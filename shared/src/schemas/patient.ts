import { z } from 'zod';

export const PatientSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('patient'),
    clinicId: z.string().uuid(),
    // Demographics
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    gender: z.enum(['male', 'female', 'other']),
    // Contact
    phone: z.string().regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number'),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().max(255).optional().or(z.literal('')),
    // Emergency
    emergencyContactName: z.string().max(100).optional().or(z.literal('')),
    emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
    // Clinical
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
    genotype: z.enum(['AA', 'AS', 'SS', 'AC', 'SC', 'CC']).optional().nullable(),
    allergies: z.string().max(500).optional().or(z.literal('')),
    chronicConditions: z.string().max(500).optional().or(z.literal('')),
    // Metadata
    patientId: z.string(), // Human-readable ID (e.g., MHD-00001)
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    isArchived: z.boolean().default(false),
});

export type Patient = z.infer<typeof PatientSchema>;

export const CreatePatientSchema = PatientSchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    patientId: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    isArchived: true,
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

export const PatientSearchSchema = z.object({
    q: z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type PatientSearchInput = z.infer<typeof PatientSearchSchema>;

export const PatientSearchResultSchema = z.object({
    patients: z.array(PatientSchema),
    total: z.number(),
});

export type PatientSearchResult = z.infer<typeof PatientSearchResultSchema>;
