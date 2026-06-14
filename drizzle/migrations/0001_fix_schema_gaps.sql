-- Migration 0001: Fix schema-vs-migration gaps
-- Schema is the source of truth. This migration aligns the DB with drizzle/schema/*.

-- ============================================================
-- 1. DROP orphaned permission tables (Option A: constants only)
-- ============================================================
DROP TABLE IF EXISTS "user_permissions" CASCADE;
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;

-- ============================================================
-- 2. RENAME table: scan_policies → scan_profiles
-- ============================================================
ALTER TABLE "scan_policies" RENAME TO "scan_profiles";

-- ============================================================
-- 3. ADD missing columns
-- ============================================================

-- users: username, bio, timezone, language
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" varchar(10);

-- projects: lead
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lead" varchar(255);

-- repositories: workspace_id, connection_type, current_profile_id
ALTER TABLE "repositories" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
ALTER TABLE "repositories" ADD COLUMN IF NOT EXISTS "connection_type" varchar(20) DEFAULT 'scm' NOT NULL;
ALTER TABLE "repositories" ADD COLUMN IF NOT EXISTS "current_profile_id" uuid;

-- scans: origin, trigger_source
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "origin" varchar(30) DEFAULT 'managed' NOT NULL;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "trigger_source" varchar(30);

-- scan_results: format, file_key, file_size, parsed_summary
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "format" varchar(20);
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "file_key" text;
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "file_size" integer;
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "parsed_summary" jsonb;

-- schedules: workspace_id, updated_at, deleted_at
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- ============================================================
-- 4. DROP orphaned columns
-- ============================================================

-- scans: drop environment_id, drop policy_id
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_environment_id_environments_id_fk";
ALTER TABLE "scans" DROP COLUMN IF EXISTS "environment_id";
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_policy_id_scan_policies_id_fk";
ALTER TABLE "scans" DROP COLUMN IF EXISTS "policy_id";

-- scan_results: drop raw_output, drop summary
ALTER TABLE "scan_results" DROP COLUMN IF EXISTS "raw_output";
ALTER TABLE "scan_results" DROP COLUMN IF EXISTS "summary";

-- findings: drop environment_id
ALTER TABLE "findings" DROP CONSTRAINT IF EXISTS "findings_environment_id_environments_id_fk";
ALTER TABLE "findings" DROP COLUMN IF EXISTS "environment_id";

-- ============================================================
-- 5. RENAME column: policy_id → profile_id (schedules)
-- ============================================================
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_policy_id_scan_policies_id_fk";
ALTER TABLE "schedules" RENAME COLUMN "policy_id" TO "profile_id";

-- ============================================================
-- 6. ADD missing tables
-- ============================================================

-- comments (was in migration but missing from schema — adding to both)
CREATE TABLE IF NOT EXISTS "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "finding_id" uuid NOT NULL,
    "parent_id" uuid,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "created_by" uuid,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "updated_by" uuid,
    "deleted_at" timestamp,
    "deleted_by" uuid
);
ALTER TABLE "comments" ADD CONSTRAINT "comments_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- project_api_tokens (missing from migration)
CREATE TABLE IF NOT EXISTS "project_api_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "token_hash" text NOT NULL,
    "token_prefix" varchar(20),
    "permissions" jsonb DEFAULT '["scans:upload"]' NOT NULL,
    "last_used_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "expires_at" timestamp,
    "revoked_at" timestamp,
    "revoked_by" uuid
);
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_token_hash_unique" UNIQUE("token_hash");

-- scan_uploads (missing from migration)
CREATE TABLE IF NOT EXISTS "scan_uploads" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "repository_id" uuid,
    "project_id" uuid,
    "scan_id" uuid,
    "branch" varchar(100),
    "commit_sha" varchar(40),
    "uploaded_by" uuid,
    "source" varchar(30),
    "metadata" jsonb,
    "project_api_token_id" uuid,
    "personal_access_token_id" uuid,
    "created_at" timestamp DEFAULT now()
);
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_project_api_token_id_project_api_tokens_id_fk" FOREIGN KEY ("project_api_token_id") REFERENCES "public"."project_api_tokens"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_personal_access_token_id_personal_access_tokens_id_fk" FOREIGN KEY ("personal_access_token_id") REFERENCES "public"."personal_access_tokens"("id") ON DELETE set null ON UPDATE no action;

-- knowledge_backfill_jobs (missing from migration)
CREATE TABLE IF NOT EXISTS "knowledge_backfill_jobs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid,
    "source_id" uuid,
    "source_type" varchar(50) NOT NULL,
    "status" varchar(20) DEFAULT 'queued' NOT NULL,
    "range_start" timestamp NOT NULL,
    "range_end" timestamp NOT NULL,
    "cursor_start" timestamp NOT NULL,
    "window_days" integer DEFAULT 30 NOT NULL,
    "imported_count" integer DEFAULT 0 NOT NULL,
    "last_error" text,
    "started_at" timestamp,
    "completed_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
ALTER TABLE "knowledge_backfill_jobs" ADD CONSTRAINT "knowledge_backfill_jobs_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "knowledge_backfill_source_status_idx" ON "knowledge_backfill_jobs" ("source_id", "status");

-- ============================================================
-- 7. ADD missing FKs
-- ============================================================

-- project_teams.team_id → teams.id
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;

-- ============================================================
-- 8. ADD missing indexes
-- ============================================================

-- knowledge_entries unique index
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_entries_source_cwe_idx" ON "knowledge_entries" ("source_id", "cwe_id");

-- ============================================================
-- 9. RENAME FK constraints for scan_profiles
-- ============================================================
ALTER TABLE "scans" ADD CONSTRAINT "scans_profile_id_scan_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."scan_profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_profile_id_scan_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."scan_profiles"("id") ON DELETE no action ON UPDATE no action;

-- ============================================================
-- 10. ADD webhook_deliveries table
-- ============================================================
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "webhook_id" uuid NOT NULL,
    "event" varchar(100) NOT NULL,
    "status" varchar(20) NOT NULL,
    "response_status" integer,
    "request_body" jsonb,
    "response_body" text,
    "duration_ms" integer,
    "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;
