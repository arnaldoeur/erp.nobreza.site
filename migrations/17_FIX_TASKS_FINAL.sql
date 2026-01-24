
-- 17_FIX_TASKS_FINAL.sql
-- FORCE REPAIR OF TASKS TABLE

-- 1. Create Tasks Table (if not exists, or verify schema)
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint, 
    creator_id uuid NOT NULL,
    assigned_to uuid, -- Nullable
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING',
    priority text DEFAULT 'MEDIUM',
    due_date date,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Grant Permissions
GRANT ALL ON TABLE public.tasks TO anon, authenticated, service_role;

-- 3. RLS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_policy_all" ON public.tasks;
CREATE POLICY "tasks_policy_all" ON public.tasks FOR ALL USING (true);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
