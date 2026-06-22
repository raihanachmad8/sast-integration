-- Junction table: explicit new/pre-existing tracking per scan
CREATE TABLE IF NOT EXISTS "finding_group_scans" (
  "scan_id" uuid NOT NULL REFERENCES "scans"("id"),
  "group_id" uuid NOT NULL REFERENCES "finding_groups"("id"),
  "is_new" boolean NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "finding_group_scans_pkey" PRIMARY KEY ("scan_id", "group_id")
);

-- Index for fast lookup by scan
CREATE INDEX IF NOT EXISTS "finding_group_scans_scan_id_idx" ON "finding_group_scans" ("scan_id");

-- Backfill: mark all existing findings in completed scans as pre-existing
-- (they were already known before this migration)
INSERT INTO "finding_group_scans" ("scan_id", "group_id", "is_new")
SELECT DISTINCT f."scan_id", f."group_id", false
FROM "findings" f
INNER JOIN "scans" s ON f."scan_id" = s."id"
WHERE s."status" = 'completed'
ON CONFLICT ("scan_id", "group_id") DO NOTHING;
