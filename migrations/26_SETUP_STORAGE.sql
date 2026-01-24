
-- 26_SETUP_STORAGE.sql
-- Enable Storage for Documents

-- 1. Create Bucket 'documents' if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access to 'documents' bucket (Simplest for now)
-- Policy to allow uploads for Authenticated users
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy to allow viewing for Everyone (or Authenticated)
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
