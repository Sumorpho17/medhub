import crypto from 'crypto';
import https from 'https';
import fetch from 'node-fetch';
import prisma from '../lib/prismaClinicScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from './audit.service.js';
import { AuditAction } from '@medhub/shared';
import type { CreateInvoiceInput, RecordPaymentInput } from '@medhub/shared';

const httpsAgent = new https.Agent({
    rejectUnauthorized: true,
    keepAlive: true,
});

function getBasicAuth(user: string, pass: string): string {
    return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

async function couchRequest(
    method: string,
    url: string,
    path: string,
    auth: string,
    body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
    const options: RequestInit = {
        method,
        headers: {
            Authorization: auth,
            'Content-Type': 'application/json',
        },
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${url}${path}`, { ...options, agent: httpsAgent } as any);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function getClinicDb(clinicId: string): Promise<{ url: string; auth: string; dbName: string }> {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic?.couchdbDatabaseName || !clinic.couchdbUser || !clinic.couchdbPasswordEncrypted) {
        throw new AppError(500, 'COUCHDB_NOT_PROVISIONED', 'Clinic CouchDB not provisioned');
    }
    const [ivHex, dataHex] = clinic.couchdbPasswordEncrypted.split(':');
    const key = Buffer.from(process.env['COUCHDB_CREDENTIAL_ENCRYPTION_KEY']!, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
    ]);
    return {
        url: process.env['COUCHDB_URL']!,
        auth: getBasicAuth(clinic.couchdbUser, decrypted.toString('utf8')),
        dbName: clinic.couchdbDatabaseName,
    };
}

function generateInvoiceNumber(clinicId: string, index: number): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const padded = String(index + 1).padStart(4, '0');
    return `INV-${date}-${padded}`;
}

export async function createInvoice(
    clinicId: string,
    input: CreateInvoiceInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const { url, auth, dbName } = await getClinicDb(clinicId);
    const viewResult = await couchRequest('GET', url, `/${dbName}/_all_docs?limit=0`, auth);
    const totalDocs = ((viewResult.data as any)?.total_rows ?? 0);
    const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (input.discount ?? 0) + (input.tax ?? 0);
    const doc = {
        type: 'invoice',
        clinicId,
        ...input,
        invoiceNumber: generateInvoiceNumber(clinicId, totalDocs),
        subtotal,
        total,
        amountPaid: 0,
        balance: total,
        status: 'pending',
        createdBy: userId,
        createdByRole: userRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const result = await couchRequest('POST', url, `/${dbName}`, auth, doc);
    if (!result.ok) {
        throw new AppError(500, 'INVOICE_CREATE_FAILED', 'Failed to create invoice');
    }
    const saved = await couchRequest('GET', url, `/${dbName}/${(result.data as any).id}`, auth);
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.INVOICE_CREATED,
        resourceType: 'Invoice', resourceId: (result.data as any).id as string,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return saved.data;
}

export async function recordPayment(
    clinicId: string,
    input: RecordPaymentInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const { url, auth, dbName } = await getClinicDb(clinicId);
    // Get invoice
    const invoiceRes = await couchRequest('GET', url, `/${dbName}/${input.invoiceId}`, auth);
    if (!invoiceRes.ok) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    const invoice = invoiceRes.data as any;
    if (invoice.status === 'paid') throw new AppError(400, 'ALREADY_PAID', 'Invoice is already fully paid');
    if (invoice.status === 'cancelled') throw new AppError(400, 'INVOICE_CANCELLED', 'Cannot pay a cancelled invoice');
    // Record payment
    const paymentDoc = {
        type: 'payment',
        clinicId,
        invoiceId: input.invoiceId,
        patientId: invoice.patientId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        notes: input.notes ?? '',
        receivedBy: userId,
        receivedByRole: userRole,
        createdAt: new Date().toISOString(),
    };
    const paymentResult = await couchRequest('POST', url, `/${dbName}`, auth, paymentDoc);
    if (!paymentResult.ok) throw new AppError(500, 'PAYMENT_FAILED', 'Failed to record payment');
    // Update invoice
    const newAmountPaid = (invoice.amountPaid ?? 0) + input.amount;
    const newBalance = Math.max(0, invoice.total - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    await couchRequest('PUT', url, `/${dbName}/${input.invoiceId}`, auth, {
        ...invoice,
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: new Date().toISOString(),
    });
    const saved = await couchRequest('GET', url, `/${dbName}/${(paymentResult.data as any).id}`, auth);
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.PAYMENT_RECORDED,
        resourceType: 'Payment', resourceId: (paymentResult.data as any).id as string,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return saved.data;
}

export async function listInvoices(
    clinicId: string,
    patientId?: string,
    status?: string,
    page = 1,
    limit = 20,
): Promise<{ invoices: unknown[]; total: number }> {
    const { url, auth, dbName } = await getClinicDb(clinicId);
    const selector: any = { type: 'invoice', clinicId };
    if (patientId) selector.patientId = patientId;
    if (status) selector.status = status;
    const result = await couchRequest('POST', url, `/${dbName}/_find`, auth, {
        selector,
        limit,
        skip: (page - 1) * limit,
        sort: [{ createdAt: 'desc' }],
    });
    return { invoices: (result.data as any)?.docs ?? [], total: ((result.data as any)?.docs ?? []).length };
}

export async function getRevenueReport(
    clinicId: string,
    startDate: string,
    endDate: string,
): Promise<{ totalRevenue: number; byMethod: Record<string, number>; invoiceCount: number }> {
    const { url, auth, dbName } = await getClinicDb(clinicId);
    const startStr = new Date(startDate).toISOString();
    const endStr = new Date(endDate + 'T23:59:59').toISOString();
    const result = await couchRequest('POST', url, `/${dbName}/_find`, auth, {
        selector: {
            type: 'payment',
            clinicId,
            createdAt: { $gte: startStr, $lte: endStr },
        },
        limit: 1000,
    });
    const payments = (result.data as any)?.docs ?? [];
    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
        const method = p.paymentMethod ?? 'other';
        byMethod[method] = (byMethod[method] ?? 0) + (p.amount ?? 0);
    }
    return { totalRevenue, byMethod, invoiceCount: payments.length };
}
