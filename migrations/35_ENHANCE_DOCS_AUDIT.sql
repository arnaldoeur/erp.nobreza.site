
-- 35_ENHANCE_DOCS_AUDIT.sql
-- Add Last Modified By/At columns to documents

-- 1. Add Columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create Trigger to Auto-Update last_modified_at
CREATE OR REPLACE FUNCTION update_last_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_at = now();
    -- If user_id is changed or we explicitly set modified by, fine.
    -- Ideally we want to capture who did the update from auth.uid()
    -- But Supabase triggers run as the postgres user often unless defined SECURITY DEFINER
    -- For now, let's rely on the Application passing the 'last_modified_by' or default it.
    
    -- Try to set last_modified_by from auth.uid() if not provided
    IF NEW.last_modified_by IS NULL THEN
        -- This might fail if auth.uid() is not available in trigger context depending on how it's called
        -- But for simple RLS calls it usually works.
        BEGIN
            NEW.last_modified_by = auth.uid();
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if auth.uid() fails
        END;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_modtime ON public.documents;

CREATE TRIGGER update_documents_modtime
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified_column();

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
