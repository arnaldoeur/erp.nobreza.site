
-- 13_FIX_SYSTEM.sql
-- FORCE RELOAD SCHEMA CACHE & FIX SYSTEM USER

-- 1. Reload Schema Cache (Fixes "Table not found")
NOTIFY pgrst, 'reload schema';

-- 2. Ensure System User exists and has correct name
INSERT INTO public.users (id, name, email, role, active)
VALUES ('00000000-0000-0000-0000-000000000000', 'Nobreza System', 'system@nobreza.site', 'ADMIN', true)
ON CONFLICT (id) DO UPDATE
SET name = 'Nobreza System';

-- 3. Fix potential "Utilizador removido" in messages if any (optional, safe guess)
-- UPDATE public.erp_chat_messages SET user_name = 'Arnaldo' WHERE user_name = 'Utilizador removido';
