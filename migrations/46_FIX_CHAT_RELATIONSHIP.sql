-- 46_FIX_CHAT_RELATIONSHIP.sql

-- Ensure the Foreign Key relationship exists for Supabase to detect it
-- We reference public.users so that we can fetch user details like name/avatar

BEGIN;

-- 1. Try to drop existing constraint if it has a weird name or points to auth.users
ALTER TABLE erp_chat_group_members 
DROP CONSTRAINT IF EXISTS erp_chat_group_members_user_id_fkey;

-- 2. Add explicit Foreign Key to public.users
ALTER TABLE erp_chat_group_members
ADD CONSTRAINT erp_chat_group_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users (id)
ON DELETE CASCADE;

-- 3. Also ensure group_id relationship is clear
ALTER TABLE erp_chat_group_members 
DROP CONSTRAINT IF EXISTS erp_chat_group_members_group_id_fkey;

ALTER TABLE erp_chat_group_members
ADD CONSTRAINT erp_chat_group_members_group_id_fkey
FOREIGN KEY (group_id)
REFERENCES public.erp_chat_groups (id)
ON DELETE CASCADE;

COMMIT;

-- This DDL change should force PostgREST to refresh its schema cache.
