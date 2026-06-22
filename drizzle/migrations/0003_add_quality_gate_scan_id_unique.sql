-- Add unique constraint on scan_id for quality_gate_results
-- Required for onConflictDoUpdate to work correctly
ALTER TABLE quality_gate_results ADD CONSTRAINT quality_gate_results_scan_id_unique UNIQUE (scan_id);
