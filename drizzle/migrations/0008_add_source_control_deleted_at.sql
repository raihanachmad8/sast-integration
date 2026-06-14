-- Migration 0008: 
-- 1. Add deletedAt to source_control_repositories for soft-delete
-- 2. Fix finding_groups: add repositoryId, change unique constraint to (repo, fingerprint)
-- 3. Make finding_groups.projectId nullable (managed scans have no project)

ALTER TABLE source_control_repositories
ADD COLUMN IF NOT EXISTS deleted_at timestamp;

ALTER TABLE finding_groups
ALTER COLUMN project_id DROP NOT NULL;

-- Add repository_id column
ALTER TABLE finding_groups
ADD COLUMN IF NOT EXISTS repository_id uuid REFERENCES repositories(id);

-- Drop old global unique constraint on fingerprint
ALTER TABLE finding_groups
DROP CONSTRAINT IF EXISTS finding_groups_fingerprint_unique;

-- Add new unique constraint scoped to (repository_id, fingerprint)
CREATE UNIQUE INDEX IF NOT EXISTS finding_groups_repo_fingerprint_idx
ON finding_groups (repository_id, fingerprint);

-- Backfill repository_id from existing findings
UPDATE finding_groups fg
SET repository_id = f.repo_id
FROM (
  SELECT DISTINCT fg2.id, s.repository_id as repo_id
  FROM finding_groups fg2
  INNER JOIN findings f ON f.group_id = fg2.id
  INNER JOIN scans s ON s.id = f.scan_id
  WHERE fg2.repository_id IS NULL AND s.repository_id IS NOT NULL
) f
WHERE fg.id = f.id;
