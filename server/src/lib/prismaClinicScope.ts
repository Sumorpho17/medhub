// ═══════════════════════════════════════════════════════════
// MEDHUB — Prisma Client with withClinicScope middleware
// ALL clinic-scoped queries MUST go through withClinicScope().
// Direct prisma.* calls are only for super admin and internal use.
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

// Singleton Prisma instance
const prisma = new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export default prisma;

// ─── withClinicScope ─────────────────────────────────────────────────────────
// Wraps any database operation in a transaction that first sets the PostgreSQL
// session variable `app.clinic_id` via SET LOCAL.
//
// SET LOCAL only persists for the current transaction — it is automatically
// cleared when the transaction commits or rolls back. This means:
//   1. No inter-request bleed (clinicId never leaks from one request to another)
//   2. Every clinic-scoped query requires an explicit clinicId
//   3. All RLS policies that use current_setting('app.clinic_id', true) are enforced
//
// Usage:
//   const users = await withClinicScope(clinicId, (tx) => tx.user.findMany());
//
// NEVER call clinic-scoped models outside of withClinicScope.

export async function withClinicScope<T>(
    clinicId: string,
    fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
    return prisma.$transaction(async (tx: any) => {
        // SET LOCAL is scoped to this transaction only
        await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicId}'`);
        return fn(tx as unknown as PrismaClient);
    });
}

// ─── withSuperAdminScope ──────────────────────────────────────────────────────
// For Super Admin operations that span multiple clinics.
// Sets app.is_super_admin = 'true' which the audit_logs RLS policy checks.
// Phase 1: Add EXPLICIT DENY policies on patient tables for super admin.

export async function withSuperAdminScope<T>(
    fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
    return prisma.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe("SET LOCAL app.is_super_admin = 'true'");
        return fn(tx as unknown as PrismaClient);
    });
}
