-- Add support for two repository types as decided in M5 planning:
-- 'scm'     = Fully connected via SCM provider (GitHub App, OAuth, etc.) with webhooks
-- 'external' = Pipeline-only / upload results only (no direct repo access by the system)
-- Default is 'scm' to keep backward compatibility with existing data.

ALTER TABLE "repositories"
ADD COLUMN "connection_type" varchar(20) NOT NULL DEFAULT 'scm';

-- Optional: Add check constraint (recommended for data integrity)
-- ALTER TABLE "repositories" ADD CONSTRAINT "repositories_connection_type_check" 
--   CHECK ("connection_type" IN ('scm', 'external'));

-- Backfill existing rows (if any) to 'scm'
UPDATE "repositories" SET "connection_type" = 'scm' WHERE "connection_type" IS NULL;