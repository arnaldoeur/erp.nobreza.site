
-- 27_FIX_DOCUMENTS_TABLE.sql
-- Create "documents" table and fix RLS (It was missing!)

-- 1. Create the Table
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    category text,
    file_url text NOT NULL,
    file_type text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: INSERT (Allow authenticated users to add documents)
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: SELECT (Allow users to view documents from their company)
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT TO authenticated
USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1)
);

-- Policy: DELETE (Allow users to delete documents from their company)
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE TO authenticated
USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1)
);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
