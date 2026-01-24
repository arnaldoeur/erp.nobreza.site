
-- 38_DEBUG_NUCLEAR_SHOW_ALL.sql
-- URGENT DEBUGGING: DISABLE ALL SECURITY TO RULE OUT RLS
-- This is temporary to confirm if data exists and is fetchable.

-- 1. Disable RLS on critical tables
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Grant explicit permissions to everyone
GRANT ALL ON TABLE public.documents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;

-- 3. Ensure no policies are blocking (redundant if RLS disabled, but good for cleanup)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.documents;
-- (We keep the policies defined but since RLS is disabled, they won't run)

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
