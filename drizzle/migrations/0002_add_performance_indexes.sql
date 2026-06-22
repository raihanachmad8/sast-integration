-- Migration 0002: Add performance indexes for frequently queried columns
-- These indexes significantly improve query performance for:
--   - Finding list queries (listByProject, listByWorkspace, listAccessible)
--   - Diff queries (diffNewFindings, diffFixedFindings)
--   - Finding count queries (getNewVsExistingStats)
--   - AI verification lookups

-- findings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_scan_id ON findings (scan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_group_id ON findings (group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_severity ON findings (severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_findings_scanner ON findings (scanner);

-- finding_groups table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_groups_status ON finding_groups (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_groups_project_id ON finding_groups (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_groups_fingerprint ON finding_groups (fingerprint);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_groups_repository_id ON finding_groups (repository_id);

-- finding_group_scans junction table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_group_scans_scan_id ON finding_group_scans (scan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finding_group_scans_group_id ON finding_group_scans (group_id);

-- ai_verifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_verifications_finding_id ON ai_verifications (finding_id);

-- scans table indexes (for join performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_repository_id ON scans (repository_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_status ON scans (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_branch ON scans (branch);
