
-- 14_FIX_TASKS_AND_GROUPS.sql
-- FORCE RELOAD SCHEMA CACHE & FIX PERMISSIONS

-- 1. Reload Schema Cache (Fixes "Table not found")
NOTIFY pgrst, 'reload schema';

-- 2. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint, 
    creator_id uuid NOT NULL,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING',
    priority text DEFAULT 'MEDIUM',
    due_date date,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.erp_chat_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Fix Permissions (Grant ALL to everyone for simplicity in this fix)
GRANT ALL ON TABLE public.tasks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.erp_chat_groups TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.erp_chat_messages TO anon, authenticated, service_role;

-- 4. Fix RLS (Disable RLS temporarily to verify functionality, or add permissive policies)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_policy_all" ON public.tasks;
CREATE POLICY "tasks_policy_all" ON public.tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "groups_policy_all" ON public.erp_chat_groups;
CREATE POLICY "groups_policy_all" ON public.erp_chat_groups FOR ALL USING (true);

-- 5. Helper Function for Company ID (safe)
CREATE OR REPLACE FUNCTION public.get_company_id_safe()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;
