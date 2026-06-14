-- Migration 0007: SCM Sync Improvements
-- Adds externalId for stable repo identity, lastSyncedAt for tracking

-- Add externalId to source_control_repositories
ALTER TABLE source_control_repositories ADD COLUMN external_id varchar(255);

-- Backfill externalId from fullName
UPDATE source_control_repositories SET external_id = full_name WHERE external_id IS NULL;

-- Add unique index on (source_control_id, external_id)
CREATE UNIQUE INDEX source_control_repositories_ctrl_extid_idx 
  ON source_control_repositories(source_control_id, external_id);

-- Add lastSyncedAt to source_controls
ALTER TABLE source_controls ADD COLUMN last_synced_at timestamp;

-- Add externalId and provider to repositories
ALTER TABLE repositories ADD COLUMN external_id varchar(255);
ALTER TABLE repositories ADD COLUMN provider varchar(20);
