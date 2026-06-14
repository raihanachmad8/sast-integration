-- Migration 0005: Add PR analysis support
-- Adds PR metadata to scans table and creates commit_statuses table

-- Add PR columns to scans table
ALTER TABLE scans ADD COLUMN pr_number integer;
ALTER TABLE scans ADD COLUMN base_branch varchar(100);
ALTER TABLE scans ADD COLUMN head_branch varchar(100);
ALTER TABLE scans ADD COLUMN pr_author varchar(255);

-- Add PR-specific columns to quality_gate_results
ALTER TABLE quality_gate_results ADD COLUMN new_findings integer DEFAULT 0;
ALTER TABLE quality_gate_results ADD COLUMN fixed_findings integer DEFAULT 0;

-- Create commit_statuses table for SCM provider integration
CREATE TABLE commit_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id),
  repository_id uuid NOT NULL REFERENCES repositories(id),
  commit_sha varchar(40) NOT NULL,
  status varchar(20) NOT NULL,
  context varchar(100) NOT NULL,
  description text,
  target_url text,
  provider varchar(20) NOT NULL,
  external_id varchar(100),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Indexes for PR analysis queries
CREATE INDEX idx_scans_pr_number ON scans(pr_number);
CREATE INDEX idx_scans_base_branch ON scans(base_branch);
CREATE INDEX idx_commit_statuses_scan_id ON commit_statuses(scan_id);
CREATE INDEX idx_commit_statuses_commit_sha ON commit_statuses(commit_sha);
CREATE INDEX idx_commit_statuses_repository_id ON commit_statuses(repository_id);
