import { z } from 'zod';

export const InvoiceLineItemSchema = z.object({
    description: z.string().min(1).max(200),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('invoice'),
    clinicId: z.string().uuid(),
    patientId: z.string(),
    patientName: z.string(),
    visitId: z.string().optional().nullable(),
    invoiceNumber: z.string(), // e.g., INV-20260527-0001
    encounterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    lineItems: z.array(InvoiceLineItemSchema).min(1),
    subtotal: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
    tax: z.number().nonnegative().default(0),
    total: z.number().nonnegative(),
    amountPaid: z.number().nonnegative().default(0),
    balance: z.number().nonnegative(),
    status: z.enum(['pending', 'partial', 'paid', 'cancelled', 'refunded']).default('pending'),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'hmo', 'other']).optional().nullable(),
    hmoProvider: z.string().max(100).optional().nullable(),
    hmoAuthorizationNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(500).optional().or(z.literal('')),
    createdBy: z.string().uuid(),
    createdByRole: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceSchema = InvoiceSchema.omit({
    _id: true,
    _rev: true,
    type: true,
    clinicId: true,
    invoiceNumber: true,
    subtotal: true,
    total: true,
    amountPaid: true,
    balance: true,
    status: true,
    createdBy: true,
    createdByRole: true,
    createdAt: true,
    updatedAt: true,
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const PaymentSchema = z.object({
    _id: z.string().optional(),
    _rev: z.string().optional(),
    type: z.literal('payment'),
    clinicId: z.string().uuid(),
    invoiceId: z.string(),
    patientId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'hmo', 'other']),
    reference: z.string().max(100).optional().nullable(),
    notes: z.string().max(200).optional().or(z.literal('')),
    receivedBy: z.string().uuid(),
    receivedByRole: z.string(),
    createdAt: z.string().datetime(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const RecordPaymentSchema = z.object({
    invoiceId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'hmo', 'other']),
    reference: z.string().max(100).optional().nullable(),
    notes: z.string().max(200).optional().or(z.literal('')),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const RevenueReportSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export type RevenueReportInput = z.infer<typeof RevenueReportSchema>;
