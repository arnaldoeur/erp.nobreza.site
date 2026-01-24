-- 08_V7_FINAL_TABLES.sql
-- FORCE TABLE REGENERATION WITH NEWER NAMES

-- 1. DROP TUDO PARA DESBLOQUEAR
DROP TABLE IF EXISTS public.zyph_social_messages CASCADE;
DROP TABLE IF EXISTS public.zyph_groups CASCADE;
DROP TABLE IF EXISTS public.zyph_messages CASCADE;
DROP TABLE IF EXISTS public.zyph_conversations CASCADE;

-- 2. CRIAR TABELAS V7 (NOMES ÚNICOS)
CREATE TABLE public.erp_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,    
    company_id uuid, 
    module text NOT NULL, 
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.erp_mensagens_ai (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id uuid REFERENCES public.erp_conversas(id) ON DELETE CASCADE,
    role text NOT NULL, 
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.erp_chat_grupos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.erp_chat_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid,
    grupo_id uuid REFERENCES public.erp_chat_grupos(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. PERMISSÕES E RLS
ALTER TABLE public.erp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_mensagens_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_full_access" ON public.erp_conversas FOR ALL USING (true);
CREATE POLICY "erp_full_access" ON public.erp_mensagens_ai FOR ALL USING (true);
CREATE POLICY "erp_full_access" ON public.erp_chat_grupos FOR ALL USING (true);
CREATE POLICY "erp_full_access" ON public.erp_chat_mensagens FOR ALL USING (true);

-- 4. GRANTS
GRANT ALL ON TABLE public.erp_conversas TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_mensagens_ai TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_chat_grupos TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_chat_mensagens TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 5. RELOAD
NOTIFY pgrst, 'reload schema';
