-- M5: Support for dual repository connection types (scm + external) + external scan result uploads
-- Date: 2026-06

-- 1. Add connection_type to repositories (if not exists from previous)
ALTER TABLE "repositories" 
ADD COLUMN IF NOT EXISTS "connection_type" varchar(20) NOT NULL DEFAULT 'scm';

-- Add check constraint for connection_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repositories_connection_type_check'
  ) THEN
    ALTER TABLE "repositories" 
    ADD CONSTRAINT "repositories_connection_type_check" 
    CHECK ("connection_type" IN ('scm', 'external'));
  END IF;
END $$;

-- 2. Enhance scans table for origin tracking
ALTER TABLE "scans" 
ADD COLUMN IF NOT EXISTS "origin" varchar(30) NOT NULL DEFAULT 'managed';

ALTER TABLE "scans" 
ADD COLUMN IF NOT EXISTS "trigger_source" varchar(30);

-- 3. Improve scan_results: move away from bloating raw_output jsonb
ALTER TABLE "scan_results" 
ADD COLUMN IF NOT EXISTS "format" varchar(20);

ALTER TABLE "scan_results" 
ADD COLUMN IF NOT EXISTS "file_key" text;

ALTER TABLE "scan_results" 
ADD COLUMN IF NOT EXISTS "file_size" integer;

ALTER TABLE "scan_results" 
ADD COLUMN IF NOT EXISTS "parsed_summary" jsonb;

-- Note: raw_output column kept for backward compatibility during transition.
-- It can be dropped in a future migration after data migration.

-- 4. New table to track every external upload from CI pipelines
CREATE TABLE IF NOT EXISTS "scan_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repository_id" uuid,
  "project_id" uuid,
  "scan_id" uuid REFERENCES "scans"("id"),
  "branch" varchar(100),
  "commit_sha" varchar(40),
  "uploaded_by" uuid,
  "source" varchar(30),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "scan_uploads_repository_idx" ON "scan_uploads" ("repository_id");
CREATE INDEX IF NOT EXISTS "scan_uploads_scan_idx" ON "scan_uploads" ("scan_id");
CREATE INDEX IF NOT EXISTS "scans_origin_idx" ON "scans" ("origin");
CREATE INDEX IF NOT EXISTS "repositories_connection_type_idx" ON "repositories" ("connection_type");