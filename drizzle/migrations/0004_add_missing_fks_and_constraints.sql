-- 0004: Add missing foreign keys and constraints for upload support (M5)
-- Run this after 0003

-- Add foreign keys to scan_uploads if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scan_uploads_repository_id_fkey'
    ) THEN
        ALTER TABLE "scan_uploads" 
        ADD CONSTRAINT "scan_uploads_repository_id_fkey" 
        FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scan_uploads_project_id_fkey'
    ) THEN
        ALTER TABLE "scan_uploads" 
        ADD CONSTRAINT "scan_uploads_project_id_fkey" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scan_uploads_scan_id_fkey'
    ) THEN
        ALTER TABLE "scan_uploads" 
        ADD CONSTRAINT "scan_uploads_scan_id_fkey" 
        FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE SET NULL;
    END IF;
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

-- Add useful indexes for upload flow performance
CREATE INDEX IF NOT EXISTS "idx_scan_uploads_project_created" ON "scan_uploads" ("project_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_scans_repository_origin" ON "scans" ("repository_id", "origin", "created_at" DESC);