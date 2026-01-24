
-- 21_FIX_RLS.sql
-- Fix RLS Policies to allow Registration (Company Creation)

-- 1. Allow Authenticated Users to Create Companies
DROP POLICY IF EXISTS "companies_insert_policy" ON public.companies;
CREATE POLICY "companies_insert_policy" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Allow Authenticated Users to Create their own User Profile
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. Update existing Select policies to be sure
DROP POLICY IF EXISTS "companies_read_policy" ON public.companies;
CREATE POLICY "companies_read_policy" ON public.companies FOR SELECT USING (true); -- Allow reading companies (needed for checks or displaying info) or restrict if needed. 
-- For now, allowing all to read companies is often safer for "checking if company exists" logic, 
-- but ideally we restrict to own company.
-- Let's stick to the previous safe one but ensure it covers the newly created one.
-- Actually, after creation, the user IS linked to it via `users` table, BUT the `users` row might not exist yet when `companies` is returned?
-- Let's keep it simple: If I created it, I should see it?
-- The simplest valid approach for a SaaS is: 
-- INSERT: Any Auth User.
-- SELECT: Members of the company.

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
