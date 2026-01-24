
-- 16_FIX_ALL_CHAT_TABLES.sql
-- MASTER SCRIPT: Fix Groups AND Messages in correct order

-- 1. Clean slate (avoid conflicts)
DROP TABLE IF EXISTS public.erp_chat_messages CASCADE;
DROP TABLE IF EXISTS public.erp_chat_groups CASCADE;

-- 2. Create Groups Table FIRST (Parent)
CREATE TABLE public.erp_chat_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Messages Table SECOND (Child)
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

-- 4. Fix Permissions for BOTH
GRANT ALL ON TABLE public.erp_chat_groups TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.erp_chat_messages TO anon, authenticated, service_role;

-- 5. Enable RLS (Permissive for debugging)
ALTER TABLE public.erp_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_open" ON public.erp_chat_groups FOR ALL USING (true);
CREATE POLICY "messages_open" ON public.erp_chat_messages FOR ALL USING (true);

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
