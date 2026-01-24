
-- 33_FORCE_SHOW_DOCS.sql
-- Force "Show All" policy for documents
-- This eliminates any "Company ID" mismatch or "User ID" lookup failures.

-- 1. Enable RLS (So we can define specific policies)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy/conflicting policies
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "Universal Select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;

-- 3. Create "ALLOW ALL" Policies
-- SELECT: Everyone can see everything (Debug mode)
CREATE POLICY "debug_select_all" ON public.documents FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users can insert
CREATE POLICY "debug_insert_all" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: Authenticated users can update
CREATE POLICY "debug_update_all" ON public.documents FOR UPDATE TO authenticated USING (true);

-- DELETE: Authenticated users can delete
CREATE POLICY "debug_delete_all" ON public.documents FOR DELETE TO authenticated USING (true);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
