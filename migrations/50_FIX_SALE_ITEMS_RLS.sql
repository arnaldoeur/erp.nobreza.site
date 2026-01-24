-- 50_FIX_SALE_ITEMS_RLS.sql
-- Fix missing RLS policy for sale_items table
-- This table had RLS enabled but no policy, causing all inserts to fail

-- Drop existing policy if it exists (safety check)
DROP POLICY IF EXISTS "sale_items_isolation" ON public.sale_items;

-- Create the missing RLS policy for sale_items
-- This allows users to access sale_items from their own company
CREATE POLICY "sale_items_isolation" 
ON public.sale_items 
FOR ALL 
USING (company_id = get_company_id_safe());

-- Verify RLS is enabled (should already be enabled, but just to be safe)
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
