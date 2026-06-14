-- Migration: Add performance indexes for hot query paths
-- These indexes cover the most frequently queried foreign keys and filter columns.

-- Findings table (largest, fastest-growing)
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_active ON findings(active);
CREATE INDEX IF NOT EXISTS idx_findings_scan_active ON findings(scan_id, active);
CREATE INDEX IF NOT EXISTS idx_findings_group_id ON findings(group_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity_status ON findings(severity, status);

-- Scans table
CREATE INDEX IF NOT EXISTS idx_scans_repository_id ON scans(repository_id);

-- Scan results
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);

-- Quality gate results
CREATE INDEX IF NOT EXISTS idx_quality_gate_results_scan_id ON quality_gate_results(scan_id);

-- Audit and activity logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON activity_logs(workspace_id, created_at DESC);

-- Project API tokens (fast SHA-256 lookup)
CREATE INDEX IF NOT EXISTS idx_project_api_tokens_sha256 ON project_api_tokens(token_sha256);
