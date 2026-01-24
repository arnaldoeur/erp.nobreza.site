
-- 31_FIX_DOCUMENTS_UPDATE.sql
-- Enable updating documents (Rename, Change Category)

-- 1. Ensure UPDATE Policy is permissive
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
CREATE POLICY "documents_update_policy" ON public.documents 
FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);

-- 2. Also ensure User Can Update their Own File Uploads (Storage) if needed? 
-- Actually default storage policy we made is 'Universal Update' so that's fine.

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
