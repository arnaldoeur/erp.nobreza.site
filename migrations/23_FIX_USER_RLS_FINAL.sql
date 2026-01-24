
-- 23_FIX_USER_RLS_FINAL.sql
-- Fix RLS Policies for Users Table (Split INSERT from SELECT/UPDATE)

-- 1. Drop existing problematic policies
-- (Dropping both the "isolation" one from script 20 and the "insert_policy" from script 21 just in case)
DROP POLICY IF EXISTS "users_isolation" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- 2. CREATE INSERT POLICY (The Critical Fix)
-- Allow authenticated users to insert THEIR OWN row.
-- We do NOT check company_id here for valid equality because the user doesn't belong to a company yet in the DB's eyes.
CREATE POLICY "users_insert_own" ON public.users FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3. CREATE SELECT/UPDATE/DELETE POLICY
-- Allow users to see:
-- a) Themselves
-- b) Others in their company
CREATE POLICY "users_select_update" ON public.users FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR 
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1) -- Inlined logical equivalent of get_company_id_safe() for clarity, or just use the function.
);

-- Note: For Update, we might want to restrict to ONLY self or Admin?
-- For now, let's keep it consistent with Select.
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated
USING (
    id = auth.uid() 
    OR 
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated
USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1)
);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
