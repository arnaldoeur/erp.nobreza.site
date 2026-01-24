-- 10_RESET_NUCLEAR_SUPABASE.sql
-- ESTE SCRIPT FOCO NO "SCHEMA CACHE" E PERMISSÕES DE NÍVEL DE SCHEMA

-- 1. GARANTIR ACESSO AO SCHEMA PUBLIC (Muitas vezes o problema está aqui)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. RECRIAR TABELAS (Caso tenham falhado ou estejam invisíveis)
CREATE TABLE IF NOT EXISTS public.erp_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,    
    company_id uuid, 
    module text NOT NULL, 
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.erp_mensagens_ai (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id uuid REFERENCES public.erp_conversas(id) ON DELETE CASCADE,
    role text NOT NULL, 
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. FORÇAR REFRESH DO POSTGREST (O Truque da View)
-- Criar e apagar uma view costuma forçar o reload do cache em 100% dos casos
CREATE OR REPLACE VIEW public.pgrst_refresh AS SELECT 1;
DROP VIEW public.pgrst_refresh;

-- 4. ATIVAR RLS E POLÍTICAS TOTAIS
ALTER TABLE public.erp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_mensagens_ai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_full_access" ON public.erp_conversas;
CREATE POLICY "erp_full_access" ON public.erp_conversas FOR ALL USING (true);

DROP POLICY IF EXISTS "erp_full_access" ON public.erp_mensagens_ai;
CREATE POLICY "erp_full_access" ON public.erp_mensagens_ai FOR ALL USING (true);

-- 5. NOTIFICAR RECARREGAMENTO
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 6. VERIFICAÇÃO (Execute isto para ver se a tabela existe mesmo)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'erp_conversas';
