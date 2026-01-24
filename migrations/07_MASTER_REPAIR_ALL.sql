-- 07_MASTER_REPAIR_ALL.sql
-- COMPREHENSIVE REPAIR FOR ALL COLLABORATION MODULES

-- 1. DROP ALL OLD TABLES (Resetting to force cache refresh)
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.social_messages CASCADE;
DROP TABLE IF EXISTS public.social_groups CASCADE;
DROP TABLE IF EXISTS public.zyph_messages CASCADE;
DROP TABLE IF EXISTS public.zyph_conversations CASCADE;
DROP TABLE IF EXISTS public.zyph_groups CASCADE;
DROP TABLE IF EXISTS public.zyph_social_messages CASCADE;

-- 2. CREATE NEW TABLES (ZYPH NAMES)

-- 2.1 AI Tables
CREATE TABLE public.zyph_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,    
    company_id uuid, 
    module text NOT NULL, 
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.zyph_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.zyph_conversations(id) ON DELETE CASCADE,
    role text NOT NULL, 
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2.2 Social Chat Tables
CREATE TABLE public.zyph_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.zyph_social_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid,
    group_id uuid REFERENCES public.zyph_groups(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    mentions uuid[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- 3. ACTIVATE RLS
ALTER TABLE public.zyph_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyph_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyph_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyph_social_messages ENABLE ROW LEVEL SECURITY;

-- 4. PERMISSIVE POLICIES (Development Mode)
CREATE POLICY "zyph_conv_all" ON public.zyph_conversations FOR ALL USING (true);
CREATE POLICY "zyph_msg_all" ON public.zyph_messages FOR ALL USING (true);
CREATE POLICY "zyph_groups_all" ON public.zyph_groups FOR ALL USING (true);
CREATE POLICY "zyph_social_msg_all" ON public.zyph_social_messages FOR ALL USING (true);

-- 5. GRANTS
GRANT ALL ON TABLE public.zyph_conversations TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.zyph_messages TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.zyph_groups TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.zyph_social_messages TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 6. SYSTEM SYNC
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
