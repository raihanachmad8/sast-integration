-- Rename scan_policies → scan_profiles
-- And rename policy_id FK columns → profile_id

-- 1. Rename table
ALTER TABLE "scan_policies" RENAME TO "scan_profiles";

-- 2. Rename FK columns in scans
ALTER TABLE "scans" RENAME COLUMN "policy_id" TO "profile_id";

-- 3. Rename FK columns in schedules
ALTER TABLE "schedules" RENAME COLUMN "policy_id" TO "profile_id";

-- 4. Update FK constraint names (Postgres auto-renames table but keeps old constraint names)
-- Drop old constraints and recreate with new names
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_policy_id_scan_policies_id_fk";
ALTER TABLE "scans" ADD CONSTRAINT "scans_profile_id_scan_profiles_id_fk"
  FOREIGN KEY ("profile_id") REFERENCES "scan_profiles"("id");

ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_policy_id_scan_policies_id_fk";
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_profile_id_scan_profiles_id_fk"
  FOREIGN KEY ("profile_id") REFERENCES "scan_profiles"("id");
