
-- 29_FIX_TASKS_UPDATE.sql
-- Fix Kanban Drag & Drop (Enable UPDATE on Tasks)

-- 1. Ensure RLS Policy for UPDATE exists
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;

-- Allow authenticated users to update tasks (e.g. change status, drag & drop)
CREATE POLICY "tasks_update_policy" ON public.tasks 
FOR UPDATE TO authenticated 
USING (true)     -- Can see the task (based on SELECT policy usually)
WITH CHECK (true); -- Can update it

-- 2. Ensure SELECT permissions are also open enough for the team
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks 
FOR SELECT TO authenticated 
USING (true);

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
