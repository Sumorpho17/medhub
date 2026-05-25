// ═══════════════════════════════════════════════════════════
// MEDHUB — Roles, Permissions, and RBAC Permission Matrix
// This is the canonical source of truth for all access control.
// Server enforces this. Client mirrors it for UX only.
// ═══════════════════════════════════════════════════════════

export enum Role {
    RECEPTIONIST = 'RECEPTIONIST',
    DOCTOR = 'DOCTOR',
    NURSE = 'NURSE',
    PHARMACIST = 'PHARMACIST',
    LAB_TECH = 'LAB_TECH',
    BILLING_OFFICER = 'BILLING_OFFICER',
    CLINIC_ADMIN = 'CLINIC_ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Permission {
    // Patient
    PATIENT_REGISTER = 'patient:register',
    PATIENT_READ_DEMOGRAPHICS = 'patient:read-demographics',
    PATIENT_READ_FULL = 'patient:read-full',

    // Clinical
    CLINICAL_WRITE = 'clinical:write',
    VITALS_WRITE = 'vitals:write',
    NURSING_NOTES_WRITE = 'nursing-notes:write',

    // Prescriptions
    PRESCRIPTION_CREATE = 'prescription:create',
    PRESCRIPTION_READ = 'prescription:read',

    // Appointments
    APPOINTMENT_MANAGE = 'appointment:manage',

    // Billing & Payments
    INVOICE_CREATE = 'invoice:create',
    INVOICE_READ = 'invoice:read',
    INVOICE_MANAGE = 'invoice:manage',
    PAYMENT_RECORD = 'payment:record',
    PAYMENT_READ = 'payment:read',

    // Laboratory
    LAB_REQUEST = 'lab:request',
    LAB_RESULTS_READ = 'lab:results-read',
    LAB_REQUESTS_READ = 'lab-requests:read',
    LAB_RESULTS_WRITE = 'lab-results:write',

    // Pharmacy
    DISPENSING_WRITE = 'dispensing:write',
    INVENTORY_READ = 'inventory:read',
    INVENTORY_WRITE = 'inventory:write',

    // Staff management (Clinic Admin only)
    STAFF_FULL = 'staff:full',
    ROLES_ASSIGN = 'roles:assign',

    // Reporting
    REPORTS_FULL = 'reports:full',

    // Audit logs
    AUDIT_LOG_READ = 'audit-log:read',       // Clinic Admin — own clinic only
    AUDIT_LOG_FULL = 'audit-log:full',       // Super Admin — all clinics (metadata only)

    // Settings
    SETTINGS_FULL = 'settings:full',

    // Platform (Super Admin only)
    TENANT_FULL = 'tenant:full',
    PLATFORM_BILLING_FULL = 'platform-billing:full',

    // Device management
    DEVICE_MANAGE = 'device:manage',
}

// ─── Permission Matrix ───────────────────────────────────────────────────────
// Each role maps to the exact permissions it holds.
// Any permission NOT in this list is an implicit DENY for that role.
// The server validates against this matrix on EVERY authenticated request.

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
    [Role.RECEPTIONIST]: [
        Permission.PATIENT_REGISTER,
        Permission.PATIENT_READ_DEMOGRAPHICS,
        Permission.APPOINTMENT_MANAGE,
        Permission.INVOICE_CREATE,
        Permission.INVOICE_READ,
    ],

    [Role.DOCTOR]: [
        Permission.PATIENT_READ_FULL,
        Permission.CLINICAL_WRITE,
        Permission.PRESCRIPTION_CREATE,
        Permission.PRESCRIPTION_READ,
        Permission.LAB_REQUEST,
        Permission.LAB_RESULTS_READ,
    ],

    [Role.NURSE]: [
        Permission.PATIENT_READ_FULL,
        Permission.VITALS_WRITE,
        Permission.NURSING_NOTES_WRITE,
        Permission.PRESCRIPTION_READ,
    ],

    [Role.PHARMACIST]: [
        Permission.PRESCRIPTION_READ,
        Permission.DISPENSING_WRITE,
        Permission.INVENTORY_READ,
        Permission.INVENTORY_WRITE,
    ],

    [Role.LAB_TECH]: [
        Permission.LAB_REQUESTS_READ,
        Permission.LAB_RESULTS_WRITE,
    ],

    [Role.BILLING_OFFICER]: [
        Permission.PATIENT_READ_DEMOGRAPHICS,
        Permission.INVOICE_MANAGE,
        Permission.PAYMENT_RECORD,
        Permission.PAYMENT_READ,
    ],

    [Role.CLINIC_ADMIN]: [
        Permission.STAFF_FULL,
        Permission.ROLES_ASSIGN,
        Permission.REPORTS_FULL,
        Permission.AUDIT_LOG_READ,
        Permission.SETTINGS_FULL,
        Permission.DEVICE_MANAGE,
        // Explicit DENY: clinical notes, prescriptions
        // Clinic Admin ≠ clinical access
    ],

    [Role.SUPER_ADMIN]: [
        Permission.TENANT_FULL,
        Permission.PLATFORM_BILLING_FULL,
        Permission.AUDIT_LOG_FULL,
        // Hard DENY: patient:* — architecturally impossible, not policy-based
        // This is enforced by RLS DENY policies on patient tables in Phase 1
    ],
} as const;

// ─── Helper ──────────────────────────────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
    return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
    return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: readonly Permission[]): boolean {
    return permissions.every((p) => hasPermission(role, p));
}
