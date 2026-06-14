-- Migration 0006: Fix workspace_id data integrity
-- Updates repositories and source_control_repositories with correct workspace_id

-- Fix source_control_repositories: set workspace_id from source_controls
UPDATE source_control_repositories scr
SET workspace_id = sc.workspace_id
FROM source_controls sc
WHERE scr.source_control_id = sc.id
  AND (scr.workspace_id IS NULL OR scr.workspace_id = '');

-- Fix repositories: set workspace_id from source_control_imports
UPDATE repositories r
SET workspace_id = sci.workspace_id
FROM source_control_imports sci
WHERE r.id = sci.repository_id
  AND (r.workspace_id IS NULL OR r.workspace_id = '');

-- Fix repositories: set workspace_id from source_control_repositories for SCM repos
UPDATE repositories r
SET workspace_id = scr.workspace_id
FROM source_control_repositories scr
WHERE r.name = scr.full_name
  AND r.connection_type = 'scm'
  AND (r.workspace_id IS NULL OR r.workspace_id = '');
