-- Add new severity and review control columns to quality_gates
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_high boolean DEFAULT true;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_medium boolean DEFAULT false;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_low boolean DEFAULT false;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_pending boolean DEFAULT true;
ALTER TABLE quality_gates ADD COLUMN IF NOT EXISTS fail_on_tp boolean DEFAULT false;

-- Set strict defaults for existing rows
UPDATE quality_gates SET
  fail_on_critical = true,
  fail_on_high_tp = true,
  fail_on_high = true,
  fail_on_medium = false,
  fail_on_low = false,
  fail_on_pending = true,
  fail_on_tp = false,
  pending_behavior = 'warn'
WHERE fail_on_pending IS NULL OR fail_on_pending = false;
