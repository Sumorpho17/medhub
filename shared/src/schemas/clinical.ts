import { z } from 'zod';

// ─── Consultation ──────────────────────────────────────────────────────────────

export const ConsultationSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('consultation'),
    clinicId: z.string().uuid(),
    patientId: z.string(),
    encounterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    // Clinical content
    chiefComplaint: z.string().min(1).max(500),
    historyOfPresentingIllness: z.string().max(2000).optional().or(z.literal('')),
    examinationFindings: z.string().max(2000).optional().or(z.literal('')),
    diagnosis: z.array(z.object({
        code: z.string(), // ICD-10 code
        description: z.string(),
        isPrimary: z.boolean().default(false),
    })).optional().default([]),
    managementPlan: z.string().max(2000).optional().or(z.literal('')),
    followUpInstructions: z.string().max(500).optional().or(z.literal('')),
    followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    // Metadata
    createdBy: z.string().uuid(),
    createdByRole: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    isSigned: z.boolean().default(false),
});

export type Consultation = z.infer<typeof ConsultationSchema>;

export const CreateConsultationSchema = ConsultationSchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    createdBy: true,
    createdByRole: true,
    createdAt: true,
    updatedAt: true,
    isSigned: true,
});

export type CreateConsultationInput = z.infer<typeof CreateConsultationSchema>;

// ─── Vitals ────────────────────────────────────────────────────────────────────

export const VitalsSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('vitals'),
    clinicId: z.string().uuid(),
    patientId: z.string(),
    recordedAt: z.string().datetime(),
    bloodPressureSystolic: z.number().int().min(50).max(300).optional().nullable(),
    bloodPressureDiastolic: z.number().int().min(30).max(200).optional().nullable(),
    temperature: z.number().min(30).max(45).optional().nullable(),
    pulseRate: z.number().int().min(20).max(300).optional().nullable(),
    respiratoryRate: z.number().int().min(5).max(100).optional().nullable(),
    weight: z.number().min(1).max(300).optional().nullable(),
    height: z.number().min(30).max(250).optional().nullable(),
    bmi: z.number().min(5).max(80).optional().nullable(), // Auto-calculated
    notes: z.string().max(500).optional().or(z.literal('')),
    recordedBy: z.string().uuid(),
    recordedByRole: z.string(),
    createdAt: z.string().datetime(),
});

export type Vitals = z.infer<typeof VitalsSchema>;

export const CreateVitalsSchema = VitalsSchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    bmi: true,
    recordedBy: true,
    recordedByRole: true,
    createdAt: true,
});

export type CreateVitalsInput = z.infer<typeof CreateVitalsSchema>;

// ─── Prescription ──────────────────────────────────────────────────────────────

export const PrescriptionItemSchema = z.object({
    drugName: z.string().min(1).max(200),
    strength: z.string().min(1).max(100),
    form: z.string().min(1).max(50),
    dose: z.string().min(1).max(100),
    frequency: z.string().min(1).max(100),
    duration: z.string().min(1).max(100),
    route: z.string().min(1).max(50),
    instructions: z.string().max(300).optional().or(z.literal('')),
    quantity: z.number().int().positive(),
    refillCount: z.number().int().min(0).default(0),
});

export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;

export const PrescriptionSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('prescription'),
    clinicId: z.string().uuid(),
    patientId: z.string(),
    consultationId: z.string().optional(),
    encounterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    items: z.array(PrescriptionItemSchema).min(1),
    notes: z.string().max(500).optional().or(z.literal('')),
    prescribedBy: z.string().uuid(),
    prescribedByRole: z.string(),
    isDispensed: z.boolean().default(false),
    dispensedBy: z.string().uuid().optional().nullable(),
    dispensedAt: z.string().datetime().optional().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type Prescription = z.infer<typeof PrescriptionSchema>;

export const CreatePrescriptionSchema = PrescriptionSchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    prescribedBy: true,
    prescribedByRole: true,
    isDispensed: true,
    dispensedBy: true,
    dispensedAt: true,
    createdAt: true,
    updatedAt: true,
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;

// ─── Discharge Summary ─────────────────────────────────────────────────────────

export const DischargeSummarySchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('discharge_summary'),
    clinicId: z.string().uuid(),
    patientId: z.string(),
    admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dischargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    diagnosis: z.string().min(1).max(2000),
    treatmentGiven: z.string().max(3000).optional().or(z.literal('')),
    dischargeMedications: z.string().max(1000).optional().or(z.literal('')),
    followUpPlan: z.string().max(500).optional().or(z.literal('')),
    dischargeCondition: z.enum(['recovered', 'improved', 'unchanged', 'referred', 'dama', 'deceased']),
    createdBy: z.string().uuid(),
    createdByRole: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type DischargeSummary = z.infer<typeof DischargeSummarySchema>;

export const CreateDischargeSummarySchema = DischargeSummarySchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    createdBy: true,
    createdByRole: true,
    createdAt: true,
    updatedAt: true,
});

export type CreateDischargeSummaryInput = z.infer<typeof CreateDischargeSummarySchema>;
