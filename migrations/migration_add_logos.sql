-- Add columns for vertical and horizontal logos
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "logo_vertical" text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "logo_horizontal" text;
