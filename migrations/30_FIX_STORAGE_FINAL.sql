
-- 30_FIX_STORAGE_FINAL.sql
-- FORCE STORAGE PERMISSIONS
-- Ensure 'documents' bucket is writable by EVERYONE (Auth & Public)

-- 1. Update Bucket to be Public
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- 2. Drop potential conflicting policies
-- We drop by name, trying common variations to be sure
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all selects" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 3. Create PERMISSIVE Policies for ALL roles (public role includes all)
CREATE POLICY "Universal Insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Universal Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
CREATE POLICY "Universal Update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'documents');
CREATE POLICY "Universal Delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'documents');

-- 4. Double Check Table Security is DISABLED
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;

-- 5. Reload
NOTIFY pgrst, 'reload schema';
