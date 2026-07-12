-- Migration: Add ON DELETE CASCADE to source_control_imports FKs
-- Without this, deleting a source_controls row fails because
-- source_control_imports rows (ON DELETE NO ACTION) block the cascade
-- from source_controls → source_control_repositories.

-- 1. Drop the inline FK on source_control_imports.source_control_id
ALTER TABLE "source_control_imports"
  DROP CONSTRAINT IF EXISTS "source_control_imports_source_control_id_fk";

-- 2. Re-add with CASCADE
ALTER TABLE "source_control_imports"
  ADD CONSTRAINT "source_control_imports_source_control_id_fk"
  FOREIGN KEY ("source_control_id") REFERENCES "source_controls"("id") ON DELETE CASCADE;

-- 3. Drop the named FK sci_srcr_fk on source_control_imports.source_control_repository_id
ALTER TABLE "source_control_imports"
  DROP CONSTRAINT IF EXISTS "sci_srcr_fk";

-- 4. Re-add with CASCADE
ALTER TABLE "source_control_imports"
  ADD CONSTRAINT "sci_srcr_fk"
  FOREIGN KEY ("source_control_repository_id") REFERENCES "source_control_repositories"("id") ON DELETE CASCADE;
