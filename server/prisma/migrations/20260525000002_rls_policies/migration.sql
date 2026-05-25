-- ═══════════════════════════════════════════════════════════
-- Migration: 0002_rls_policies
-- Row-Level Security — the multi-tenancy guarantee.
-- This migration MUST run immediately after 0001_initial_schema.
-- Every clinic-scoped table is isolated by app.clinic_id session variable
-- set via withClinicScope() in server/src/lib/prismaClinicScope.ts
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all clinic-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (critical — prevents bypass via direct DB access)
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "devices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

-- ─── Clinic Isolation Policies ────────────────────────────────────────────────
-- current_setting('app.clinic_id', true) returns NULL if not set
-- The 'true' flag means: don't throw an error if the variable isn't set,
-- just return NULL — which causes the USING clause to fail, returning 0 rows.
-- This is the safe default: no app.clinic_id set = no data visible.

CREATE POLICY clinic_isolation_users ON "users"
  AS RESTRICTIVE
  USING ("clinicId"::text = current_setting('app.clinic_id', true));

CREATE POLICY clinic_isolation_devices ON "devices"
  AS RESTRICTIVE
  USING ("clinicId"::text = current_setting('app.clinic_id', true));

CREATE POLICY clinic_isolation_refresh_tokens ON "refresh_tokens"
  AS RESTRICTIVE
  USING ("clinicId"::text = current_setting('app.clinic_id', true));

CREATE POLICY clinic_isolation_sessions ON "sessions"
  AS RESTRICTIVE
  USING ("clinicId"::text = current_setting('app.clinic_id', true));

CREATE POLICY clinic_isolation_audit_logs ON "audit_logs"
  AS RESTRICTIVE
  USING (
    "clinicId"::text = current_setting('app.clinic_id', true)
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- ─── Super Admin Audit Access ─────────────────────────────────────────────────
-- Super Admin can READ audit_logs across all clinics (metadata only, not patient records).
-- This is set via app.is_super_admin session variable in withSuperAdminScope().
-- Patient record tables (added in Phase 1) will have EXPLICIT DENY for super admin.
-- See: CREATE POLICY superadmin_deny_patients ON "patients" USING (false);

-- ─── Application DB User ──────────────────────────────────────────────────────
-- The application Postgres user (medhub_app) must have RLS bypass REVOKED.
-- This ensures SET LOCAL app.clinic_id is ALWAYS required.
-- Run after creating the medhub_app user:
--   REVOKE BYPASS ROW LEVEL SECURITY ON TABLE users FROM medhub_app;
--   (Repeat for all clinic-scoped tables)
--
-- The postgres superuser retains bypass for migrations only.
