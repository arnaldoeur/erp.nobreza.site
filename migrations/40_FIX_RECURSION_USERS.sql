-- 40_FIX_RECURSION_USERS.sql
-- Fix Infinite Recursion in Users RLS by using a Security Definer function

-- 1. Ensure the Security Definer function exists and is correct
CREATE OR REPLACE FUNCTION public.get_company_id_safe()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop the recursive policies from previous scripts
DROP POLICY IF EXISTS "Users can see team members" ON public.users;
DROP POLICY IF EXISTS "users_select_update" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "users_view_policy" ON public.users; -- Cleanup
DROP POLICY IF EXISTS "users_update_policy" ON public.users; -- Cleanup
DROP POLICY IF EXISTS "users_delete_policy" ON public.users; -- Cleanup

-- 3. Re-create policies using the secure function

-- SELECT: See self OR see team members (using secure lookup)
CREATE POLICY "users_view_policy" ON public.users
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR
  company_id = public.get_company_id_safe()
);

-- UPDATE: Same logic
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR
  company_id = public.get_company_id_safe()
);

-- DELETE: Team logic (Restrictive)
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
  company_id = public.get_company_id_safe()
);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
