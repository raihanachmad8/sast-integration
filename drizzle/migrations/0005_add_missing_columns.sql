-- Add missing columns to quality_gates table
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_high boolean DEFAULT true;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_medium boolean DEFAULT false;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_low boolean DEFAULT false;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_pending boolean DEFAULT true;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_tp boolean DEFAULT false;

-- Add unique constraint on quality_gates.workspace_id for onConflictDoUpdate
ALTER TABLE quality_gates ADD CONSTRAINT quality_gates_workspace_id_unique UNIQUE (workspace_id);

-- Add missing column to quality_gate_results table
ALTER TABLE quality_gate_results ADD COLUMN IF NOT EXISTS persistent_findings integer DEFAULT 0;

-- Add missing columns to findings table
ALTER TABLE findings ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'open';

-- Drop workspace_id from knowledge_backfill_jobs (knowledge base is now global)
ALTER TABLE knowledge_backfill_jobs DROP COLUMN IF EXISTS workspace_id;

-- Add max_duration_ms column to knowledge_backfill_jobs
ALTER TABLE knowledge_backfill_jobs ADD COLUMN IF NOT EXISTS max_duration_ms integer DEFAULT 3600000;

-- Add retry columns to knowledge_backfill_jobs
ALTER TABLE knowledge_backfill_jobs ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 10;
ALTER TABLE knowledge_backfill_jobs ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
