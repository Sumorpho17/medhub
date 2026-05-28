import crypto from 'crypto';
import https from 'https';
import fetch from 'node-fetch';
import prisma from '../lib/prismaClinicScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from './audit.service.js';
import { AuditAction } from '@medhub/shared';
import type { CreatePatientInput, UpdatePatientInput } from '@medhub/shared';

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

async function getClinicDb(clinicId: string): Promise<{ url: string; auth: string }> {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic?.couchdbDatabaseName || !clinic.couchdbUser || !clinic.couchdbPasswordEncrypted) {
        throw new AppError(500, 'COUCHDB_NOT_PROVISIONED', 'Clinic CouchDB not provisioned');
    }
    const [ivHex, dataHex] = clinic.couchdbPasswordEncrypted.split(':');
    if (!ivHex || !dataHex) throw new AppError(500, 'INVALID_ENCRYPTED_DATA', 'Invalid CouchDB credentials');
    const key = Buffer.from(process.env['COUCHDB_CREDENTIAL_ENCRYPTION_KEY']!, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
    ]);
    const password = decrypted.toString('utf8');
    return {
        url: process.env['COUCHDB_URL']!,
        auth: getBasicAuth(clinic.couchdbUser, password),
    };
}

function generatePatientId(index: number): string {
    const padded = String(index + 1).padStart(5, '0');
    return `MHD-${padded}`;
}

export async function createPatient(
    clinicId: string,
    input: CreatePatientInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const { url, auth } = await getClinicDb(clinicId);
    const dbName = `db_clinic_${clinicId}`;
    // Get next patient ID
    const viewResult = await couchRequest('GET', url, `/${dbName}/_all_docs?limit=0`, auth);
    const totalDocs = ((viewResult.data as any)?.total_rows ?? 0);
    const patientId = generatePatientId(totalDocs);
    const doc = {
        type: 'patient',
        clinicId,
        ...input,
        patientId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    const result = await couchRequest('POST', url, `/${dbName}`, auth, doc);
    if (!result.ok) {
        throw new AppError(500, 'PATIENT_CREATE_FAILED', 'Failed to create patient record');
    }
    const saved = await couchRequest('GET', url, `/${dbName}/${(result.data as any).id}`, auth);
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.PATIENT_RECORD_CREATED,
        resourceType: 'Patient', resourceId: (result.data as any).id as string,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return saved.data;
}

export async function getPatient(
    clinicId: string,
    patientId: string,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const { url, auth } = await getClinicDb(clinicId);
    const dbName = `db_clinic_${clinicId}`;
    // Search by _id or patientId field
    const mangoQuery = {
        selector: {
            $or: [
                { _id: patientId },
                { patientId },
            ],
            type: 'patient',
            clinicId,
        },
        limit: 1,
    };
    const result = await couchRequest('POST', url, `/${dbName}/_find`, auth, mangoQuery);
    const docs = (result.data as any)?.docs ?? [];
    if (!docs.length) {
        throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient not found');
    }
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.PATIENT_RECORD_READ,
        resourceType: 'Patient', resourceId: patientId,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return docs[0];
}

export async function searchPatients(
    clinicId: string,
    query: string,
    limit: number,
    offset: number,
): Promise<{ patients: unknown[]; total: number }> {
    const { url, auth } = await getClinicDb(clinicId);
    const dbName = `db_clinic_${clinicId}`;
    const regex = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mangoQuery = {
        selector: {
            type: 'patient',
            clinicId,
            $or: [
                { firstName: { $regex: `(?i)${regex}` } },
                { lastName: { $regex: `(?i)${regex}` } },
                { phone: { $regex: `(?i)${regex}` } },
                { patientId: { $regex: `(?i)${regex}` } },
            ],
        },
        limit,
        skip: offset,
        sort: [{ createdAt: 'desc' }],
    };
    const result = await couchRequest('POST', url, `/${dbName}/_find`, auth, mangoQuery);
    const docs = (result.data as any)?.docs ?? [];
    const total = await couchRequest('POST', url, `/${dbName}/_find`, auth, {
        selector: { type: 'patient', clinicId },
        limit: 0,
    });
    return {
        patients: docs,
        total: (total.data as any)?.docs?.length ?? docs.length,
    };
}

export async function updatePatient(
    clinicId: string,
    patientDocId: string,
    input: UpdatePatientInput,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string | null,
): Promise<unknown> {
    const { url, auth } = await getClinicDb(clinicId);
    const dbName = `db_clinic_${clinicId}`;
    // Get current doc
    const current = await couchRequest('GET', url, `/${dbName}/${patientDocId}`, auth);
    if (!current.ok) {
        throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient not found');
    }
    const doc = current.data as any;
    const updated = {
        ...doc,
        ...input,
        updatedAt: new Date().toISOString(),
    };
    const result = await couchRequest('PUT', url, `/${dbName}/${patientDocId}`, auth, updated);
    if (!result.ok) {
        throw new AppError(500, 'PATIENT_UPDATE_FAILED', 'Failed to update patient record');
    }
    const saved = await couchRequest('GET', url, `/${dbName}/${patientDocId}`, auth);
    await auditLog({
        userId, role: userRole as any, deviceId: null, clinicId,
        action: AuditAction.PATIENT_RECORD_UPDATED,
        resourceType: 'Patient', resourceId: patientDocId,
        result: 'SUCCESS', ipAddress, userAgent,
        timestamp: new Date().toISOString(),
    });
    return saved.data;
}
