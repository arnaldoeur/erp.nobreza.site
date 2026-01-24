-- 42_ADD_UNIT_TO_PRODUCTS.sql
-- Add unit column to products table if it doesn't exist

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit') THEN 
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'Unidade';
    END IF;
END $$;
