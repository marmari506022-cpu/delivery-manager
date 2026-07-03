-- Fix missing columns that may not exist in production

-- advances: ensure deleted, settled, settled_at exist
ALTER TABLE advances ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS settled_at timestamptz;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS added_by text DEFAULT '';
ALTER TABLE advances ADD COLUMN IF NOT EXISTS added_by_role text DEFAULT '';
ALTER TABLE advances ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';

-- deductions: ensure all columns exist
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false;
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS settled_at timestamptz;
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS added_by text DEFAULT '';
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS added_by_role text DEFAULT '';
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';

-- bonuses: ensure all columns exist
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false;
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS settled_at timestamptz;
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS added_by text DEFAULT '';
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS added_by_role text DEFAULT '';
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';

-- uniforms: ensure settled exists
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false;
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS settled_at timestamptz;
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';

-- settled: ensure admin_id and ref_id exist
ALTER TABLE settled ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE settled ADD COLUMN IF NOT EXISTS ref_id text DEFAULT '';

-- pilots: ensure all columns exist
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT 0;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS pilot_code text;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT '';
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS phone text DEFAULT '';

-- Add unique constraint on pilot_code only if not exists (safe way)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pilots_pilot_code_key'
  ) THEN
    ALTER TABLE pilots ADD CONSTRAINT pilots_pilot_code_key UNIQUE (pilot_code);
  END IF;
END $$;

-- deductions: add settled columns (critical - missing from original schema)
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false;
ALTER TABLE deductions ADD COLUMN IF NOT EXISTS settled_at timestamptz;

-- settled: preserve the original date of the item being settled (separate from the closing/session date)
ALTER TABLE settled ADD COLUMN IF NOT EXISTS item_date timestamptz;
