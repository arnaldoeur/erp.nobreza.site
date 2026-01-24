
-- 32_FIX_DOCUMENTS_FK.sql
-- Restore Foreign Keys to allow "Sent By" (Join) to work

-- 1. Restore Foreign Key for User (Needed for "users(name)" query)
-- We use "DO $$" block to safely add constraint only if missing, or we just drop/add.
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

ALTER TABLE public.documents
ADD CONSTRAINT documents_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- 2. Restore Foreign Key for Company (Good practice)
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_company_id_fkey;

ALTER TABLE public.documents
ADD CONSTRAINT documents_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE CASCADE;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
