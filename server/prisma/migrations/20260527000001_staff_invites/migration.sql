-- CreateTable: staff_invites
-- Clinics can generate invite links for staff onboarding.
-- Token is a crypto-random string used in the invite URL.

CREATE TABLE "staff_invites" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(60) NOT NULL,
    "lastName" VARCHAR(60) NOT NULL,
    "role" "Role" NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "clinicId" UUID NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_invites_token_key" ON "staff_invites"("token");
CREATE INDEX "staff_invites_clinicId_idx" ON "staff_invites"("clinicId");
CREATE INDEX "staff_invites_token_idx" ON "staff_invites"("token");

-- Enable RLS
ALTER TABLE "staff_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_invites" FORCE ROW LEVEL SECURITY;

-- Clinic isolation policy
CREATE POLICY clinic_isolation_staff_invites ON "staff_invites"
  AS RESTRICTIVE
  USING ("clinicId"::text = current_setting('app.clinic_id', true));
