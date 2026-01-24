
-- 22_FIX_RLS_ANON.sql
-- Fix RLS Policies to allow Anonymous Registration (Company Creation)

-- 1. Allow ANONYMOUS Users to Create Companies
-- This is required because the frontend creates the company *before* the user account exists.
DROP POLICY IF EXISTS "companies_insert_policy" ON public.companies;
CREATE POLICY "companies_insert_policy" ON public.companies FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 2. Allow ANONYMOUS Users to Create their own User Profile (if flow requires it before auth, though usually it's after)
-- Looking at code, user creation happens AFTER auth, so 'authenticated' was correct for users table.
-- But let's be safe and keep users table as is (authenticated only) or check flow.
-- Flow: 1. Create Company (Anon) -> 2. SignUp (Auth) -> 3. Create User Row (Auth).
-- So only Company needs Anon.

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
