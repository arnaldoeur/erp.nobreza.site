
-- 37_FIX_TEAM_AND_USERS_RLS.sql
-- Allow users to see their team members and allow Documents to join User Names

-- 1. Enable RLS on Users (Safety first)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive policies
DROP POLICY IF EXISTS "Users can see their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can see team members" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can select users" ON public.users;

-- 3. Create "See Team" Policy
-- Optimized: Users can see rows where company_id matches their own company_id
-- OR if they are the user themselves (for initial login before company_id is fully loaded contextually)

CREATE POLICY "Users can see team members" ON public.users
FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR
    id = auth.uid()
);

-- 4. Setup Trigger to Auto-Assign 'ADMIN' role to first user of a company (Optional but good)
-- (Skipping for now to focus on visibility)

-- 5. Force Refresh
NOTIFY pgrst, 'reload schema';
