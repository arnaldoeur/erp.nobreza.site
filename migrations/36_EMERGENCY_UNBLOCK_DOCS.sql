
-- 36_EMERGENCY_UNBLOCK_DOCS.sql
-- Drop the "Last Modified By" FK to remove join ambiguity
-- This restores the single-link between Documents and Users

ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_last_modified_by_fkey;

-- We keep the column 'last_modified_by' (UUID) so data is saved
-- We just don't enforce the FK constraint for now, so the Join 'users(name)' 
-- defaults back to the only remaining FK: 'user_id'.

NOTIFY pgrst, 'reload schema';
