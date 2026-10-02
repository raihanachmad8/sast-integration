-- M5 Cleanup Migration: Add missing foreign keys and constraints for upload support
-- This migration should be run after 0003

-- Add foreign keys to scan_uploads (if not already present)
DO $$
BEGIN
  -- repository_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scan_uploads_repository_id_fkey'
  ) THEN
    ALTER TABLE "scan_uploads"
    ADD CONSTRAINT "scan_uploads_repository_id_fkey"
    FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE cascade;
  END IF;

  -- project_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scan_uploads_project_id_fkey'
  ) THEN
    ALTER TABLE "scan_uploads"
    ADD CONSTRAINT "scan_uploads_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;
  END IF;

  -- scan_id (already has reference in 0003, but ensure it's named)
END $$;

-- Add CHECK constraint for scans.origin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scans_origin_check'
  ) THEN
    ALTER TABLE "scans"
    ADD CONSTRAINT "scans_origin_check"
    CHECK ("origin" IN ('managed', 'external_upload'));
  END IF;
END $$;

-- Add useful indexes
CREATE INDEX IF NOT EXISTS "scans_repository_origin_idx" ON "scans" ("repository_id", "origin");
CREATE INDEX IF NOT EXISTS "scan_results_scan_scanner_idx" ON "scan_results" ("scan_id", "scanner");