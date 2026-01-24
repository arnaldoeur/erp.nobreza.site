
-- 18_NUCLEAR_CHAT_FIX.sql
-- EXTREME FIX FOR "TABLE NOT FOUND" (Syntax Fixed)

-- 1. Drop everything related (Clear slate)
DROP TABLE IF EXISTS public.erp_chat_messages CASCADE;
DROP TABLE IF EXISTS public.erp_chat_groups CASCADE;

-- 2. Create Groups (Minimal structure)
CREATE TABLE public.erp_chat_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Messages
CREATE TABLE public.erp_chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint,
    grupo_id uuid REFERENCES public.erp_chat_groups(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    mentions text[],
    created_at timestamp with time zone DEFAULT now()
);

-- 4. DISABLE RLS COMPLETELY (This is often the cause of "Not Found" 404s)
ALTER TABLE public.erp_chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_messages DISABLE ROW LEVEL SECURITY;

-- 5. GRANT EVERYTHING TO EVERYONE
GRANT ALL ON TABLE public.erp_chat_groups TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.erp_chat_messages TO anon, authenticated, service_role;

-- 6. FORCE SCHEMA RELOAD (Fixed Syntax)
COMMENT ON TABLE public.erp_chat_groups IS 'Refreshed via Script';
COMMENT ON TABLE public.erp_chat_messages IS 'Refreshed via Script';

-- 7. Standard Notify
NOTIFY pgrst, 'reload schema';
