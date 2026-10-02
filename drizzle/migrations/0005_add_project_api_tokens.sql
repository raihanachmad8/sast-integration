-- 0005: Add project-scoped API tokens for CI uploads (M5 - Option A)
-- Date: 2026-06
-- Purpose: Enable secure, production-grade token auth for POST /projects/:projectId/scans/upload
--          without user sessions. Primary use case: GitHub Actions / GitLab CI / Jenkins etc.

-- 1. Create project_api_tokens table (project-scoped CI tokens)
CREATE TABLE IF NOT EXISTS "project_api_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "name" varchar(255) NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "token_prefix" varchar(20),
  "permissions" jsonb NOT NULL DEFAULT '["scans:upload"]'::jsonb,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "revoked_by" uuid REFERENCES "users"("id")
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS "project_api_tokens_project_idx" ON "project_api_tokens" ("project_id");
CREATE INDEX IF NOT EXISTS "project_api_tokens_active_idx" ON "project_api_tokens" ("project_id", "revoked_at", "expires_at");

-- 2. Enhance scan_uploads for proper actor attribution when using project tokens
--    (uploaded_by stays as the human who created/owns the token for audit continuity)
ALTER TABLE "scan_uploads"
ADD COLUMN IF NOT EXISTS "project_api_token_id" uuid;

-- Add FK (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scan_uploads_project_api_token_id_fkey'
  ) THEN
    ALTER TABLE "scan_uploads"
    ADD CONSTRAINT "scan_uploads_project_api_token_id_fkey"
    FOREIGN KEY ("project_api_token_id") REFERENCES "project_api_tokens"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful index for "which token uploaded these results?"
CREATE INDEX IF NOT EXISTS "scan_uploads_token_idx" ON "scan_uploads" ("project_api_token_id", "created_at" DESC);

-- 3. Optional: also allow personal_access_tokens to be recorded for future user-PAT uploads
--    (for now we focus on project tokens; column added for symmetry if needed later)
ALTER TABLE "scan_uploads"
ADD COLUMN IF NOT EXISTS "personal_access_token_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scan_uploads_personal_access_token_id_fkey'
  ) THEN
    ALTER TABLE "scan_uploads"
    ADD CONSTRAINT "scan_uploads_personal_access_token_id_fkey"
    FOREIGN KEY ("personal_access_token_id") REFERENCES "personal_access_tokens"("id") ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE "project_api_tokens" IS 'Project-scoped long-lived tokens intended exclusively for CI pipeline uploads (external flow). Never use for user sessions.';
COMMENT ON COLUMN "scan_uploads"."project_api_token_id" IS 'If upload came from a project API token (CI), reference here for audit + revocation tracking.';
