-- 09_FIX_SISTEMA_TOTAL.sql
-- REPARAÇÃO DEFINITIVA DE TODAS AS TABELAS DE IA E CHAT

-- 1. LIMPEZA TOTAL (Remover vestígios de nomes antigos)
DROP TABLE IF EXISTS public.erp_mensagens_ai CASCADE;
DROP TABLE IF EXISTS public.erp_conversas CASCADE;
DROP TABLE IF EXISTS public.erp_chat_mensagens CASCADE;
DROP TABLE IF EXISTS public.erp_chat_grupos CASCADE;

-- 2. TABELAS DE IA (Zyph AI)
CREATE TABLE public.erp_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,    
    company_id uuid, 
    module text NOT NULL, -- 'BI', 'DEV', 'VISION'
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

-- 3. TABELAS DE CHAT SOCIAL
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

-- 4. SEGURANÇA (RLS)
ALTER TABLE public.erp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_mensagens_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_mensagens ENABLE ROW LEVEL SECURITY;

-- 4.1 Políticas Abertas (Para Garantir Funcionamento Imediato)
CREATE POLICY "erp_acc_all" ON public.erp_conversas FOR ALL USING (true);
CREATE POLICY "erp_acc_all" ON public.erp_mensagens_ai FOR ALL USING (true);
CREATE POLICY "erp_acc_all" ON public.erp_chat_grupos FOR ALL USING (true);
CREATE POLICY "erp_acc_all" ON public.erp_chat_mensagens FOR ALL USING (true);

-- 5. PERMISSÕES DE API (CRITICAL)
GRANT ALL ON TABLE public.erp_conversas TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_mensagens_ai TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_chat_grupos TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.erp_chat_mensagens TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 6. RECARREGAR CONFIGURAÇÃO
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
